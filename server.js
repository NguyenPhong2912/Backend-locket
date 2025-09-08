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

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password: password ? '***' : 'empty' });
  
  // Simple admin login for testing
  if (username === 'admin' && password === 'admin') {
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
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// 2FA endpoint
app.post('/verify-2fa', (req, res) => {
  const { code } = req.body;
  
  // Simple 2FA for testing
  if (code === '2006') {
    res.json({
      success: true,
      message: '2FA verified successfully'
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid 2FA code'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Locket Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});
