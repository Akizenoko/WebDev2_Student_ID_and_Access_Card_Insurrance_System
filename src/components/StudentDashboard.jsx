import { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusStepper from './StatusStepper';
import ApplyConfirmModal from './ApplyConfirmModal';
import { isCardValidationOver } from '../utils/status';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

function StudentDashboard({ currentUser, onOpenApply, onOpenReissue, onSelectApp, onViewCard, onOpenStatusModal }) {
  const studentProfile = currentUser?.profile;
  const [applications, setApplications] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const studentId = studentProfile?.id || 1;
      const [appsData, cardsData] = await Promise.all([
        api.getApplications({ student_id: studentId }),
        api.getCards({ student_id: studentId }),
      ]);
      setApplications(Array.isArray(appsData) ? appsData : []);
      setCards(Array.isArray(cardsData) ? cardsData : []);
    } catch (err) {
      console.error('Failed to load student data', err);
      setApplications([]);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        setLoading(true);
        const studentId = studentProfile?.id || 1;
        const [appsData, cardsData] = await Promise.all([
          api.getApplications({ student_id: studentId }),
          api.getCards({ student_id: studentId }),
        ]);
        if (active) {
          setApplications(Array.isArray(appsData) ? appsData : []);
          const safeCards = Array.isArray(cardsData) ? cardsData : [];
          setCards(safeCards);
          if (safeCards.length > 0 && !selectedCardId) {
            const firstActive = safeCards.find(c => c.status === 'active') || safeCards[0];
            setSelectedCardId(firstActive.id);
          }
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load student data', err);
          setApplications([]);
          setCards([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => { active = false; };
  }, [studentProfile, selectedCardId]);

  const [applyCheck, setApplyCheck] = useState(null);

  const newIdApps = applications.filter(a => a.type === 'New ID');
  const inProgress = newIdApps.find(a => ['submitted', 'processing', 'ready'].includes(a.status));
  const issuedCard = cards.find(c => c.status === 'active');
  const wasRejected = newIdApps.length > 0 && newIdApps.every(a => a.status === 'rejected');
  const hasAppliedNewId = newIdApps.some(a => a.status !== 'rejected') || cards.length > 0;

  const activeCard = Array.isArray(cards)
    ? (cards.find(c => c.id === selectedCardId) || cards.find(c => c && c.status === 'active') || cards[0] || null)
    : null;
  const isCardExpired = isCardValidationOver(activeCard);

  const hasPendingAccessCard = applications.some(
    a => a.type === 'Access Card' && ['submitted', 'processing', 'ready'].includes(a.status)
  );
  const hasActiveAccessCard = cards.some(
    c => c.status === 'active' && (c.card_type === 'Access Card' || c.application?.type === 'Access Card')
  );
  const canApplyAccessCard = !hasPendingAccessCard && !hasActiveAccessCard;

  const handleApplyClick = () => {
    if (loading) return;

    if (hasAppliedNewId) {
      if (isCardExpired) {
        onOpenApply?.('Renewal');
      } else if (canApplyAccessCard) {
        onOpenApply?.('Access Card');
      } else {
        onOpenReissue?.();
      }
      return;
    }

    if (inProgress) {
      setApplyCheck({ mode: 'inProgress', application: inProgress });
    } else if (issuedCard) {
      if (isCardValidationOver(issuedCard)) {
        setApplyCheck({ mode: 'hasExpiredCard', card: issuedCard });
      } else {
        setApplyCheck({ mode: 'hasCard', card: issuedCard });
      }
    } else if (wasRejected) {
      setApplyCheck({ mode: 'rejected' });
    } else {
      setApplyCheck({ mode: 'confirm' });
    }
  };

  // Filtered applications
  const filteredApps = applications.filter(app => {
    if (statusFilter === 'in_progress') {
      if (!['submitted', 'processing', 'ready'].includes(app.status)) return false;
    } else if (statusFilter === 'released') {
      if (app.status !== 'released') return false;
    } else if (statusFilter === 'rejected') {
      if (app.status !== 'rejected') return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const appNo = (app.application_no || '').toLowerCase();
      const type = (app.type || '').toLowerCase();
      return appNo.includes(q) || type.includes(q);
    }
    return true;
  });

  return (
    <div style={{ padding: '0 50px 60px 50px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Top Two Summary Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Active University Card Box */}
        <div style={{
          background: '#232225',
          borderRadius: '16px',
          border: '1px solid #3d3b3f',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem' }}>
                  <i className="fa-solid fa-id-card" style={{ marginRight: '8px', color: '#f87171' }}></i>
                  Active University Card
                </h3>
                {activeCard && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: activeCard.card_type === 'Access Card' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: activeCard.card_type === 'Access Card' ? '#38bdf8' : '#f87171'
                  }}>
                    {activeCard.card_type || 'Student ID'}
                  </span>
                )}
              </div>

              {activeCard && (
                <span
                  className={`status-pill status-${isCardExpired ? 'rejected' : (activeCard.status === 'active' ? 'released' : 'rejected')}`}
                  style={isCardExpired ? { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' } : {}}
                >
                  {isCardExpired ? 'Validation Over' : activeCard.status}
                </span>
              )}
            </div>

            {/* Multiple Cards selector if student has more than one card */}
            {cards.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {cards.map(c => {
                  const isAccess = c.card_type === 'Access Card' || c.application?.type === 'Access Card';
                  const isSelected = activeCard?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCardId(c.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid rgb(194, 47, 47)' : '1px solid #444',
                        background: isSelected ? 'rgba(194, 47, 47, 0.25)' : '#1a191c',
                        color: isSelected ? '#ffffff' : '#9ca3af',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {isAccess ? 'Access Card' : 'Student ID'} ({c.status})
                    </button>
                  );
                })}
              </div>
            )}

            {activeCard ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#d1d5db', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#9ca3af' }}>Card Number:</span>{' '}
                  <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{activeCard.card_number}</strong>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Issue Date:</span>{' '}
                  <span style={{ color: '#fff' }}>{formatDate(activeCard.issue_date)}</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Valid Until:</span>{' '}
                  <span style={{ color: isCardExpired ? '#f87171' : '#fff', fontWeight: isCardExpired ? 700 : 600 }}>
                    {formatDate(activeCard.valid_until)} {isCardExpired ? '(Validation Over)' : ''}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Owner:</span>{' '}
                  {studentProfile?.first_name} {studentProfile?.middle_name} {studentProfile?.last_name} ({studentProfile?.student_number})
                </div>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', padding: '16px 0' }}>
                You do not have an active ID card yet. Click below to apply for your official student ID or access card.
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {activeCard ? (
              <>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => onViewCard(activeCard)}
                >
                  <i className="fa-solid fa-eye" style={{ marginRight: '6px' }}></i>
                  View Digital ID Card
                </button>
                <button
                  type="button"
                  className={isCardExpired ? "btn-primary" : "btn-secondary"}
                  onClick={() => {
                    if (!isCardExpired) return;
                    onOpenApply?.('Renewal');
                  }}
                  disabled={!isCardExpired}
                  style={isCardExpired
                    ? { background: '#dc2626', color: '#fff', fontWeight: 'bold' }
                    : { opacity: 0.45, cursor: 'not-allowed' }
                  }
                  title={isCardExpired ? "Renew card now that validation is over" : "Card renewal is only available once the valid until date is over"}
                >
                  <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }}></i>
                  Renew Card {isCardExpired ? '(Validation Over)' : ''}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onOpenReissue?.('Lost physical ID card')}
                  style={{ color: '#fca5a5' }}
                >
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                  Report Lost / Replace
                </button>
              </>
            ) : inProgress ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onOpenStatusModal ? onOpenStatusModal(inProgress) : onSelectApp(inProgress)}
                >
                  <i className="fa-solid fa-timeline" style={{ marginRight: '6px' }}></i>
                  Track ID Status
                </button>
                {canApplyAccessCard && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => onOpenApply('Access Card')}
                  >
                    <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                    Apply Access Card
                  </button>
                )}
              </>
            ) : hasAppliedNewId ? (
              canApplyAccessCard ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onOpenApply('Access Card')}
                >
                  <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                  Apply Access Card
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onOpenReissue()}
                >
                  <i className="fa-solid fa-rotate-right" style={{ marginRight: '6px' }}></i>
                  Reissue Request
                </button>
              )
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={handleApplyClick}
              >
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                Apply for First ID
              </button>
            )}
          </div>
        </div>

        {/* Informational Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgb(155, 3, 3) 0%, rgb(99, 0, 0) 100%)',
          borderRadius: '16px',
          padding: '24px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem' }}>Streamlined ID Issuance</h3>
            <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.5 }}>
              Western Mindanao State University's centralized system eliminates long lines. Submit your details, upload your 2x2 photo, and track progress until pickup!
            </p>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ background: '#ffffff', color: '#111', fontWeight: 'bold' }}
              onClick={() => {
                if (isCardExpired) {
                  onOpenApply('Renewal');
                } else if (hasAppliedNewId) {
                  if (canApplyAccessCard) {
                    onOpenApply('Access Card');
                  } else {
                    onOpenReissue();
                  }
                } else {
                  handleApplyClick();
                }
              }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
              {isCardExpired ? 'Renew Expired Card' : (hasAppliedNewId ? (canApplyAccessCard ? 'Apply Access Card' : 'Reissue Card') : 'New Application')}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={!isCardExpired}
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderColor: 'rgba(255,255,255,0.4)',
                opacity: isCardExpired ? 1 : 0.45,
                cursor: isCardExpired ? 'pointer' : 'not-allowed'
              }}
              onClick={() => {
                if (!isCardExpired) return;
                onOpenApply('Renewal');
              }}
              title={isCardExpired ? "Renew card now that validation is over" : "Card renewal is only available once the valid until date is over"}
            >
              <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }}></i>
              Renew Card
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.4)' }}
              onClick={() => onOpenReissue()}
            >
              <i className="fa-solid fa-rotate-right" style={{ marginRight: '6px' }}></i>
              Reissue Request
            </button>
          </div>
        </div>

      </div>

      {/* Applications Tracking Section */}
      <div style={{
        background: '#232225',
        borderRadius: '16px',
        border: '1px solid #3d3b3f',
        padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem' }}>
              Your Applications & Tracking ({filteredApps.length})
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
              Follow your ID and Access card applications through each stage of the issuance lifecycle.
            </p>
          </div>
          <button type="button" className="btn-outline" onClick={loadData} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i>
            Refresh
          </button>
        </div>

        {/* Filter and Search Bar for Applications */}
        {applications.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1b1a1c',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #363438',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'all' ? '1px solid rgb(194, 47, 47)' : '1px solid #444',
                  background: statusFilter === 'all' ? 'rgb(194, 47, 47)' : '#252427',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All ({applications.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'in_progress' ? '1px solid #fbbf24' : '1px solid #444',
                  background: statusFilter === 'in_progress' ? 'rgba(251, 191, 36, 0.2)' : '#252427',
                  color: statusFilter === 'in_progress' ? '#fbbf24' : '#d1d5db',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('released')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'released' ? '1px solid #34d399' : '1px solid #444',
                  background: statusFilter === 'released' ? 'rgba(52, 211, 153, 0.2)' : '#252427',
                  color: statusFilter === 'released' ? '#34d399' : '#d1d5db',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Released
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: statusFilter === 'rejected' ? '1px solid #f87171' : '1px solid #444',
                  background: statusFilter === 'rejected' ? 'rgba(248, 113, 113, 0.2)' : '#252427',
                  color: statusFilter === 'rejected' ? '#f87171' : '#d1d5db',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Rejected
              </button>
            </div>

            <div style={{ minWidth: '220px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search application # or type..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading applications...</div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p style={{ fontSize: '1.05rem', color: '#e5e7eb', marginBottom: '8px' }}>No applications on file yet</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '18px' }}>Submit an ID or Access Card application to start tracking.</p>
            <button type="button" className="btn-primary" onClick={handleApplyClick}>
              <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
              Apply Now
            </button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            No applications found matching your search.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredApps.map(app => {
              return (
                <div
                  key={app.id}
                  style={{
                    background: '#1b1a1c',
                    borderRadius: '12px',
                    border: '1px solid #363438',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    transition: 'border-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => onSelectApp(app)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: app.type === 'Access Card' ? '#0284c7' : 'rgb(194, 47, 47)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold'
                      }}>
                        {app.type}
                      </span>
                      <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{app.application_no}</strong>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        Submitted {new Date(app.submitted_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-pill status-${app.status}`}>
                        {app.status}
                      </span>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                        onClick={(e) => { e.stopPropagation(); onOpenStatusModal ? onOpenStatusModal(app) : onSelectApp(app); }}
                      >
                        <i className="fa-solid fa-timeline" style={{ marginRight: '4px' }}></i>
                        Details & Track
                      </button>
                      {(app.status === 'released' || app.status === 'rejected') && (
                        <button
                          type="button"
                          title="Remove this finished application from tracking"
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            cursor: deletingId === app.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: deletingId === app.id ? 0.6 : 1,
                          }}
                          disabled={deletingId === app.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm(`Remove ${app.application_no} from your tracking history? This cannot be undone.`)) return;
                            setDeletingId(app.id);
                            try {
                              await api.deleteApplication(app.id);
                              setApplications(prev => prev.filter(a => a.id !== app.id));
                            } catch (err) {
                              alert(err.message || 'Failed to remove application');
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                          {deletingId === app.id ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registrar Note / Remark if present */}
                  {app.remarks && (
                    <div style={{
                      background: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.25)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      color: '#fef08a'
                    }}>
                      <i className="fa-solid fa-message" style={{ marginRight: '6px', color: '#fbbf24' }}></i>
                      <strong>Registrar Note:</strong> {app.remarks}
                    </div>
                  )}

                  {/* Status Circle Stepper */}
                  <div style={{
                    background: '#151416',
                    padding: '22px 24px 18px 24px',
                    borderRadius: '12px',
                    border: '1px solid #2d2c30'
                  }}>
                    <StatusStepper
                      currentStatus={app.status}
                      size="medium"
                      onStepClick={() => (onOpenStatusModal ? onOpenStatusModal(app) : onSelectApp(app))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ApplyConfirmModal
        isOpen={!!applyCheck}
        mode={applyCheck?.mode}
        application={applyCheck?.application}
        card={applyCheck?.card}
        onClose={() => setApplyCheck(null)}
        onConfirm={() => { setApplyCheck(null); onOpenApply(); }}
        onViewStatus={(app) => {
          setApplyCheck(null);
          onOpenStatusModal ? onOpenStatusModal(app) : onSelectApp(app);
        }}
        onReissue={() => { setApplyCheck(null); onOpenReissue(); }}
        onRenew={() => { setApplyCheck(null); onOpenApply('Renewal'); }}
      />

    </div>
  );
}

export default StudentDashboard;
