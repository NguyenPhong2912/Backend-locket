// Minimal Express backend for Locket MVP
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://thanhphong.fun',
    'https://www.thanhphong.fun'
  ],
  credentials: true
}));
app.use(express.json());

// OTP storage (in production, use Redis or database)
const otpStore = new Map();
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with expiry
function storeOTP(phone, otp) {
  otpStore.set(phone, {
    code: otp,
    expires: Date.now() + OTP_EXPIRY,
    attempts: 0
  });
}

// Verify OTP
function verifyOTP(phone, code) {
  const stored = otpStore.get(phone);
  if (!stored) return { valid: false, error: 'OTP not found' };
  if (Date.now() > stored.expires) {
    otpStore.delete(phone);
    return { valid: false, error: 'OTP expired' };
  }
  if (stored.attempts >= 3) {
    otpStore.delete(phone);
    return { valid: false, error: 'Too many attempts' };
  }
  if (stored.code !== code) {
    stored.attempts++;
    return { valid: false, error: 'Invalid OTP' };
  }
  otpStore.delete(phone);
  return { valid: true };
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : '');
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'photos.json');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e6);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

app.get('/photos', (req, res) => {
  const { category } = req.query;
  const data = db.listPhotos(category);
  res.json(data);
});

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const item = db.createPhoto({
    filename: req.file.filename,
    url: '/uploads/' + req.file.filename,
    caption: req.body.caption || '',
    category: req.body.category || 'general'
  });
  res.json(item);
});

app.post('/photos/:id/like', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const updated = db.likePhoto(id);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

app.get('/categories', (req, res) => {
  res.json(db.listCategories());
});

app.post('/signup', (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string' || username.length < 3) {
    return res.status(400).json({ error: 'Invalid username' });
  }
  const exists = db.getUserByUsername(username);
  if (exists) return res.status(409).json({ error: 'Username taken' });
  const user = db.createUser(username);
  res.json({ uid: user.uid, username: user.username });
});

app.use('/uploads', express.static(UPLOAD_DIR));

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
function authRequired(req, res, next){
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    console.log('[auth] no token provided');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    console.log('[auth] token valid:', { uid: payload.uid, role: payload.role, username: payload.username });
    next();
  } catch(e){
    console.log('[auth] token invalid:', e.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
function adminRequired(req, res, next){
  if (!req.user || req.user.role !== 'admin') {
    console.log('[auth] admin required but user role:', req.user?.role);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// Phone authentication endpoints
app.post('/auth/send-otp', (req, res) => {
  const { phone } = req.body || {};
  console.log('[otp] send request:', { phone });
  
  if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  
  const normalizedPhone = phone.replace(/\s/g, '');
  const otp = generateOTP();
  storeOTP(normalizedPhone, otp);
  
  // In production, send SMS here
  console.log(`[otp] generated for ${normalizedPhone}: ${otp}`);
  
  res.json({ 
    success: true, 
    message: 'OTP sent successfully',
    // For development only - remove in production
    otp: otp
  });
});

app.post('/auth/verify-otp', (req, res) => {
  const { phone, otp, username } = req.body || {};
  console.log('[otp] verify request:', { phone, otp, username });
  
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Missing phone or OTP' });
  }
  
  const normalizedPhone = phone.replace(/\s/g, '');
  const verification = verifyOTP(normalizedPhone, otp);
  
  if (!verification.valid) {
    console.log('[otp] verification failed:', verification.error);
    return res.status(400).json({ error: verification.error });
  }
  
  // Check if user exists, if not create one
  let user = db.getUserByPhone(normalizedPhone);
  if (!user) {
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username required for new users' });
    }
    if (db.getUserByUsername(username)) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    user = db.createUserWithPhone(normalizedPhone, username);
    console.log('[otp] new user created:', { uid: user.uid, phone: normalizedPhone, username });
  }
  
  if (user.banned) {
    console.log('[otp] user banned:', normalizedPhone);
    return res.status(403).json({ error: 'Account banned' });
  }
  
  const token = jwt.sign({ 
    uid: user.uid, 
    role: user.role, 
    phone: user.phone, 
    username: user.username 
  }, JWT_SECRET, { expiresIn: '7d' });
  
  console.log('[otp] verification success:', { uid: user.uid, phone: normalizedPhone, username: user.username });
  res.json({ 
    token, 
    uid: user.uid, 
    role: user.role, 
    phone: user.phone, 
    username: user.username,
    isNewUser: !db.getUserByPhone(normalizedPhone)
  });
});

// Legacy auth endpoints (keep for backward compatibility)
app.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  console.log('[register] attempt:', { username, hasPassword: !!password });
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  if (db.getUserByUsername(username)) return res.status(409).json({ error: 'Username taken' });
  const passwordHash = await bcrypt.hash(password, 10);
  const role = 'user';
  const f2aKey = null;
  const user = db.createRegisteredUser({ email: null, passwordHash, username, role, f2aKey });
  console.log('[register] success:', { uid: user.uid, username: user.username, role: user.role });
  res.json({ uid: user.uid, username: user.username, role: user.role });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  console.log('[login] attempt:', { username, hasPassword: !!password });
  const user = db.getUserByUsername(username || '');
  if (!user) {
    console.log('[login] user not found:', username);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.banned) {
    console.log('[login] user banned:', username);
    return res.status(403).json({ error: 'Banned' });
  }
  const ok = await bcrypt.compare(password || '', user.password_hash || '');
  if (!ok) {
    console.log('[login] password mismatch for:', username);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.role === 'admin') {
    console.log('[login] admin detected, requiring 2FA for:', username);
    return res.json({ require2fa: true });
  }
  const token = jwt.sign({ uid: user.uid, role: user.role, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  console.log('[login] success:', { uid: user.uid, username: user.username, role: user.role });
  res.json({ token, uid: user.uid, role: user.role, username: user.username, email: user.email });
});

app.post('/admin/verify-2fa', (req, res) => {
  const { username, code } = req.body || {};
  console.log('[2fa] attempt:', { username, code });
  const user = db.getUserByUsername(username || '');
  if (!user || user.role !== 'admin') {
    console.log('[2fa] invalid user or not admin:', username);
    return res.status(401).json({ error: 'Invalid' });
  }
  if (user.f2a_key !== String(code)) {
    console.log('[2fa] wrong code for:', username, 'expected:', user.f2a_key, 'got:', code);
    return res.status(401).json({ error: 'Wrong code' });
  }
  const token = jwt.sign({ uid: user.uid, role: user.role, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  console.log('[2fa] success:', { uid: user.uid, username: user.username, role: user.role });
  res.json({ token, uid: user.uid, role: user.role, username: user.username, email: user.email });
});

app.get('/me', authRequired, (req, res) => {
  res.json({ uid: req.user.uid, role: req.user.role, email: req.user.email, username: req.user.username });
});

// Avatar upload (auth)
app.post('/me/avatar', authRequired, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = '/uploads/' + req.file.filename;
  const user = db.setAvatar(req.user.uid, url);
  res.json({ avatar_url: user.avatar_url });
});

// Feed: for MVP return latest photos
app.get('/feed', authRequired, (req, res) => {
  res.json(db.listPhotos());
});

// Enhanced Admin: users list, ban/unban, stats, delete post
app.get('/admin/users', authRequired, adminRequired, (req, res) => {
  res.json(db.listUsers());
});

app.post('/admin/users/:uid/ban', authRequired, adminRequired, (req, res) => {
  const banned = !!(req.body && req.body.banned);
  const user = db.setBanned(req.params.uid, banned);
  console.log(`[admin] user ${user.uid} ${banned ? 'banned' : 'unbanned'} by ${req.user.username}`);
  res.json({ uid: user.uid, banned: user.banned });
});

// Remove user account completely
app.delete('/admin/users/:uid', authRequired, adminRequired, (req, res) => {
  const uid = req.params.uid;
  if (uid === req.user.uid) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const user = db.getUserById(uid);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Delete user's photos
  const userPhotos = db.getPhotosByUser(uid);
  for (const photo of userPhotos) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, photo.filename)); } catch {}
    db.deletePhoto(photo.id);
  }
  
  // Delete user
  db.deleteUser(uid);
  console.log(`[admin] user ${uid} (${user.username}) deleted by ${req.user.username}`);
  res.json({ ok: true, deletedUser: user.username });
});

// Remove user's plan/subscription
app.post('/admin/users/:uid/remove-plan', authRequired, adminRequired, (req, res) => {
  const uid = req.params.uid;
  const user = db.getUserById(uid);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Remove gold plan
  db.removeUserPlan(uid);
  console.log(`[admin] plan removed for user ${uid} (${user.username}) by ${req.user.username}`);
  res.json({ ok: true, message: 'Plan removed successfully' });
});

// Admin console access
app.get('/admin/console', authRequired, adminRequired, (req, res) => {
  const stats = {
    users: db.listUsers().length,
    photos: db.listPhotos().length,
    categories: db.listCategories().length,
    bannedUsers: db.listUsers().filter(u => u.banned).length,
    goldUsers: db.listUsers().filter(u => u.hasGold).length,
    recentUsers: db.listUsers().slice(-5),
    recentPhotos: db.listPhotos().slice(-5),
    systemInfo: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    }
  };
  res.json(stats);
});

// Execute admin commands (dangerous - use with caution)
app.post('/admin/console/execute', authRequired, adminRequired, (req, res) => {
  const { command } = req.body || {};
  if (!command) return res.status(400).json({ error: 'No command provided' });
  
  console.log(`[admin] console command by ${req.user.username}:`, command);
  
  try {
    // Only allow safe commands
    const allowedCommands = ['stats', 'users', 'photos', 'cleanup'];
    const cmd = command.toLowerCase().trim();
    
    if (!allowedCommands.includes(cmd)) {
      return res.status(400).json({ error: 'Command not allowed' });
    }
    
    let result = {};
    switch (cmd) {
      case 'stats':
        result = {
          users: db.listUsers().length,
          photos: db.listPhotos().length,
          categories: db.listCategories().length
        };
        break;
      case 'users':
        result = { users: db.listUsers() };
        break;
      case 'photos':
        result = { photos: db.listPhotos() };
        break;
      case 'cleanup':
        // Clean up orphaned files
        const photoFiles = db.listPhotos().map(p => p.filename);
        const uploadFiles = fs.readdirSync(UPLOAD_DIR);
        let cleaned = 0;
        for (const file of uploadFiles) {
          if (!photoFiles.includes(file)) {
            try { fs.unlinkSync(path.join(UPLOAD_DIR, file)); cleaned++; } catch {}
          }
        }
        result = { cleaned, message: `Cleaned ${cleaned} orphaned files` };
        break;
    }
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('[admin] console command error:', error);
    res.status(500).json({ error: 'Command execution failed' });
  }
});

app.get('/admin/stats', authRequired, adminRequired, (req, res) => {
  const users = db.listUsers().length;
  const photos = db.listPhotos().length;
  res.json({ users, photos });
});

// Get users list for chat
app.get('/users', authRequired, (req, res) => {
  try {
    const users = db.listUsers()
      .filter(user => !user.banned && user.uid !== req.user.uid) // Exclude banned users and current user
      .map(user => ({
        uid: user.uid,
        username: user.username,
        avatar_url: user.avatar_url,
        hasGold: user.hasGold || false
      }));
    
    console.log('[users] returning users list:', users.length);
    res.json(users);
  } catch (err) {
    console.error('[users] error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Generate QR code with 10p value
app.post('/qr/generate', authRequired, (req, res) => {
  try {
    const { uid, username } = req.user;
    
    // Generate unique QR data with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const qrData = {
      uid,
      username,
      value: 10, // 10 points
      timestamp,
      id: `${timestamp}_${randomString}`,
      type: 'locket_qr'
    };
    
    const qrString = JSON.stringify(qrData);
    
    console.log('[qr] generated QR for user:', { uid, username, value: 10 });
    
    res.json({
      qrData: qrString,
      value: 10,
      timestamp,
      id: qrData.id
    });
  } catch (err) {
    console.error('[qr] generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Redeem QR code for points
app.post('/qr/redeem', authRequired, (req, res) => {
  try {
    const { qrData } = req.body;
    const { uid } = req.user;
    
    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid QR data format' });
    }
    
    // Validate QR data
    if (parsedData.type !== 'locket_qr' || !parsedData.value || !parsedData.uid) {
      return res.status(400).json({ error: 'Invalid QR code' });
    }
    
    // Check if QR is not too old (24 hours)
    const now = Date.now();
    const qrAge = now - parsedData.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (qrAge > maxAge) {
      return res.status(400).json({ error: 'QR code has expired' });
    }
    
    // Check if user is trying to redeem their own QR
    if (parsedData.uid === uid) {
      return res.status(400).json({ error: 'Cannot redeem your own QR code' });
    }
    
    // Add points to user (simulate - in real app would update database)
    const points = parsedData.value || 10;
    
    console.log('[qr] redeemed QR:', { 
      redeemer: uid, 
      qrOwner: parsedData.uid, 
      points,
      qrId: parsedData.id 
    });
    
    res.json({
      success: true,
      points,
      message: `Successfully redeemed ${points} points!`,
      qrOwner: parsedData.username
    });
  } catch (err) {
    console.error('[qr] redemption error:', err);
    res.status(500).json({ error: 'Failed to redeem QR code' });
  }
});

app.delete('/admin/photos/:id', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const item = db.getPhotoById(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(path.join(UPLOAD_DIR, item.filename)); } catch {}
  db.deletePhoto(id);
  res.json({ ok: true });
});

// Admin debug reset: wipe non-admin users and all photos/uploads
app.post('/admin/debug/reset', authRequired, adminRequired, (req, res) => {
  console.log('[admin] debug reset requested by:', req.user.username);
  try {
    // delete upload files
    try {
      for (const f of fs.readdirSync(UPLOAD_DIR)) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch {}
      }
    } catch {}
    db.deleteAllPhotos();
    db.deleteUsersExceptAdmin();
    console.log('[admin] debug reset completed');
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin] debug reset failed:', e);
    res.status(500).json({ error: 'Reset failed' });
  }
});

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: [
      'http://localhost:5173', 
      'http://localhost:3000',
      'https://thanhphong.fun',
      'https://www.thanhphong.fun'
    ],
    credentials: true
  } 
});

io.on('connection', (socket) => {
  console.log('[socket] client connected');
  socket.on('chat:send', (msg) => {
    console.log('[socket] chat message:', msg);
    io.emit('chat:message', { id: Date.now(), ...msg });
  });
});

// Seed fixed admin account if missing
(async function seedAdmin(){
  try {
    const admin = db.getUserByUsername('admin');
    if (!admin) {
      const passwordHash = await bcrypt.hash('admin', 10);
      db.createRegisteredUser({ email: null, passwordHash, username: 'admin', role: 'admin', f2aKey: '2006' });
      console.log('[seed] admin user created: username=admin password=admin 2FA=2006');
    } else {
      console.log('[seed] admin user already exists');
    }
  } catch (e) { console.error('Seed admin failed', e); }
})();

// Gold subscription plans
const GOLD_PLANS = {
  basic: {
    name: 'Locket Gold Basic',
    price: 0, // Free for testing
    duration: 30, // days
    features: ['unlimited_photos', 'priority_support', 'advanced_filters', 'custom_themes']
  },
  premium: {
    name: 'Locket Gold Premium',
    price: 0, // Free for testing
    duration: 30,
    features: ['unlimited_photos', 'priority_support', 'advanced_filters', 'custom_themes', 'ai_enhancement', 'cloud_backup', 'analytics']
  },
  pro: {
    name: 'Locket Gold Pro',
    price: 0, // Free for testing
    duration: 30,
    features: ['unlimited_photos', 'priority_support', 'advanced_filters', 'custom_themes', 'ai_enhancement', 'cloud_backup', 'analytics', 'api_access', 'white_label']
  }
};

// Get Gold plans
app.get('/gold/plans', (req, res) => {
  console.log('[gold] plans requested');
  res.json({ plans: GOLD_PLANS });
});

// Subscribe to Gold plan
app.post('/gold/subscribe', authRequired, async (req, res) => {
  const { planId, paymentMethod } = req.body;
  console.log('[gold] subscription attempt:', { uid: req.user.uid, planId, paymentMethod });
  
  try {
    const plan = GOLD_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // Simulate payment processing
    if (paymentMethod === 'momo') {
      // Simulate MoMo payment success
      const subscription = {
        userId: req.user.uid,
        planId,
        planName: plan.name,
        price: plan.price,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        features: plan.features
      };
      
      // Update user with Gold status
      await db.updateUser(req.user.uid, { hasGold: true, goldPlan: planId });
      
      console.log('[gold] subscription success:', subscription);
      res.json({ 
        success: true, 
        subscription,
        message: 'Gold subscription activated successfully!'
      });
    } else {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
  } catch (err) {
    console.error('[gold] subscription error:', err);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// Get user's Gold status
app.get('/gold/status', authRequired, async (req, res) => {
  try {
    const user = await db.getUser(req.user.uid);
    const hasGold = user.hasGold || false;
    const goldPlan = user.goldPlan || null;
    
    res.json({
      hasGold,
      plan: goldPlan ? GOLD_PLANS[goldPlan] : null,
      features: hasGold ? (GOLD_PLANS[goldPlan]?.features || []) : []
    });
  } catch (err) {
    console.error('[gold] status error:', err);
    res.status(500).json({ error: 'Failed to get Gold status' });
  }
});

// Cancel Gold subscription
app.post('/gold/cancel', authRequired, async (req, res) => {
  try {
    await db.updateUser(req.user.uid, { hasGold: false, goldPlan: null });
    console.log('[gold] subscription cancelled:', { uid: req.user.uid });
    res.json({ success: true, message: 'Gold subscription cancelled' });
  } catch (err) {
    console.error('[gold] cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Gold features endpoints
app.get('/gold/analytics', authRequired, async (req, res) => {
  try {
    const user = await db.getUser(req.user.uid);
    if (!user.hasGold) {
      return res.status(403).json({ error: 'Gold subscription required' });
    }
    
    // Simulate analytics data
    const analytics = {
      totalPhotos: await db.getUserPhotoCount(req.user.uid),
      totalLikes: await db.getUserTotalLikes(req.user.uid),
      monthlyViews: Math.floor(Math.random() * 1000),
      engagementRate: Math.floor(Math.random() * 100),
      topCategories: await db.getUserTopCategories(req.user.uid)
    };
    
    res.json(analytics);
  } catch (err) {
    console.error('[gold] analytics error:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// AI Photo Enhancement (Gold feature)
app.post('/gold/enhance', authRequired, async (req, res) => {
  try {
    const user = await db.getUser(req.user.uid);
    if (!user.hasGold) {
      return res.status(403).json({ error: 'Gold subscription required' });
    }
    
    const { photoId, enhancementType } = req.body;
    // Simulate AI enhancement
    const enhancedPhoto = {
      id: photoId,
      enhanced: true,
      enhancementType,
      originalUrl: `/uploads/${photoId}`,
      enhancedUrl: `/uploads/enhanced_${photoId}`,
      timestamp: new Date().toISOString()
    };
    
    res.json({ success: true, photo: enhancedPhoto });
  } catch (err) {
    console.error('[gold] enhance error:', err);
    res.status(500).json({ error: 'Enhancement failed' });
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Locket Backend API', 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Locket backend running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});