import React, { useState, useEffect } from 'react';
import Arle from '../assets/Arle.png';
import wmsulogo from '../assets/wmsulogo.png';
import { api } from '../services/api';

function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onOpenSwitchUser,
  onRequestLogout,
  onViewCard
}) {
  const [cards, setCards] = useState([]);
  const [loadingCard, setLoadingCard] = useState(false);

  const isStudent = currentUser?.role === 'student';
  const isAdmin = currentUser?.role === 'admin';
  const profile = currentUser?.profile;

  useEffect(() => {
    if (!isOpen || !isStudent || !profile) return;
    let isMounted = true;

    async function fetchCards() {
      try {
        setLoadingCard(true);
        const studentId = profile?.id || 1;
        const res = await api.getCards({ student_id: studentId });
        if (isMounted) {
          setCards(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        console.error('Failed to fetch card for profile modal', err);
        if (isMounted) setCards([]);
      } finally {
        if (isMounted) setLoadingCard(false);
      }
    }

    fetchCards();
    return () => {
      isMounted = false;
    };
  }, [isOpen, isStudent, profile]);

  if (!isOpen || !currentUser) return null;

  const activeCard = Array.isArray(cards)
    ? cards.find((c) => c && c.status === 'active') || cards[0] || null
    : null;

  const fullName = isStudent
    ? [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(' ') || 'Student User'
    : 'Administrator Officer';

  const idNumber = isStudent
    ? (profile?.student_number || '2025-01190')
    : (profile?.employee_no || 'EMP-2023-042');

  const idLabel = isStudent ? 'Student ID' : 'Employee ID';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', text: 'Active' };
      case 'lost':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171', text: 'Reported Lost' };
      case 'damaged':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', text: 'Damaged' };
      case 'expired':
        return { bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.3)', color: '#9ca3af', text: 'Expired' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.3)', color: '#9ca3af', text: status || 'Unknown' };
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-card-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-address-card" style={{ marginRight: '8px' }}></i>
            User Profile & Identification
          </h3>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ gap: '22px' }}>
          {/* Profile Hero Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1f1e21 0%, #29282b 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Ambient background logo watermark */}
            <img
              src={wmsulogo}
              alt=""
              style={{
                position: 'absolute',
                right: '-25px',
                bottom: '-25px',
                width: '160px',
                height: '160px',
                opacity: 0.08,
                pointerEvents: 'none'
              }}
            />

            {/* Profile Avatar with Border */}
            <div
              style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                border: '3px solid rgb(194, 47, 47)',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 4px 15px rgba(194, 47, 47, 0.35)',
                background: '#181719'
              }}
            >
              <img
                src={Arle}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Basic Info */}
            <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  {fullName}
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: isStudent ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isStudent ? '#60a5fa' : '#f87171',
                    border: isStudent ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <i className={isStudent ? 'fa-solid fa-graduation-cap' : 'fa-solid fa-shield-halved'} style={{ marginRight: '5px' }}></i>
                  {currentUser.role}
                </span>
              </div>

              <div style={{ fontSize: '0.88rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className="fa-solid fa-envelope" style={{ color: '#6b7280' }}></i>
                <span>{currentUser.email}</span>
              </div>

              {/* Prominent ID Badge Box */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(194, 47, 47, 0.15)',
                  border: '1px solid rgba(194, 47, 47, 0.35)',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
              >
                <i className="fa-solid fa-id-badge" style={{ color: '#f87171' }}></i>
                <span style={{ fontSize: '0.8rem', color: '#e5e7eb', fontWeight: 600 }}>{idLabel}:</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fca5a5', letterSpacing: '0.04em' }}>
                  {idNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#9ca3af',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-circle-info" style={{ color: 'rgb(194, 47, 47)' }}></i>
              Account & Credentials Information
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Field 1: User ID Number */}
              <div
                style={{
                  background: '#1e1d20',
                  border: '1px solid #373539',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}
              >
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>
                  {idLabel}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
                  {idNumber}
                </div>
              </div>

              {/* Field 2: Role / Department */}
              <div
                style={{
                  background: '#1e1d20',
                  border: '1px solid #373539',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}
              >
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>
                  {isStudent ? 'Academic Program' : 'Office / Department'}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
                  {isStudent
                    ? (profile?.program || 'BS Computer Science')
                    : (profile?.office || 'Office of the Registrar')}
                </div>
              </div>

              {/* Field 3: Year / Designation */}
              {isStudent && (
                <div
                  style={{
                    background: '#1e1d20',
                    border: '1px solid #373539',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>
                    Year Level
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
                    {profile?.year_level || '1st Year'}
                  </div>
                </div>
              )}

              {/* Field 4: Account Status */}
              <div
                style={{
                  background: '#1e1d20',
                  border: '1px solid #373539',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}
              >
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>
                  System Status
                </div>
                <div
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px'
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block'
                    }}
                  ></span>
                  Active Account
                </div>
              </div>
            </div>
          </div>

          {/* Student University ID Card Section */}
          {isStudent && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <h4
                  style={{
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#9ca3af',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-id-card" style={{ color: 'rgb(194, 47, 47)' }}></i>
                  Official WMSU Digital ID Card
                </h4>

                {activeCard && onViewCard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewCard(activeCard);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    View Card Modal <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                )}
              </div>

              {loadingCard ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                  Loading card record...
                </div>
              ) : activeCard ? (
                <div
                  style={{
                    background: '#1e1d20',
                    border: '1px solid #373539',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: 'rgba(194, 47, 47, 0.18)',
                        border: '1px solid rgba(194, 47, 47, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f87171',
                        fontSize: '1.2rem',
                        flexShrink: 0
                      }}
                    >
                      <i className="fa-solid fa-credit-card"></i>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                        {activeCard.card_number}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>
                        Valid Until: {activeCard.valid_until || '2029-08-15'} &bull; Issued: {activeCard.issue_date || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {(() => {
                      const badge = getStatusBadge(activeCard.status);
                      return (
                        <span
                          style={{
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}
                        >
                          {badge.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#1e1d20',
                    border: '1px dashed #444246',
                    borderRadius: '12px',
                    padding: '18px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '0.85rem'
                  }}
                >
                  <i className="fa-solid fa-id-card-clip" style={{ fontSize: '1.4rem', opacity: 0.5, marginBottom: '6px', display: 'block' }}></i>
                  No issued ID card record found for this profile yet.
                </div>
              )}
            </div>
          )}

          {/* Admin Role Privileges */}
          {isAdmin && (
            <div
              style={{
                background: '#1e1d20',
                border: '1px solid #373539',
                borderRadius: '12px',
                padding: '16px 20px'
              }}
            >
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600, marginBottom: '8px' }}>
                Administrative Privileges
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#d1d5db', lineHeight: 1.6 }}>
                <li>Review and process student ID issuance requests</li>
                <li>Manage lost and destroyed ID reissuance applications</li>
                <li>Digital ID card generation & validation</li>
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {onOpenSwitchUser && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  onClose();
                  onOpenSwitchUser();
                }}
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                title="Switch to another user account"
              >
                <i className="fa-solid fa-users" style={{ marginRight: '6px' }}></i>
                Switch User
              </button>
            )}

            {onRequestLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestLogout();
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s'
                }}
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                Log Out
              </button>
            )}
          </div>

          <button type="button" className="btn-primary" onClick={onClose} style={{ padding: '8px 20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
