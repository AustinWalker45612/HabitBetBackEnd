require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const authenticate = require('./authMiddleware');

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  console.log('userData to add: ', req.body);

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    // 👇 Add these two lines right after
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Creating user with data:', { username, email, password: hashedPassword });
    const newUser = await prisma.user.create({
        data: { username, email, password: hashedPassword },
      });
      
    // 👇 Add these two lines right after
    console.log('👉 userId value:', newUser.id);
    console.log('👉 userId type:', typeof newUser.id);
      

    console.log('New user created:', newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Structured habit tree
// Structured habit tree
app.get('/api/habits/tree', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const tree = await prisma.habitNode.findMany({
      orderBy: [{ tier: 'asc' }, { order: 'asc' }]
    });

    const userProgress = await prisma.habitProgress.findMany({
      where: { userId }
    });

    const result = tree.map((node) => {
      const progress = userProgress.find((p) => p.habitId === node.id);
      return {
        id: node.id,
        title: node.title,
        tier: node.tier,
        order: node.order,
        xpValue: node.xpValue,
        status: progress?.status || 'locked',
        completions: progress?.completions || 0,
        lastCompleted: progress?.lastCompleted || null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Failed to load habit tree:', err);
    res.status(500).json({ error: 'Could not load habit tree' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
