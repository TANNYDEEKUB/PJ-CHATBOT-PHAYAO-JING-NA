const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const argon2 = require('argon2');

// Register a new user
exports.registerUser = async (req, res) => {
  const { username, email, password, fullName, phoneNumber, address } = req.body;

  try {
    // แฮชรหัสผ่านก่อนบันทึก
    const hashedPassword = await argon2.hash(password);
    console.log("Hashed password being saved:", hashedPassword);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName,          // เพิ่ม Full Name
      phoneNumber,       // เพิ่ม Phone Number
      address            // เพิ่ม Address
    });

    await newUser.save();
    console.log("User registered successfully:", username);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Login a user
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    console.log("Input Password:", password);
    console.log("Stored Hashed Password:", user.password);

    const isMatch = await argon2.verify(user.password, password);
    console.log("Is password matching:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user info
exports.getUserInfo = async (req, res) => {
  try {
    const user = req.user;
    console.log("Fetching user info:", user);
    res.json({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      address: user.address,
    });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ message: 'Failed to fetch user info' });
  }
};

