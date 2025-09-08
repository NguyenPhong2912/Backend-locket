const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// In-memory database for Render deployment
let users = [
  { uid: 'admin-001', username: 'admin', password: 'admin', role: 'admin', require2fa: true },
  { uid: 'user-001', username: 'user', password: 'user', role: 'user', require2fa: false }
];

// Helper functions for user management
const readUsers = () => {
  return users;
};

const writeUsers = (newUsers) => {
  users = newUsers;
  return true;
};

const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

const createUser = (username, password, role = 'user') => {
  const uid = `user-${Date.now()}`;
  const newUser = {
    uid,
    username,
    password, // In production, this should be hashed
    role,
    require2fa: role === 'admin'
  };
  users.push(newUser);
  return newUser;
};

// Middleware
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

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Locket Backend API', 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

// Gold plans endpoint
app.get('/gold/plans', (req, res) => {
  res.json([
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      features: ['Basic photo sharing', 'Limited storage']
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 99000,
      features: ['Unlimited photos', 'Advanced filters', 'Priority support']
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 199000,
      features: ['Everything in Premium', 'AI enhancement', 'Analytics dashboard']
    }
  ]);
});

// Categories endpoint
app.get('/categories', (req, res) => {
  res.json([
    { id: 'all', name: 'All', count: 0 },
    { id: 'nature', name: 'Nature', count: 0 },
    { id: 'city', name: 'City', count: 0 },
    { id: 'food', name: 'Food', count: 0 },
    { id: 'travel', name: 'Travel', count: 0 }
  ]);
});

// Photos endpoint
app.get('/photos', (req, res) => {
  res.json([]);
});

// Users endpoint
app.get('/users', (req, res) => {
  res.json([
    { id: 'admin-001', username: 'admin', role: 'admin' },
    { id: 'user-001', username: 'user1', role: 'user' }
  ]);
});

// Login endpoint
app.get('/login', (req, res) => {
  res.json({
    success: true,
    user: {
      uid: 'admin-001',
      username: 'admin',
      role: 'admin',
      require2fa: true
    },
    token: 'fake-jwt-token-for-testing'
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // Find user in database
  const user = findUserByUsername(username);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({
    success: true,
    user: {
      uid: user.uid,
      username: user.username,
      role: user.role,
      require2fa: user.require2fa
    },
    token: `fake-jwt-token-for-${user.uid}`
  });
});

// 2FA endpoint
app.get('/verify-2fa', (req, res) => {
  res.json({
    success: true,
    message: '2FA verified successfully'
  });
});

app.post('/verify-2fa', (req, res) => {
  const { username, code } = req.body;
  
  if (!username || !code) {
    return res.status(400).json({ error: 'Username and code required' });
  }
  
  // Find user in database
  const user = findUserByUsername(username);
  
  if (!user || !user.require2fa) {
    return res.status(400).json({ error: 'User not found or 2FA not required' });
  }
  
  // Simple 2FA verification (accept any 6-digit code)
  if (code.length === 6 && /^\d+$/.test(code)) {
    res.json({
      success: true,
      user: {
        uid: user.uid,
        username: user.username,
        role: user.role
      },
      token: `fake-jwt-token-for-${user.uid}-verified`
    });
  } else {
    res.status(401).json({ error: 'Invalid 2FA code' });
  }
});

// Register endpoint
app.get('/register', (req, res) => {
  res.json({
    success: true,
    user: {
      uid: 'user-002',
      username: 'newuser',
      role: 'user',
      require2fa: false
    },
    token: 'fake-jwt-token-for-new-user'
  });
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  // Check if user already exists
  const existingUser = findUserByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  // Create new user
  const newUser = createUser(username, password, 'user');
  
  res.json({
    success: true,
    user: {
      uid: newUser.uid,
      username: newUser.username,
      role: newUser.role,
      require2fa: newUser.require2fa
    },
    token: `fake-jwt-token-for-${newUser.uid}`
  });
});

// Me endpoint
app.get('/me', (req, res) => {
  res.json({
    success: true,
    user: {
      uid: 'admin-001',
      username: 'admin',
      role: 'admin'
    }
  });
});

// Feed endpoint
app.get('/feed', (req, res) => {
  res.json([]);
});

// Signup endpoint
app.post('/signup', (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  
  const uid = `user-${Date.now()}`;
  
  res.json({
    success: true,
    uid: uid,
    username: username
  });
});

// Avatar upload endpoint
app.post('/me/avatar', (req, res) => {
  res.json({
    success: true,
    avatar_url: '/uploads/avatar-placeholder.jpg'
  });
});

// Admin endpoints
app.get('/admin', (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard',
    stats: {
      users: 10,
      photos: 25,
      categories: 5
    }
  });
});

// QR endpoints
app.get('/qr/generate', (req, res) => {
  res.json({
    success: true,
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    value: '10p'
  });
});

app.post('/qr/redeem', (req, res) => {
  const { qr_code } = req.body;
  
  if (!qr_code) {
    return res.status(400).json({ error: 'QR code required' });
  }
  
  res.json({
    success: true,
    message: 'QR code redeemed successfully',
    points: 10
  });
});

// Auth endpoints
app.post('/auth/send-otp', (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  res.json({
    success: true,
    message: 'OTP sent successfully',
    otp: otp // For development only
  });
});

app.post('/auth/verify-otp', (req, res) => {
  const { phone, otp, username } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP required' });
  }
  
  if (otp.length !== 6) {
    return res.status(400).json({ error: 'Invalid OTP format' });
  }
  
  if (!username) {
    return res.status(400).json({ error: 'Username required for new users' });
  }
  
  const uid = `user-${Date.now()}`;
  
  res.json({
    success: true,
    token: `fake-jwt-token-for-${uid}`,
    uid: uid,
    role: 'user',
    phone: phone,
    username: username
  });
});

// Debug endpoint to check database
app.get('/debug/users', (req, res) => {
  const currentUsers = readUsers();
  res.json({
    success: true,
    users: currentUsers,
    count: currentUsers.length,
    message: 'In-memory database'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Locket Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`💾 Using in-memory database`);
  console.log(`📡 Available endpoints:`);
  console.log(`  GET /health`);
  console.log(`  GET /`);
  console.log(`  GET /test`);
  console.log(`  GET /debug/users`);
  console.log(`  GET /gold/plans`);
  console.log(`  GET /categories`);
  console.log(`  GET /photos`);
  console.log(`  GET /users`);
  console.log(`  GET /me`);
  console.log(`  GET /feed`);
  console.log(`  GET /admin`);
  console.log(`  GET /qr/generate`);
  console.log(`  POST /login`);
  console.log(`  POST /register`);
  console.log(`  POST /verify-2fa`);
  console.log(`  POST /signup`);
  console.log(`  POST /me/avatar`);
  console.log(`  POST /qr/redeem`);
  console.log(`  POST /auth/send-otp`);
  console.log(`  POST /auth/verify-otp`);
});