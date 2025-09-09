# 🗄️ MySQL Database Setup Guide

## ✅ **Đã thiết kế cơ sở dữ liệu MySQL hoàn chỉnh!**

### 🎯 **Tính năng chính:**
- **Username uniqueness** - Không cho phép username trùng lặp
- **Email uniqueness** - Không cho phép email trùng lặp
- **Phone uniqueness** - Không cho phép số điện thoại trùng lặp
- **Data validation** - Validation dữ liệu đầu vào
- **Foreign key constraints** - Đảm bảo tính toàn vẹn dữ liệu
- **Indexes** - Tối ưu hóa hiệu suất

## 📊 **Database Schema:**

### **1. Users Table:**
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,  -- UNIQUE constraint
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    role ENUM('user', 'admin') DEFAULT 'user',
    f2a_key VARCHAR(10),
    avatar_url VARCHAR(500),
    phone VARCHAR(20) UNIQUE,
    banned BOOLEAN DEFAULT FALSE,
    has_gold BOOLEAN DEFAULT FALSE,
    gold_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **2. Photos Table:**
```sql
CREATE TABLE photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    photo_id VARCHAR(50) UNIQUE NOT NULL,
    user_uid VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    caption TEXT,
    category VARCHAR(50),
    likes_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);
```

### **3. Gold Subscriptions Table:**
```sql
CREATE TABLE gold_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_uid VARCHAR(50) NOT NULL,
    plan_name VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
);
```

### **4. Chat Messages Table:**
```sql
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(50) UNIQUE NOT NULL,
    sender_uid VARCHAR(50) NOT NULL,
    receiver_uid VARCHAR(50),
    message TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file') DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (receiver_uid) REFERENCES users(uid) ON DELETE CASCADE
);
```

## 🚀 **Cách setup:**

### **Bước 1: Cài đặt MySQL**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS
brew install mysql

# Windows
# Download từ https://dev.mysql.com/downloads/mysql/
```

### **Bước 2: Tạo database**
```bash
# Login vào MySQL
mysql -u root -p

# Chạy script tạo database
source mysql-schema.sql
```

### **Bước 3: Cấu hình environment**
```bash
# Tạo file .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=locket_mvp
JWT_SECRET=your_jwt_secret
```

### **Bước 4: Cài đặt dependencies**
```bash
npm install mysql2
```

### **Bước 5: Chạy server với MySQL**
```bash
# Thay vì chạy index.js, chạy:
node index-mysql.js
```

## 🔐 **Validation Features:**

### **1. Username Validation:**
- **Unique constraint** - Không cho phép trùng lặp
- **Format validation** - 3-20 ký tự, chỉ chữ, số và gạch dưới
- **Real-time check** - API endpoint `/check-username`

### **2. Email Validation:**
- **Unique constraint** - Không cho phép trùng lặp
- **Format validation** - Regex pattern validation
- **Optional field** - Có thể để trống

### **3. Phone Validation:**
- **Unique constraint** - Không cho phép trùng lặp
- **Format normalization** - Loại bỏ ký tự đặc biệt
- **Length validation** - Tối thiểu 10 số

## 🛠️ **API Endpoints mới:**

### **Username Availability:**
```javascript
POST /check-username
{
  "username": "testuser"
}

Response:
{
  "available": true/false
}
```

### **Enhanced Registration:**
```javascript
POST /register
{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com"
}

// Tự động check username và email availability
```

## 📈 **Performance Optimizations:**

### **1. Indexes:**
- `idx_username` - Tìm kiếm username nhanh
- `idx_email` - Tìm kiếm email nhanh
- `idx_phone` - Tìm kiếm phone nhanh
- `idx_uid` - Tìm kiếm UID nhanh
- `idx_role` - Filter theo role
- `idx_banned` - Filter theo banned status

### **2. Stored Procedures:**
- `CheckUsernameAvailability` - Check username availability
- `CreateUserWithValidation` - Tạo user với validation

### **3. Triggers:**
- `validate_username_format` - Validate username format
- `validate_email_format` - Validate email format

## 🔧 **Troubleshooting:**

### **Lỗi kết nối MySQL:**
```bash
# Kiểm tra MySQL service
sudo systemctl status mysql

# Khởi động MySQL
sudo systemctl start mysql

# Kiểm tra port
netstat -tlnp | grep 3306
```

### **Lỗi permission:**
```sql
-- Tạo user mới
CREATE USER 'locket_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON locket_mvp.* TO 'locket_user'@'localhost';
FLUSH PRIVILEGES;
```

### **Lỗi charset:**
```sql
-- Kiểm tra charset
SHOW VARIABLES LIKE 'character_set%';

-- Set charset
ALTER DATABASE locket_mvp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 🎯 **Benefits:**

### ✅ **Data Integrity:**
- **Foreign key constraints** - Đảm bảo tính toàn vẹn
- **Unique constraints** - Không cho phép trùng lặp
- **Data validation** - Validate dữ liệu đầu vào

### ✅ **Performance:**
- **Indexes** - Tìm kiếm nhanh
- **Stored procedures** - Xử lý phức tạp
- **Connection pooling** - Quản lý kết nối hiệu quả

### ✅ **Scalability:**
- **MySQL** - Database mạnh mẽ
- **Connection pooling** - Hỗ trợ nhiều user
- **Optimized queries** - Query tối ưu

---

## 🚀 **Ready to Deploy!**

**MySQL database đã được thiết kế hoàn chỉnh với username uniqueness!**

**Setup và enjoy!** 🎉✨🗄️
