const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();

// ✅ Explicit CORS setup: allow your Vercel frontend domain
app.use(cors({
  origin: ['https://finance-ratio-explainer.vercel.app'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 🚀 FIXED: Support both a single connection string (Aiven Cloud) and separate variables (Localhost)
let db;
if (process.env.DATABASE_URL) {
    db = mysql.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
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

    // ✅ Try exact match first
    db.query(
        'SELECT mock_text FROM mock_explanations WHERE ratio_name = ? AND ratio_value = ?',
        [ratioName, ratioValue],
        (err, results) => {
            if (err) {
                console.error('❌ Query failed:', err.message);
                return res.status(500).json({ error: "Database query error" });
            }

            if (results.length > 0) {
                return res.json({
                    ratioName,
                    ratioValue,
                    explanation: `[Database Match] ${results[0].mock_text} (Current input value: ${ratioValue})`
                });
            }

            // ✅ If no exact match, generate dynamic explanation
            let explanation;
            const numericValue = parseFloat(ratioValue);

            if (ratioName.toLowerCase() === 'current ratio') {
                if (numericValue < 1) {
                    explanation = `A current ratio of ${ratioValue} suggests liquidity risk — the company may struggle to cover short-term liabilities.`;
                } else if (numericValue >= 1 && numericValue < 2) {
                    explanation = `A current ratio of ${ratioValue} indicates moderate liquidity, with assets slightly exceeding liabilities.`;
                } else {
                    explanation = `A current ratio of ${ratioValue} suggests strong liquidity — the company has ample short-term assets to cover liabilities.`;
                }
            } else if (ratioName.toLowerCase() === 'debt-to-equity') {
                if (numericValue < 1) {
                    explanation = `A debt-to-equity ratio of ${ratioValue} shows conservative financing, with equity outweighing debt.`;
                } else if (numericValue >= 1 && numericValue <= 2) {
                    explanation = `A debt-to-equity ratio of ${ratioValue} reflects balanced financing, with moderate reliance on debt.`;
                } else {
                    explanation = `A debt-to-equity ratio of ${ratioValue} indicates heavy reliance on debt, which may concern investors.`;
                }
            } else {
                explanation = `[Fallback] A ${ratioName} ratio of ${ratioValue} indicates standard operational threshold performance. Review peer benchmarks.`;
            }

            res.json({ ratioName, ratioValue, explanation });
        }
    );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backbone server running on port ${PORT}`));
