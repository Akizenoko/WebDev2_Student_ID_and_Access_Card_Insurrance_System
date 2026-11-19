import { useState } from 'react';
import { api } from '../services/api';

function OtpStep({ challenge, maskedEmail, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code'); return; }
    try {
      setLoading(true);
      const user = await api.verifyOtp(challenge, code);
      onVerified(user);
    } catch (err) {
      setLoading(false);
      if (err.status === 401 && err.message === 'Incorrect code') {
        setError(err.message);
        setCode('');
      } else {
        // expired challenge, too many attempts, deactivated: start over
        onBack(err.message || 'Verification failed. Please log in again.');
      }
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.5 }}>
        We sent a 6-digit code to <strong style={{ color: '#fff' }}>{maskedEmail}</strong>. It expires in 5 minutes.
      </div>
      {error && (
        <div style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.15)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
      <input
        className="form-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        autoFocus
        style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.4rem' }}
      />
      <button type="submit" className="btn-primary" disabled={loading} style={{ height: '46px' }}>
        <i className="fa-solid fa-shield-halved"></i>
        {loading ? 'Verifying...' : 'Verify & Continue'}
      </button>
      <button type="button" className="btn-secondary" onClick={() => onBack()} disabled={loading}>
        Back (log in again for a new code)
      </button>
    </form>
  );
}

export default OtpStep;