const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();

// ✅ Explicit CORS setup: allow your Vercel frontend domain
app.use(cors({
  origin: ['https://finance-ratio-explainer.vercel.app'], // frontend domain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 🚀 FIXED: Support both a single connection string (Aiven Cloud) and separate variables (Localhost)
let db;
if (process.env.DATABASE_URL) {
    db = mysql.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // ✅ Fix for Render/Aiven SSL
    });
} else {
    db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
}

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL Connection Failed: ' + err.message);
    } else {
        console.log('📂 Connected to MySQL database successfully.');
    }
});

app.post('/api/explain-ratio', (req, res) => {
    const { ratioName, ratioValue } = req.body;
    
    if (!ratioName || !ratioValue) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Query by both ratio_name and ratio_value
    db.query(
        'SELECT mock_text FROM mock_explanations WHERE ratio_name = ? AND ratio_value = ?',
        [ratioName, ratioValue],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: "Database query error" });
            }

            if (results.length > 0) {
                res.json({
                    ratioName,
                    ratioValue,
                    explanation: `[Database Match] ${results[0].mock_text} (Current input value: ${ratioValue})`
                });
            } else {
                res.json({
                    ratioName,
                    ratioValue,
                    explanation: `[Fallback] A ${ratioName} ratio of ${ratioValue} indicates standard operational threshold performance. Review peer benchmarks.`
                });
            }
        }
    );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backbone server running on port ${PORT}`));
