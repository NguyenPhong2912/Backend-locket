# 🔐 Locket Backend API

Backend API cho ứng dụng Locket MVP - ứng dụng chia sẻ ảnh với tính năng Gold subscription.

## 🚀 Features

- **Authentication**: Phone OTP, Username/Password, 2FA
- **Photo Management**: Upload, like, categorize photos
- **Gold Subscription**: Premium plans với MoMo payment
- **Admin Panel**: User management, content moderation
- **Real-time Chat**: WebSocket support
- **QR Code System**: Generate và redeem QR codes
- **Analytics**: User statistics và photo insights

## 📋 API Endpoints

### Authentication
- `POST /auth/send-otp` - Gửi OTP qua SMS
- `POST /auth/verify-otp` - Xác thực OTP
- `POST /login` - Đăng nhập username/password
- `POST /register` - Đăng ký tài khoản
- `POST /admin/verify-2fa` - Xác thực 2FA cho admin
- `GET /me` - Lấy thông tin user hiện tại

### Photos
- `GET /photos` - Lấy danh sách photos
- `POST /upload` - Upload photo mới
- `POST /photos/:id/like` - Like photo
- `GET /feed` - Lấy feed photos

### Gold Subscription
- `GET /gold/plans` - Lấy danh sách plans
- `POST /gold/subscribe` - Đăng ký Gold plan
- `GET /gold/status` - Kiểm tra trạng thái Gold
- `POST /gold/cancel` - Hủy subscription
- `GET /gold/analytics` - Analytics (Gold users)
- `POST /gold/enhance` - AI photo enhancement

### QR System
- `POST /qr/generate` - Tạo QR code
- `POST /qr/redeem` - Redeem QR code

### Admin
- `GET /admin/users` - Danh sách users
- `POST /admin/users/:uid/ban` - Ban/unban user
- `DELETE /admin/users/:uid` - Xóa user
- `GET /admin/console` - Admin console
- `POST /admin/console/execute` - Execute admin commands
- `GET /admin/stats` - Thống kê hệ thống

### System
- `GET /health` - Health check
- `GET /` - API info
- `GET /categories` - Danh sách categories
- `GET /users` - Danh sách users (cho chat)

## 🛠️ Installation

```bash
# Clone repository
git clone https://github.com/NguyenPhong2912/Backend-locket.git
cd Backend-locket

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 🔧 Environment Variables

```bash
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
JWT_SECRET=your-secret-key
```

## 📦 Dependencies

- **express**: Web framework
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **socket.io**: Real-time communication

## 🚀 Deployment

### Render.com
1. Connect GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables
5. Deploy!

### Environment Variables for Production
```
NODE_ENV=production
JWT_SECRET=your-production-secret
PORT=4000
```

## 📱 Frontend Integration

Backend hỗ trợ CORS cho các domain:
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000` (React dev)
- `https://thanhphong.fun` (Production)
- `https://www.thanhphong.fun` (Production)

## 🔐 Security Features

- JWT token authentication
- Password hashing với bcrypt
- CORS protection
- File upload validation
- Admin role-based access
- OTP rate limiting
- Input validation

## 📊 Database

Sử dụng file-based database (JSON files):
- `data.json` - User data
- `photos.json` - Photo metadata
- `uploads/` - Uploaded files

## 🧪 Testing

```bash
# Test health endpoint
curl https://your-backend-url.com/health

# Test authentication
curl -X POST https://your-backend-url.com/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+84123456789"}'
```

## 📝 API Documentation

Chi tiết API documentation có thể tìm thấy trong code comments hoặc test với Postman collection.

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.