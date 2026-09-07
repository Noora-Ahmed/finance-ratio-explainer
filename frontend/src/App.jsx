import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  const [ratioName, setRatioName] = useState('');
  const [ratioValue, setRatioValue] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    
    try {
      const response = await fetch('https://finance-ratio-explainer.onrender.com/api/explain-ratio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratioName, ratioValue })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data.explanation);
      } else {
        setResult(data.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error(err);
      setResult('Error connecting to backend server. Make sure it is running and CORS is enabled!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>📊 Finance Ratio Explainer</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontWeight: '600' }}>Ratio Name</label>
          <input 
            type="text" 
            placeholder="e.g., Debt-to-Equity, Current Ratio" 
            value={ratioName} 
            onChange={(e) => setRatioName(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ fontWeight: '600' }}>Ratio Value</label>
          <input 
            type="text" 
            placeholder="e.g., 2.5, 1.2" 
            value={ratioValue} 
            onChange={(e) => setRatioValue(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'Processing...' : 'Generate Explanation'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '4px', borderLeft: '5px solid #0070f3' }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Recruiter-Ready Explanation:</h3>
          <p style={{ margin: 0, lineHeight: '1.5', color: '#333' }}>{result}</p>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
