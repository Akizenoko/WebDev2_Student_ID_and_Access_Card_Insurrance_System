import { useState } from 'react';
import { api } from '../services/api';
import wmsulogo from '../assets/wmsulogo.png';

function LoginPage({ onLoginSuccess, onSwitchToSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const user = await api.login(email, password);
      setLoading(false);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 20%, #2b1717 0%, rgb(24, 23, 25) 75%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 20px',
      color: '#ffffff'
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '28px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '50%',
          background: 'white',
          padding: '3px',
          boxShadow: '0 0 25px rgba(194, 47, 47, 0.5)',
          marginBottom: '14px'
        }}>
          <img src={wmsulogo} alt="WMSU Logo" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.04em', margin: 0, color: '#ffffff' }}>
          WESTERN MINDANAO STATE UNIVERSITY
        </h1>
        <p style={{ margin: '6px 0 0 0', color: '#f87171', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Student ID & Access Card Issuance Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#232225',
        borderRadius: '20px',
        border: '1px solid #3d3b3f',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgb(194, 47, 47) 0%, rgb(130, 20, 20) 100%)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
              <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '8px' }}></i>
              Account Log In
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
              Sign in to manage and track your university cards
            </p>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. your.email@gmail.com or @wmsu.edu.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '6px', height: '46px', fontSize: '1rem' }}
            >
              <i className="fa-solid fa-arrow-right-to-bracket"></i>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Switch to Sign In / Sign Up */}
          <div style={{
            textAlign: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #333235',
            fontSize: '0.88rem',
            color: '#9ca3af'
          }}>
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Sign In / Register here
            </button>
          </div>

        </div>
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '24px', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
        WMSU ID & Access Card Management System &bull; Office of the Registrar
      </div>
    </div>
  );
}

export default LoginPage;
