const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    
    // Check if user already exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = await req.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        dietarySettings: { create: {} },
        exerciseSettings: { create: {} },
        notificationSettings: { create: {} },
        preferences: { create: {} }
      }
    });
    
    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return token and user data (without password)
    const { password: _, ...userData } = user;
    res.status(201).json({ user: userData, token });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await req.prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return token and user data (without password)
    const { password: _, ...userData } = user;
    res.status(200).json({ user: userData, token });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
