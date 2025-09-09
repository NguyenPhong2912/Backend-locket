-- Locket MVP MySQL Database Schema
-- Designed for username uniqueness and data integrity

-- Create database
CREATE DATABASE IF NOT EXISTS locket_mvp;
USE locket_mvp;

-- Users table with unique username constraint
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,  -- UNIQUE constraint prevents duplicates
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_uid (uid),
    INDEX idx_role (role),
    INDEX idx_banned (banned)
);

-- Photos table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_uid (user_uid),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    INDEX idx_likes_count (likes_count)
);

-- Gold subscriptions table
CREATE TABLE gold_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_uid VARCHAR(50) NOT NULL,
    plan_name VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_uid (user_uid),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
);

-- Chat messages table
CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(50) UNIQUE NOT NULL,
    sender_uid VARCHAR(50) NOT NULL,
    receiver_uid VARCHAR(50),
    message TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file') DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (sender_uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (receiver_uid) REFERENCES users(uid) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_sender_uid (sender_uid),
    INDEX idx_receiver_uid (receiver_uid),
    INDEX idx_created_at (created_at)
);

-- QR codes table
CREATE TABLE qr_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    user_uid VARCHAR(50) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by_uid VARCHAR(50),
    used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (used_by_uid) REFERENCES users(uid) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_code (code),
    INDEX idx_user_uid (user_uid),
    INDEX idx_is_used (is_used)
);

-- Insert default admin user
INSERT INTO users (uid, username, email, password_hash, role, f2a_key, banned, has_gold) 
VALUES (
    'u_5t8ngbf8h6xmfaozluo',
    'admin',
    NULL,
    '$2a$10$MgEGBbkGpcbizm.B2eIIUuV22kgcoTwFfpsc6aE7EGR9fkGCyABAe',
    'admin',
    '153200',
    FALSE,
    FALSE
) ON DUPLICATE KEY UPDATE 
    f2a_key = '153200',
    password_hash = '$2a$10$MgEGBbkGpcbizm.B2eIIUuV22kgcoTwFfpsc6aE7EGR9fkGCyABAe';

-- Create views for common queries
CREATE VIEW user_stats AS
SELECT 
    u.uid,
    u.username,
    u.role,
    u.has_gold,
    u.created_at,
    COUNT(DISTINCT p.id) as photo_count,
    COUNT(DISTINCT cm.id) as message_count,
    COALESCE(SUM(p.likes_count), 0) as total_likes
FROM users u
LEFT JOIN photos p ON u.uid = p.user_uid
LEFT JOIN chat_messages cm ON u.uid = cm.sender_uid
GROUP BY u.uid, u.username, u.role, u.has_gold, u.created_at;

-- Create stored procedures for common operations
DELIMITER //

-- Procedure to check username availability
CREATE PROCEDURE CheckUsernameAvailability(IN p_username VARCHAR(50), OUT p_available BOOLEAN)
BEGIN
    DECLARE user_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO user_count 
    FROM users 
    WHERE username = p_username;
    
    SET p_available = (user_count = 0);
END //

-- Procedure to create user with validation
CREATE PROCEDURE CreateUserWithValidation(
    IN p_uid VARCHAR(50),
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_password_hash VARCHAR(255),
    IN p_role VARCHAR(10),
    IN p_phone VARCHAR(20),
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Database error occurred';
    END;
    
    START TRANSACTION;
    
    -- Check if username already exists
    IF EXISTS(SELECT 1 FROM users WHERE username = p_username) THEN
        SET p_success = FALSE;
        SET p_message = 'Username already taken';
        ROLLBACK;
    ELSEIF EXISTS(SELECT 1 FROM users WHERE email = p_email AND p_email IS NOT NULL) THEN
        SET p_success = FALSE;
        SET p_message = 'Email already taken';
        ROLLBACK;
    ELSEIF EXISTS(SELECT 1 FROM users WHERE phone = p_phone AND p_phone IS NOT NULL) THEN
        SET p_success = FALSE;
        SET p_message = 'Phone number already taken';
        ROLLBACK;
    ELSE
        INSERT INTO users (uid, username, email, password_hash, role, phone)
        VALUES (p_uid, p_username, p_email, p_password_hash, p_role, p_phone);
        
        SET p_success = TRUE;
        SET p_message = 'User created successfully';
        COMMIT;
    END IF;
END //

DELIMITER ;

-- Create triggers for data validation
DELIMITER //

-- Trigger to validate username format
CREATE TRIGGER validate_username_format
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.username REGEXP '^[a-zA-Z0-9_]{3,20}$' = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Username must be 3-20 characters, alphanumeric and underscore only';
    END IF;
END //

-- Trigger to validate email format
CREATE TRIGGER validate_email_format
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.email IS NOT NULL AND NEW.email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid email format';
    END IF;
END //

DELIMITER ;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON locket_mvp.* TO 'locket_user'@'localhost' IDENTIFIED BY 'secure_password';
-- FLUSH PRIVILEGES;
