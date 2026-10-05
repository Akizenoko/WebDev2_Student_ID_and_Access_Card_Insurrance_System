import React, { useState } from 'react';
import { api } from '../services/api';
import wmsulogo from '../assets/wmsulogo.png';

function SignInPage({ onLoginSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    student_number: '',
    program: 'BS Computer Science',
    year_level: '1st Year',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const user = await api.register({
        email: formData.email,
        password: formData.password,
        student_number: formData.student_number,
        first_name: formData.first_name,
        last_name: formData.last_name,
        program: formData.program,
        year_level: formData.year_level,
      });
      setLoading(false);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Registration failed');
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
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: 'white',
          padding: '3px',
          boxShadow: '0 0 25px rgba(194, 47, 47, 0.5)',
          marginBottom: '12px'
        }}>
          <img src={wmsulogo} alt="WMSU Logo" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.04em', margin: 0, color: '#ffffff' }}>
          WESTERN MINDANAO STATE UNIVERSITY
        </h1>
        <p style={{ margin: '4px 0 0 0', color: '#f87171', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Student Account Registration & Portal Sign In
        </p>
      </div>

      {/* Main Form Card */}
      <div style={{
        width: '100%',
        maxWidth: '540px',
        background: '#232225',
        borderRadius: '20px',
        border: '1px solid #3d3b3f',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgb(194, 47, 47) 0%, rgb(130, 20, 20) 100%)',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
              <i className="fa-solid fa-user-plus" style={{ marginRight: '8px' }}></i>
              Create Student Account
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
              Register your credentials to start your ID issuance process
            </p>
          </div>
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(0,0,0,0.25)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 600
          }}>
            Official
          </span>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
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

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  className="form-input"
                  placeholder="e.g. Juan"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  className="form-input"
                  placeholder="e.g. Dela Cruz"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Student ID Number *</label>
                <input
                  type="text"
                  name="student_number"
                  className="form-input"
                  placeholder="2026-00123"
                  value={formData.student_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Year Level</label>
                <select
                  name="year_level"
                  className="form-select"
                  value={formData.year_level}
                  onChange={handleChange}
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduate / Post-Grad">Graduate / Post-Grad</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Degree Program</label>
              <select
                name="program"
                className="form-select"
                value={formData.program}
                onChange={handleChange}
              >
                <option value="BS Computer Science">BS Computer Science</option>
                <option value="BS Information Technology">BS Information Technology</option>
                <option value="BS Nursing">BS Nursing</option>
                <option value="BS Civil Engineering">BS Civil Engineering</option>
                <option value="BS Secondary Education">BS Secondary Education</option>
                <option value="BS Criminology">BS Criminology</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">WMSU Institutional Email *</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="student.name@wmsu.edu.ph"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirm_password"
                  className="form-input"
                  placeholder="Confirm password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '10px', height: '46px', fontSize: '1rem' }}
            >
              <i className="fa-solid fa-user-plus"></i>
              {loading ? 'Creating Account...' : 'Complete Registration & Sign In'}
            </button>
          </form>

          {/* Switch back to Log In */}
          <div style={{
            textAlign: 'center',
            paddingTop: '14px',
            borderTop: '1px solid #333235',
            fontSize: '0.88rem',
            color: '#9ca3af'
          }}>
            Already registered with an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#f87171',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Log In here
            </button>
          </div>

        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
        Western Mindanao State University &bull; Student ID and Access Card Issuance
      </div>
    </div>
  );
}

export default SignInPage;
