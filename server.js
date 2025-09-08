const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

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

// Login endpoint (GET for testing)
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

// 2FA endpoint (GET for testing)
app.get('/verify-2fa', (req, res) => {
  res.json({
    success: true,
    message: '2FA verified successfully'
  });
});

// Register endpoint (GET for testing)
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Locket Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`📡 Available endpoints:`);
  console.log(`  GET /health`);
  console.log(`  GET /`);
  console.log(`  GET /test`);
  console.log(`  GET /gold/plans`);
  console.log(`  GET /categories`);
  console.log(`  GET /photos`);
  console.log(`  GET /users`);
  console.log(`  GET /login`);
  console.log(`  GET /verify-2fa`);
  console.log(`  GET /register`);
});