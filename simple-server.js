const express = require('express');
const cors = require('cors');

const app = express();

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

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
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

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Simple Locket backend running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

