# Locket Backend

Backend API for Locket MVP photo sharing app.

## Quick Start

```bash
npm install
npm start
```

## Environment Variables

- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key`
- `PORT=4000` (auto-set by Render)

## API Endpoints

- `GET /` - Health check
- `POST /login` - User login
- `POST /register` - User registration
- `GET /photos` - List photos
- `POST /upload` - Upload photo
- `GET /gold/plans` - Subscription plans
- `POST /qr/generate` - Generate QR code

## Deploy on Render

1. Connect GitHub repository
2. Set Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
