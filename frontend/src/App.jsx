import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  // Dynamic Environment Base URL Configuration mapped to your live Render backend
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://finance-ratio-explainer.onrender.com';

  // Ratio Inputs & Outputs State
  const [ratioName, setRatioName] = useState('');
  const [ratioValue, setRatioValue] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // Day 3 Authentication States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // Day 3 Saved History State
  const [history, setHistory] = useState([]);

  // Fetch History from Backend Database
  const fetchHistory = async () => {
    if (!token) return;
    try {
      // FIXED: Ensuring proper curly braces syntax inside the template literal string path
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };
  // Automatically fetch history data on login state changes
  useEffect(() => {
    fetchHistory();
  }, [token]);

  // Day 2 Live AI Pipeline & Day 3 Saved Action Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Day 4 Input Constraint Check
    if (ratioName.length > 50 || ratioValue.length > 20) {
      setResult('⚠️ Input limits exceeded. Please keep the ratio name under 50 characters and the value under 20 characters.');
      return;
    }

    setLoading(true);
    setResult('');
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      // FIXED: Semicolon added at the end of this assignment line to satisfy the compiler
      if (token) { headers['Authorization'] = `Bearer ${token}`; }

      const response = await fetch(`${API_BASE_URL}/api/explain`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ ratioName, ratioValue })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data.explanation);
        fetchHistory(); // Sync sidepanel timeline instantly
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
 // Day 3 User Security Identity Endpoint Client
 const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMessage('');
    const endpoint = isSignUp ? 'signup' : 'login';

    try {
      // FIXED: Ensuring proper curly braces syntax inside the template literal string path
      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      if (isSignUp) {
        setAuthMessage('Account created! You can now log in.');
        setIsSignUp(false);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', data.email);
        setToken(data.token);
        setUserEmail(data.email);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setAuthMessage(err.message);
    }
  };

  // Clean Session Workspace Reset
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken('');
    setUserEmail('');
    setHistory([]);
  };

  return (
    <div style={{ display: 'flex', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      
      {/* Left Workspace Panel */}
      <div style={{ flex: 1, padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Core Workspace Header & Landing Hero */}
        <div style={{ marginBottom: '35px', paddingBottom: '20px', borderBottom: '1px solid #eaeaea' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', letterSpacing: '-0.5px', margin: 0 }}>
              Finance Ratio Explainer
            </h1>
            {token && (
              <button onClick={handleLogout} style={{ padding: '6px 12px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                Log Out
              </button>
            )}
          </div>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.4', margin: 0 }}>
            Stop reciting raw formulas. Turn complex corporate financial metrics into plain, recruiter-ready interview answers instantly.
          </p>
        </div>

        {token && (
          <p style={{ marginTop: '-20px', marginBottom: '20px', fontSize: '14px', color: '#555' }}>
            Logged in as: <strong>{userEmail}</strong>
          </p>
        )}
        
        {/* Metric Form Entry */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          <div>
            <label style={{ fontWeight: '600' }}>Ratio Name</label>
            <input 
              type="text" 
              placeholder="e.g., Debt-to-Equity, Current Ratio" 
              value={ratioName} 
              onChange={(e) => setRatioName(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
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
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '12px', 
              background: loading ? '#66a3ff' : '#0070f3', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            {loading ? 'Processing...' : 'Generate Explanation'}
          </button>
        </form>

        {/* Live Streaming Prompt Target Container */}
        {result && (
          <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #eee', borderLeft: '5px solid #0070f3' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Recruiter-Ready Explanation:</h3>
            <p style={{ margin: 0, lineHeight: '1.5', color: '#333' }}>{result}</p>
          </div>
        )}

        {/* Gateway Security Authorization Widget */}
        {!token && (
          <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{isSignUp ? 'Create a Student Account' : 'Log In to Save History'}</h3>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <button type="submit" style={{ padding: '10px', background: '#52c41a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isSignUp ? 'Register Account' : 'Log In'}
              </button>
            </form>
            {authMessage && <p style={{ color: '#52c41a', margin: '10px 0 0 0', fontSize: '14px' }}>{authMessage}</p>}
            <button onClick={() => { setIsSignUp(!isSignUp); setAuthMessage(''); }} style={{ background: 'none', border: 'none', color: '#0070f3', textDecoration: 'underline', marginTop: '12px', cursor: 'pointer', padding: 0 }}>
              {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </div>
        )}
      </div>


      {/* Right-Side Dashboard User Archive Panel */}
      {token && (
        <div style={{ width: '300px', backgroundColor: '#fff', borderLeft: '1px solid #eee', padding: '20px', boxSizing: 'border-box', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, paddingBottom: '10px', borderBottom: '1px solid #eee', fontSize: '18px' }}>History</h3>
          {history.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '14px' }}>Your saved explanations will appear here.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '10px', backgroundColor: '#fafafa' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0070f3' }}>{item.ratio_name}: {item.ratio_value}</div>
                <div style={{ fontSize: '13px', color: '#555', marginTop: '5px', lineHeight: '1.4' }}>{item.generated_explanation}</div>
              </div>
        );
    })
  )}
</div>
) : (
<div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard archive...</div>
)}

<footer className="app-footer">
<p>&copy; 2026 Finance Ratio Explainer. Built with ❤️ by <span>Mariyam Noora Ahmed</span></p>
</footer>

</div>

// Target entry mount
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);