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

// 🚀 FIXED: Proper MySQL2 connection handling
let db;
if (process.env.DATABASE_URL) {
    // Use full connection string directly
    db = mysql.createConnection(process.env.DATABASE_URL + '?ssl=true');
} else {
    db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
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
    let { ratioName, ratioValue } = req.body;
    
    if (!ratioName || !ratioValue) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Normalize inputs
    ratioName = ratioName.toLowerCase().trim();
    ratioValue = ratioValue.toString().trim();

    // ✅ Try exact match first (case-insensitive on ratio_name)
    db.query(
        'SELECT mock_text FROM mock_explanations WHERE LOWER(ratio_name) = ? AND ratio_value = ?',
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

            // ✅ Dynamic explanation logic
            let explanation;
            const numericValue = parseFloat(ratioValue);

            if (ratioName === 'current ratio') {
                if (numericValue < 1) {
                    explanation = `A current ratio of ${ratioValue} suggests liquidity risk — the company may struggle to cover short-term liabilities.`;
                } else if (numericValue >= 1 && numericValue < 2) {
                    explanation = `A current ratio of ${ratioValue} indicates moderate liquidity, with assets slightly exceeding liabilities.`;
                } else {
                    explanation = `A current ratio of ${ratioValue} suggests strong liquidity — the company has ample short-term assets to cover liabilities.`;
                }
            } else if (ratioName === 'debt-to-equity') {
                if (numericValue < 1) {
                    explanation = `A debt-to-equity ratio of ${ratioValue} shows conservative financing, with equity outweighing debt.`;
                } else if (numericValue >= 1 && numericValue <= 2) {
                    explanation = `A debt-to-equity ratio of ${ratioValue} reflects balanced financing, with moderate reliance on debt.`;
                } else {
                    explanation = `A debt-to-equity ratio of ${ratioValue} indicates heavy reliance on debt, which may concern investors.`;
                }
            } else if (ratioName === 'quick ratio') {
                if (numericValue < 1) {
                    explanation = `A quick ratio of ${ratioValue} suggests potential liquidity issues — the company may not cover liabilities without selling inventory.`;
                } else {
                    explanation = `A quick ratio of ${ratioValue} indicates the company can cover short-term liabilities using liquid assets.`;
                }
            } else if (ratioName === 'return on assets') {
                explanation = `A return on assets of ${ratioValue} shows how efficiently the company uses assets to generate profit. Higher values indicate stronger performance.`;
            } else if (ratioName === 'gross margin') {
                explanation = `A gross margin of ${ratioValue} shows how much profit the company retains after covering direct production costs. Higher margins indicate stronger pricing power or cost control.`;
            } else if (ratioName === 'return on equity') {
                explanation = `A return on equity of ${ratioValue} reflects how effectively the company generates profit from shareholder investment. Higher values suggest strong management performance.`;
            } else if (ratioName === 'net profit margin') {
                explanation = `A net profit margin of ${ratioValue} indicates how much of each dollar of revenue is converted into profit. Higher margins show better overall efficiency.`;
            } else {
                explanation = `[Fallback] A ${ratioName} ratio of ${ratioValue} indicates standard operational threshold performance. Review peer benchmarks.`;
            }

            res.json({ ratioName, ratioValue, explanation });
        }
    );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backbone server running on port ${PORT}`));
