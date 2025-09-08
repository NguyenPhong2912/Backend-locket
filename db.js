// Simple in-memory database for MVP
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize data structure
let data = {
  users: [],
  photos: []
};

// Load data from file if exists
if (fs.existsSync(DB_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.log('[db] Error loading data, using defaults');
  }
}

// Save data to file
function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[db] Error saving data:', e);
  }
}

// Users
function createUser(username) {
  const user = {
    id: Date.now(),
    uid: 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
    username,
    email: null,
    password_hash: null,
    role: 'user',
    f2a_key: null,
    avatar_url: null,
    banned: false,
    hasGold: false,
    goldPlan: null,
    goldStartDate: null,
    goldEndDate: null,
    created_at: Date.now()
  };
  data.users.push(user);
  save();
  return user;
}

function createRegisteredUser({ email, passwordHash, username, role, f2aKey }) {
  const user = {
    id: Date.now(),
    uid: 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
    username,
    email,
    password_hash: passwordHash,
    role,
    f2a_key: f2aKey,
    avatar_url: null,
    banned: false,
    hasGold: false,
    created_at: Date.now()
  };
  data.users.push(user);
  save();
  return user;
}

function createUserWithPhone(phone, username) {
  const user = {
    id: Date.now(),
    uid: 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
    username,
    phone,
    email: null,
    password_hash: null,
    role: 'user',
    f2a_key: null,
    avatar_url: null,
    banned: false,
    hasGold: false,
    created_at: Date.now()
  };
  data.users.push(user);
  save();
  return user;
}

function getUserByUsername(username) {
  return data.users.find(u => u.username === username);
}

function getUserByEmail(email) {
  return data.users.find(u => u.email === email);
}

function getUserByPhone(phone) {
  return data.users.find(u => u.phone === phone);
}

function getUserById(uid) {
  return data.users.find(u => u.uid === uid);
}

function getUserByUid(uid) {
  return data.users.find(u => u.uid === uid);
}

function getUser(uid) {
  return data.users.find(u => u.uid === uid);
}

function updateUser(uid, updates) {
  const user = data.users.find(u => u.uid === uid);
  if (user) {
    Object.assign(user, updates);
    save();
    return user;
  }
  return null;
}

function setAvatar(uid, url) {
  const user = data.users.find(u => u.uid === uid);
  if (user) {
    user.avatar_url = url;
    save();
  }
  return user;
}

function setBanned(uid, banned) {
  const user = data.users.find(u => u.uid === uid);
  if (user) {
    user.banned = banned;
    save();
  }
  return user;
}

function listUsers() {
  return data.users.map(({ password_hash, ...user }) => user);
}

function deleteUsersExceptAdmin() {
  data.users = data.users.filter(u => u.username === 'admin');
  save();
}

function deleteUser(uid) {
  const index = data.users.findIndex(u => u.uid === uid);
  if (index !== -1) {
    data.users.splice(index, 1);
    save();
    return true;
  }
  return false;
}

function removeUserPlan(uid) {
  const user = data.users.find(u => u.uid === uid);
  if (user) {
    user.hasGold = false;
    save();
    return true;
  }
  return false;
}

function getPhotosByUser(uid) {
  return data.photos.filter(p => p.user_id === uid);
}

// Photos
function createPhoto({ filename, url, caption, category }) {
  const photo = {
    id: Date.now(),
    filename,
    url,
    caption,
    category,
    likes: 0,
    created_at: Date.now()
  };
  data.photos.unshift(photo);
  save();
  return photo;
}

function listPhotos(category) {
  if (category && category !== 'all') {
    return data.photos.filter(p => p.category === category);
  }
  return data.photos;
}

function likePhoto(id) {
  const photo = data.photos.find(p => p.id === id);
  if (photo) {
    photo.likes = (photo.likes || 0) + 1;
    save();
    return photo;
  }
  return null;
}

function getPhotoById(id) {
  return data.photos.find(p => p.id === id);
}

function deletePhoto(id) {
  const index = data.photos.findIndex(p => p.id === id);
  if (index !== -1) {
    data.photos.splice(index, 1);
    save();
    return true;
  }
  return false;
}

function deleteAllPhotos() {
  data.photos = [];
  save();
}

function listCategories() {
  const categories = [...new Set(data.photos.map(p => p.category))];
  return categories.sort();
}

module.exports = {
  // Users
  createUser,
  createRegisteredUser,
  createUserWithPhone,
  getUserByUsername,
  getUserByEmail,
  getUserByPhone,
  getUserById,
  getUser,
  getUserByUid,
  updateUser,
  setAvatar,
  setBanned,
  listUsers,
  deleteUsersExceptAdmin,
  deleteUser,
  removeUserPlan,
  getPhotosByUser,
  
  // Photos
  createPhoto,
  listPhotos,
  likePhoto,
  getPhotoById,
  deletePhoto,
  deleteAllPhotos,
  listCategories,
  
  // Gold-related functions
  getUserPhotoCount,
  getUserTotalLikes,
  getUserTopCategories
};

// Gold-related functions
function getUserPhotoCount(uid) {
  return data.photos.filter(p => p.user_id === uid).length;
}

function getUserTotalLikes(uid) {
  return data.photos
    .filter(p => p.user_id === uid)
    .reduce((sum, p) => sum + (p.likes || 0), 0);
}

function getUserTopCategories(uid) {
  const userPhotos = data.photos.filter(p => p.user_id === uid);
  const categoryCount = {};
  userPhotos.forEach(p => {
    categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
  });
  return Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
}