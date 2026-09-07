import express from 'express';
import mysql from 'mysql2/promise';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 5000;

// Configured CORS to cleanly allow your specific Vercel production frontend
app.use(cors());
app.use(express.json());

// 1. Database Connection Pool Setup (Auto-switches for production vs local)
const db = process.env.DATABASE_URL 
  ? mysql.createPool(process.env.DATABASE_URL)
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'finance_explainer_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

// 2. Initialize Gemini Client
const ai = new GoogleGenAI();

// 3. Day 3: Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Safe extraction safeguard
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.userId = user.userId;
    next();
  });
};

// ==========================================
// ROUTES
// ==========================================

// Auth: Sign Up Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, hashedPassword]
    );

    return res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Auth: Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ error: 'Invalid email or password' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, email: user.email });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Core Day 2 Feature: Generate and Save Explanation
app.post('/api/explain', async (req, res) => {
  try {
    const { ratioName, ratioValue } = req.body;
    
    // Day 4 Safe Split Protection: Handles missing authorization headers cleanly
    const authHeader = req.headers['authorization'];
    let loggedInUserId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          loggedInUserId = decoded.userId;
        } catch (err) {
          // Suppress invalid tokens silently for anonymous user flexibility
        }
      }
    }

    if (!ratioName || !ratioValue) {
      return res.status(400).json({ error: 'Please provide both ratio name and value.' });
    }

  // Call Gemini Live API
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash', // UPDATED VERSION FOR NEW GOOGLE ACCOUNTS
    contents: `You are a corporate finance recruiter interviewing a final-year finance student. 
    Explain what a "${ratioName}" of ${ratioValue} means for a company's financial health. 
    Provide a highly concise, 2-sentence explanation that the student can easily state during an interview.`,
  });

    const explanation = response.text;

    // Day 3 Trace: Save query to history if user is logged in
    if (loggedInUserId) {
      await db.query(
        'INSERT INTO explanations (user_id, ratio_name, ratio_value, generated_explanation) VALUES (?, ?, ?, ?)',
        [loggedInUserId, ratioName, ratioValue, explanation]
      );
    }

    return res.json({ explanation });

  } catch (error) {
    console.error('Gemini/Database Error:', error);
    return res.status(500).json({ error: 'Failed to complete transaction.' });
  }
});

// Day 3 Feature: Retrieve User History
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, ratio_name, ratio_value, generated_explanation, created_at FROM explanations WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    return res.json(rows);
  } catch (error) {
    console.error('History fetch error:', error);
    return res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server successfully active on port ${port}`);
});