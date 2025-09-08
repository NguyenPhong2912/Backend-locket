# Backend Deployment Guide

## Render Deployment

### 1. Tạo Repository trên GitHub
- Push code lên GitHub repository
- Đảm bảo có file `package.json` và `index.js` trong root

### 2. Deploy trên Render
1. Đăng nhập vào [Render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect GitHub repository
4. Cấu hình:
   - **Name**: `locket-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: `18` hoặc `20`

### 3. Environment Variables
Thêm các biến môi trường trong Render dashboard:
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
```

### 4. Sau khi deploy
- Render sẽ cung cấp URL như: `https://locket-backend.onrender.com`
- Cập nhật URL này trong file `frontend/src/config.js`

## Local Development
```bash
cd backend
npm install
npm start
```

## API Endpoints
- Health check: `GET /`
- Photos: `GET /photos`
- Upload: `POST /upload`
- Auth: `POST /login`, `POST /register`
- Admin: `GET /admin/users`, `POST /admin/verify-2fa`
- Gold: `GET /gold/plans`, `POST /gold/subscribe`
- QR: `POST /qr/generate`, `POST /qr/redeem`
