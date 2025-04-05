require('dotenv').config(); // Load environment variables
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client'); // Import Prisma Client
const jwt = require('jsonwebtoken');
const authenticate = require('./authMiddleware');

const prisma = new PrismaClient(); // Initialize Prisma Client
const app = express();

// Middleware to parse JSON and form data
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Serve static files (e.g., uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple test route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Route: Register a new user
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in DB
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
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

// Route: Login a user and return JWT
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: 'User does not exist' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // ✅ Return it in the response
    return res.status(200).json({
      message: 'Login successful',
      token, // 🔥 this is what your frontend needs
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ✅ Protected route: Get user's habits
app.get('/api/habits', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // From JWT
    const habits = await prisma.habit.findMany({
      where: { userId }
    });

    res.status(200).json(habits);
  } catch (err) {
    console.error("Error fetching habits:", err);
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

// GET user's habit tree
app.get('/api/habits/tree', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const tree = await prisma.habitNode.findMany({
      orderBy: [{ tier: 'asc' }, { order: 'asc' }],
      include: {
        habitLogs: {
          where: { userId },
        },
      },
    });

    const userProgress = await prisma.habitProgress.findMany({
      where: { userId },
    });

    const result = tree.map(node => {
      const progress = userProgress.find(p => p.habitId === node.id);
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


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


