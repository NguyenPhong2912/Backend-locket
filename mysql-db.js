// MySQL Database Connection and Operations
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'locket_mvp',
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error.message);
    return false;
  }
}

// User operations
const UserDB = {
  // Check if username is available
  async isUsernameAvailable(username) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE username = ?',
        [username]
      );
      return rows[0].count === 0;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  },

  // Check if email is available
  async isEmailAvailable(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE email = ?',
        [email]
      );
      return rows[0].count === 0;
    } catch (error) {
      console.error('Error checking email availability:', error);
      return false;
    }
  },

  // Check if phone is available
  async isPhoneAvailable(phone) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE phone = ?',
        [phone]
      );
      return rows[0].count === 0;
    } catch (error) {
      console.error('Error checking phone availability:', error);
      return false;
    }
  },

  // Get user by username
  async getByUsername(username) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  },

  // Get user by UID
  async getByUID(uid) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE uid = ?',
        [uid]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting user by UID:', error);
      return null;
    }
  },

  // Get user by phone
  async getByPhone(phone) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE phone = ?',
        [phone]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting user by phone:', error);
      return null;
    }
  },

  // Create user with validation
  async createUser(userData) {
    try {
      const {
        uid,
        username,
        email,
        password_hash,
        role = 'user',
        f2a_key = null,
        phone = null,
        avatar_url = null,
        banned = false,
        has_gold = false
      } = userData;

      // Validate username availability
      if (!(await this.isUsernameAvailable(username))) {
        throw new Error('Username already taken');
      }

      // Validate email availability if provided
      if (email && !(await this.isEmailAvailable(email))) {
        throw new Error('Email already taken');
      }

      // Validate phone availability if provided
      if (phone && !(await this.isPhoneAvailable(phone))) {
        throw new Error('Phone number already taken');
      }

      const [result] = await pool.execute(
        `INSERT INTO users (uid, username, email, password_hash, role, f2a_key, phone, avatar_url, banned, has_gold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uid, username, email, password_hash, role, f2a_key, phone, avatar_url, banned, has_gold]
      );

      return {
        id: result.insertId,
        uid,
        username,
        email,
        role,
        f2a_key,
        phone,
        avatar_url,
        banned,
        has_gold
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  async updateUser(uid, updateData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(uid);

      await pool.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE uid = ?`,
        values
      );

      return await this.getByUID(uid);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Delete user
  async deleteUser(uid) {
    try {
      await pool.execute('DELETE FROM users WHERE uid = ?', [uid]);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Get all users with pagination
  async getAllUsers(limit = 50, offset = 0) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  },

  // Get user statistics
  async getUserStats() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN banned = true THEN 1 END) as banned_count,
          COUNT(CASE WHEN has_gold = true THEN 1 END) as gold_count
        FROM users
      `);
      return rows[0];
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }
};

// Photo operations
const PhotoDB = {
  // Create photo
  async createPhoto(photoData) {
    try {
      const {
        photo_id,
        user_uid,
        filename,
        original_name,
        caption,
        category,
        is_public = true
      } = photoData;

      const [result] = await pool.execute(
        `INSERT INTO photos (photo_id, user_uid, filename, original_name, caption, category, is_public)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [photo_id, user_uid, filename, original_name, caption, category, is_public]
      );

      return {
        id: result.insertId,
        photo_id,
        user_uid,
        filename,
        original_name,
        caption,
        category,
        is_public
      };
    } catch (error) {
      console.error('Error creating photo:', error);
      throw error;
    }
  },

  // Get photos by user
  async getByUser(user_uid, limit = 50, offset = 0) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM photos WHERE user_uid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [user_uid, limit, offset]
      );
      return rows;
    } catch (error) {
      console.error('Error getting photos by user:', error);
      return [];
    }
  },

  // Get all photos
  async getAllPhotos(limit = 50, offset = 0) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM photos ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows;
    } catch (error) {
      console.error('Error getting all photos:', error);
      return [];
    }
  },

  // Delete photo
  async deletePhoto(photo_id) {
    try {
      await pool.execute('DELETE FROM photos WHERE photo_id = ?', [photo_id]);
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }
};

// Chat operations
const ChatDB = {
  // Create message
  async createMessage(messageData) {
    try {
      const {
        message_id,
        sender_uid,
        receiver_uid,
        message,
        message_type = 'text'
      } = messageData;

      const [result] = await pool.execute(
        `INSERT INTO chat_messages (message_id, sender_uid, receiver_uid, message, message_type)
         VALUES (?, ?, ?, ?, ?)`,
        [message_id, sender_uid, receiver_uid, message, message_type]
      );

      return {
        id: result.insertId,
        message_id,
        sender_uid,
        receiver_uid,
        message,
        message_type
      };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },

  // Get messages
  async getMessages(limit = 50, offset = 0) {
    try {
      const [rows] = await pool.execute(
        `SELECT cm.*, u.username as sender_username 
         FROM chat_messages cm 
         JOIN users u ON cm.sender_uid = u.uid 
         ORDER BY cm.created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return rows;
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }
};

// Initialize database
async function initializeDatabase() {
  try {
    await testConnection();
    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  UserDB,
  PhotoDB,
  ChatDB
};
