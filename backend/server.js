import express from 'express';
import mysql from 'mysql2/promise';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Dynamic Pool Configuration Setup (Auto-switches between Local & Cloud TiDB parameters)
let poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'finance_explainer_db',
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: true } : false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host: dbUrl.hostname,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.replace('/', ''),
      port: dbUrl.port || 3306,
      ssl: { rejectUnauthorized: true }, 
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
  } catch (urlErr) {
    console.error('DATABASE_URL parsing failed, falling back to fields:', urlErr);
  }
}

const db = mysql.createPool(poolConfig);

// AUTOMATIC TABLE INITIALIZER: Sets up database structures automatically on empty instances
async function initializeDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS explanations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ratio_name VARCHAR(100) NOT NULL,
        ratio_value VARCHAR(50) NOT NULL,
        generated_explanation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('Database tables successfully verified.');
  } catch (err) {
    console.error('Database self-healing initialization failed:', err);
  }
}
initializeDatabase();

// 2. Initialize Gemini Client with Explicit Key Configuration
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Authentication Token Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
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
    await db.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hashedPassword]);
    return res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
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
    if (!users || users.length === 0) return res.status(400).json({ error: 'Invalid email or password' });

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
      const authHeader = req.headers['authorization'];
      let loggedInUserId = null;
  
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token && token !== 'null' && token !== 'undefined') {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            loggedInUserId = decoded.userId;
          } catch (err) {
            // Suppress expired tokens silently for anonymous state flexibility
          }
        }
      }
  
      if (!ratioName || !ratioValue) return res.status(400).json({ error: 'Provide name and value.' });
  
     // CORRECTED: Uses the accurate client generation syntax matching your library import
    const response = await ai.models.generateContent({
        model: 'gemini-3.0-flash',
        contents: `You are a corporate finance recruiter interviewing a student. Explain what a "${ratioName}" of ${ratioValue} means for a company's health. Keep it to 2 sentences max.`,
      });
  
      const explanation = response.text;
  
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

app.listen(port, () => {
  console.log(`Server successfully active on port ${port}`);
});