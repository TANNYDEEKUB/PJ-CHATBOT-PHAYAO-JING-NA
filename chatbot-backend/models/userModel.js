const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String },
  phoneNumber: { type: String },
  address: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving


const User = mongoose.model('User', userSchema);

module.exports = User;
