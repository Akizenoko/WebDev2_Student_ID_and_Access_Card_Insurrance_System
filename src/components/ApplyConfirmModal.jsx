import React from 'react';

const TONES = {
  red: {
    header: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
    accent: '#f87171',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.25)',
    circle: 'rgba(239, 68, 68, 0.2)',
  },
  amber: {
    header: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
    accent: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.25)',
    circle: 'rgba(245, 158, 11, 0.2)',
  },
};

function ApplyConfirmModal({ isOpen, mode, application, card, onClose, onConfirm, onViewStatus, onReissue }) {
  if (!isOpen) return null;

  const config = {
    confirm: {
      tone: 'red', icon: 'fa-id-card', title: 'Apply for a New Student ID',
      heading: 'Ready to apply for your student ID?',
      text: 'You will be asked to fill out your details and upload a 2x2 formal photo. Please have them ready before continuing.',
    },
    rejected: {
      tone: 'red', icon: 'fa-id-card', title: 'Apply Again',
      heading: 'Your previous application was rejected',
      text: 'You may submit a new application. Please make sure your details and photo are correct this time.',
    },
    inProgress: {
      tone: 'amber', icon: 'fa-hourglass-half', title: 'Application Already Submitted',
      heading: 'You already have an application in progress',
      text: 'You cannot submit another New ID application while one is still being processed. You can track its progress instead.',
    },
    hasCard: {
      tone: 'amber', icon: 'fa-circle-check', title: 'ID Already Issued',
      heading: 'You already have a student ID',
      text: 'A new ID is not needed. If your card is lost or damaged, request a reissuance instead.',
    },
  }[mode];

  if (!config) return null;
  const t = TONES[config.tone];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', borderRadius: '16px', overflow: 'hidden' }}
      >
        <div className="modal-header" style={{ background: t.header, padding: '16px 20px' }}>
          <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
            <i className={`fa-solid ${config.icon}`} style={{ marginRight: '8px' }}></i>
            {config.title}
          </h3>
          <button className="modal-close-btn" onClick={onClose} title="Close">&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '22px 24px', gap: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
            background: t.bg, border: `1px solid ${t.border}`, borderRadius: '12px'
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%', background: t.circle,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.accent, fontSize: '1.3rem', flexShrink: 0
            }}>
              <i className={`fa-solid ${config.icon}`}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginBottom: '4px' }}>
                {config.heading}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.4 }}>
                {config.text}
              </div>
            </div>
          </div>

          {mode === 'inProgress' && application && (
            <div style={{ background: '#1f1e21', border: '1px solid #38363a', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem', color: '#d1d5db' }}>
              <span style={{ color: '#9ca3af', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Current Application</span>
              <strong style={{ color: '#ffffff' }}>{application.application_no}</strong>
              <span style={{ marginLeft: '8px', textTransform: 'uppercase', fontSize: '0.75rem', color: t.accent }}>{application.status}</span>
              <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                Submitted {new Date(application.submitted_at).toLocaleDateString()}
              </div>
            </div>
          )}

          {mode === 'hasCard' && card && (
            <div style={{ background: '#1f1e21', border: '1px solid #38363a', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem', color: '#d1d5db' }}>
              <span style={{ color: '#9ca3af', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase' }}>Your Card</span>
              <strong style={{ color: '#ffffff' }}>{card.card_number}</strong>
              <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                Valid until {card.valid_until}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '14px 20px', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '8px 18px', fontSize: '0.88rem' }}>
            {mode === 'confirm' || mode === 'rejected' ? 'Cancel' : 'Close'}
          </button>

          {(mode === 'confirm' || mode === 'rejected') && (
            <button type="button" className="btn-primary" onClick={onConfirm}>
              <i className="fa-solid fa-arrow-right" style={{ marginRight: '6px' }}></i>
              Continue
            </button>
          )}
          {mode === 'inProgress' && (
            <button type="button" className="btn-primary" onClick={() => onViewStatus(application)}>
              <i className="fa-solid fa-timeline" style={{ marginRight: '6px' }}></i>
              View Status
            </button>
          )}
          {mode === 'hasCard' && (
            <button type="button" className="btn-primary" onClick={onReissue}>
              <i className="fa-solid fa-rotate-right" style={{ marginRight: '6px' }}></i>
              Request Reissuance
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplyConfirmModal;