import React from 'react';

function LogoutConfirmModal({ isOpen, onClose, onConfirm, currentUser }) {
  if (!isOpen) return null;

  const isStudent = currentUser?.role === 'student';
  const profile = currentUser?.profile;
  const displayName = isStudent
    ? [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(' ') || 'Student'
    : 'Admin Officer';

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', borderRadius: '16px', overflow: 'hidden' }}
      >
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
            padding: '16px 20px'
          }}
        >
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: '8px' }}></i>
            Confirm Log Out
          </h3>
          <button className="modal-close-btn" onClick={onClose} title="Cancel">
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '22px 24px', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px'
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
                fontSize: '1.3rem',
                flexShrink: 0
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginBottom: '4px' }}>
                Are you sure you want to log out?
              </div>
              <div style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.4 }}>
                You will be returned to the login screen and will need to sign in again to access the portal.
              </div>
            </div>
          </div>

          {currentUser && (
            <div
              style={{
                background: '#1f1e21',
                border: '1px solid #38363a',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.85rem',
                color: '#d1d5db',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Current Session</span>
                <strong style={{ color: '#ffffff' }}>{displayName}</strong>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '6px' }}>({currentUser.email})</span>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isStudent ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: isStudent ? '#60a5fa' : '#f87171',
                  border: isStudent ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)'
                }}
              >
                {currentUser.role}
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '14px 20px', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '8px 18px', fontSize: '0.88rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: 'rgb(194, 47, 47)',
              color: '#ffffff',
              border: '1px solid rgb(155, 3, 3)',
              borderRadius: '20px',
              padding: '8px 20px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s'
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutConfirmModal;
