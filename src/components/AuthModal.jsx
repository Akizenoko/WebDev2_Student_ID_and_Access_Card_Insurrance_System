import React, { useState } from 'react';
import { api } from '../services/api';

function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    student_number: '',
    first_name: '',
    last_name: '',
    program: 'BS Computer Science',
    year_level: '1st Year',
  });

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
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const user = await api.register(registerData);
      setLoading(false);
      onLoginSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-lock" style={{ marginRight: '8px' }}></i>
            {mode === 'login' ? 'User Authentication' : 'Student Account Registration'}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">

          {error && (
            <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. student@wmsu.edu.ph"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
                <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '6px' }}></i>
                {loading ? 'Logging in...' : 'Sign In'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af' }}>
                New student?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setMode('register')}
                >
                  Create an account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={registerData.first_name}
                    onChange={e => setRegisterData({ ...registerData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={registerData.last_name}
                    onChange={e => setRegisterData({ ...registerData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Student Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="2026-XXXXX"
                    value={registerData.student_number}
                    onChange={e => setRegisterData({ ...registerData, student_number: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Year Level</label>
                  <select
                    className="form-select"
                    value={registerData.year_level}
                    onChange={e => setRegisterData({ ...registerData, year_level: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Degree Program</label>
                <select
                  className="form-select"
                  value={registerData.program}
                  onChange={e => setRegisterData({ ...registerData, program: e.target.value })}
                >
                  <option value="BS Computer Science">BS Computer Science</option>
                  <option value="BS Information Technology">BS Information Technology</option>
                  <option value="BS Nursing">BS Nursing</option>
                  <option value="BS Civil Engineering">BS Civil Engineering</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="student@wmsu.edu.ph"
                  value={registerData.email}
                  onChange={e => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Create a password"
                  value={registerData.password}
                  onChange={e => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
                <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i>
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af' }}>
                Already registered?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setMode('login')}
                >
                  Sign In here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
