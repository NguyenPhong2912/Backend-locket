// Locket MVP Backend with MySQL Database
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { UserDB, PhotoDB, ChatDB, initializeDatabase } = require('./mysql-db');

const app = express();
const server = createServer(app);
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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
  stored.attempts++;
  if (stored.code !== code) {
    return { valid: false, error: 'Invalid OTP' };
  }
  otpStore.delete(phone);
  return { valid: true };
}

// Auth middleware
const authRequired = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserDB.getByUID(decoded.uid);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'MySQL',
    version: '1.0.0'
  });
});

// OTP endpoints
app.post('/send-otp', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  
  const normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  
  const otp = generateOTP();
  storeOTP(normalizedPhone, otp);
  
  console.log(`[otp] sent to ${normalizedPhone}: ${otp}`);
  res.json({ message: 'OTP sent', phone: normalizedPhone });
});

app.post('/verify-otp', async (req, res) => {
  const { phone, code, username } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });
  
  const normalizedPhone = phone.replace(/\D/g, '');
  const otpResult = verifyOTP(normalizedPhone, code);
  
  if (!otpResult.valid) {
    return res.status(400).json({ error: otpResult.error });
  }
  
  let user = await UserDB.getByPhone(normalizedPhone);
  
  if (!user) {
    if (!username) {
      return res.status(400).json({ error: 'Username required for new user' });
    }
    
    // Check if username is available
    const isUsernameAvailable = await UserDB.isUsernameAvailable(username);
    if (!isUsernameAvailable) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    
    const uid = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    user = await UserDB.createUser({
      uid,
      username,
      phone: normalizedPhone,
      role: 'user'
    });
    
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
    isNewUser: !user.created_at
  });
});

// Legacy auth endpoints
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body || {};
  console.log('[register] attempt:', { username, hasPassword: !!password, email });
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    // Check if username is available
    const isUsernameAvailable = await UserDB.isUsernameAvailable(username);
    if (!isUsernameAvailable) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    
    // Check if email is available (if provided)
    if (email) {
      const isEmailAvailable = await UserDB.isEmailAvailable(email);
      if (!isEmailAvailable) {
        return res.status(409).json({ error: 'Email already taken' });
      }
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const uid = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const user = await UserDB.createUser({
      uid,
      username,
      email,
      password_hash: passwordHash,
      role: 'user'
    });
    
    console.log('[register] success:', { uid: user.uid, username: user.username, role: user.role });
    
    const token = jwt.sign({ 
      uid: user.uid, 
      role: user.role, 
      email: user.email, 
      username: user.username 
    }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      uid: user.uid, 
      username: user.username, 
      role: user.role, 
      email: user.email,
      hasGold: user.has_gold || false
    });
  } catch (error) {
    console.error('[register] error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  console.log('[login] attempt:', { username, hasPassword: !!password });
  
  try {
    const user = await UserDB.getByUsername(username || '');
    if (!user) {
      console.log('[login] user not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (user.banned) {
      console.log('[login] user banned:', username);
      return res.status(403).json({ error: 'Account banned' });
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
    
    const token = jwt.sign({ 
      uid: user.uid, 
      role: user.role, 
      email: user.email, 
      username: user.username 
    }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('[login] success:', { uid: user.uid, username: user.username, role: user.role });
    res.json({ 
      token, 
      uid: user.uid, 
      role: user.role, 
      username: user.username, 
      email: user.email,
      hasGold: user.has_gold || false
    });
  } catch (error) {
    console.error('[login] error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/admin/verify-2fa', async (req, res) => {
  const { username, code } = req.body || {};
  console.log('[2fa] attempt:', { username, code });
  
  try {
    const user = await UserDB.getByUsername(username || '');
    if (!user || user.role !== 'admin') {
      console.log('[2fa] invalid user or not admin:', username);
      return res.status(401).json({ error: 'Invalid user' });
    }
    
    if (user.f2a_key !== String(code)) {
      console.log('[2fa] wrong code for:', username, 'expected:', user.f2a_key, 'got:', code);
      return res.status(401).json({ error: 'Wrong code' });
    }
    
    const token = jwt.sign({ 
      uid: user.uid, 
      role: user.role, 
      email: user.email, 
      username: user.username 
    }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('[2fa] success:', { uid: user.uid, username: user.username, role: user.role });
    res.json({ 
      token, 
      uid: user.uid, 
      role: user.role, 
      username: user.username, 
      email: user.email,
      hasGold: user.has_gold || false
    });
  } catch (error) {
    console.error('[2fa] error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// User profile endpoints
app.get('/me', authRequired, (req, res) => {
  res.json({ 
    uid: req.user.uid, 
    role: req.user.role, 
    email: req.user.email, 
    username: req.user.username,
    hasGold: req.user.has_gold || false
  });
});

// Username availability check
app.post('/check-username', async (req, res) => {
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  try {
    const isAvailable = await UserDB.isUsernameAvailable(username);
    res.json({ available: isAvailable });
  } catch (error) {
    console.error('[check-username] error:', error);
    res.status(500).json({ error: 'Check failed' });
  }
});

// Photo endpoints
app.post('/photos', authRequired, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const { caption, category } = req.body || {};
    const photo_id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const photo = await PhotoDB.createPhoto({
      photo_id,
      user_uid: req.user.uid,
      filename: req.file.filename,
      original_name: req.file.originalname,
      caption,
      category
    });
    
    console.log('[photo] uploaded:', { photo_id, user_uid: req.user.uid });
    res.json({ 
      id: photo.photo_id,
      filename: photo.filename,
      caption: photo.caption,
      category: photo.category
    });
  } catch (error) {
    console.error('[photo] upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/photos', authRequired, async (req, res) => {
  try {
    const photos = await PhotoDB.getByUser(req.user.uid);
    res.json(photos);
  } catch (error) {
    console.error('[photos] get error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

// Admin endpoints
app.get('/admin/console', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const stats = await UserDB.getUserStats();
    const users = await UserDB.getAllUsers(50, 0);
    const photos = await PhotoDB.getAllPhotos(50, 0);
    
    res.json({
      users: stats.total_users,
      photos: photos.length,
      bannedUsers: stats.banned_count,
      goldUsers: stats.gold_count,
      recentUsers: users.slice(0, 5),
      recentPhotos: photos.slice(0, 5)
    });
  } catch (error) {
    console.error('[admin] console error:', error);
    res.status(500).json({ error: 'Failed to get admin data' });
  }
});

// Chat endpoints
app.post('/chat/messages', authRequired, async (req, res) => {
  const { message, receiver_uid } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message required' });
  
  try {
    const message_id = 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const chatMessage = await ChatDB.createMessage({
      message_id,
      sender_uid: req.user.uid,
      receiver_uid,
      message
    });
    
    // Emit to Socket.IO
    io.emit('new_message', {
      id: chatMessage.message_id,
      sender_uid: chatMessage.sender_uid,
      receiver_uid: chatMessage.receiver_uid,
      message: chatMessage.message,
      created_at: new Date().toISOString()
    });
    
    res.json(chatMessage);
  } catch (error) {
    console.error('[chat] message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/chat/messages', authRequired, async (req, res) => {
  try {
    const messages = await ChatDB.getMessages(50, 0);
    res.json(messages);
  } catch (error) {
    console.error('[chat] get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('❌ Failed to initialize database');
      process.exit(1);
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: MySQL`);
      console.log(`🔐 Admin: username=admin, password=admin, 2FA=153200`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
