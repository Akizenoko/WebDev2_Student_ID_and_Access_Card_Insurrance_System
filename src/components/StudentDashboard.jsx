import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusStepper from './StatusStepper';

function StudentDashboard({ currentUser, onOpenApply, onOpenReissue, onSelectApp, onViewCard, onOpenStatusModal }) {
  const studentProfile = currentUser?.profile;
  const [applications, setApplications] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const studentId = studentProfile?.id || 1;
      const [appsData, cardsData] = await Promise.all([
        api.getApplications({ student_id: studentId }),
        api.getCards({ student_id: studentId }),
      ]);
      setApplications(appsData);
      setCards(cardsData);
    } catch (err) {
      console.error('Failed to load student data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const activeCard = cards.find(c => c.status === 'active') || cards[0];


  return (
    <div style={{ padding: '0 50px 60px 50px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem' }}>
                <i className="fa-solid fa-id-card" style={{ marginRight: '8px', color: '#f87171' }}></i>
                Active University Card
              </h3>
              {activeCard && (
                <span className={`status-pill status-${activeCard.status === 'active' ? 'released' : 'rejected'}`}>
                  {activeCard.status}
                </span>
              )}
            </div>

            {activeCard ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#d1d5db', fontSize: '0.9rem' }}>
                <div><span style={{ color: '#9ca3af' }}>Card Number:</span> <strong style={{ color: '#fff' }}>{activeCard.card_number}</strong></div>
                <div><span style={{ color: '#9ca3af' }}>Issue Date:</span> {activeCard.issue_date}</div>
                <div><span style={{ color: '#9ca3af' }}>Valid Until:</span> {activeCard.valid_until}</div>
                <div><span style={{ color: '#9ca3af' }}>Owner:</span> {studentProfile?.first_name} {studentProfile?.last_name} ({studentProfile?.student_number})</div>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', padding: '16px 0' }}>
                You do not have an active ID card yet. Click below to apply for your official student ID or access card.
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
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
                  className="btn-secondary"
                  onClick={onOpenReissue}
                  style={{ color: '#fca5a5' }}
                >
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                  Report Lost / Replace
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenApply}
              >
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                Apply for First ID
              </button>
            )}
          </div>
        </div>

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

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ background: '#ffffff', color: '#111', fontWeight: 'bold' }}
              onClick={onOpenApply}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
              New Application
            </button>
            <button
              type="button"
              className="btn-outline"
              style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.4)' }}
              onClick={onOpenReissue}
            >
              <i className="fa-solid fa-rotate-right" style={{ marginRight: '6px' }}></i>
              Reissue Request
            </button>
          </div>
        </div>

      </div>

      <div style={{
        background: '#232225',
        borderRadius: '16px',
        border: '1px solid #3d3b3f',
        padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem' }}>
              Your Applications & Tracking
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

        {loading ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading applications...</div>
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p style={{ fontSize: '1.05rem', color: '#e5e7eb', marginBottom: '8px' }}>No applications on file yet</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '18px' }}>Submit an ID or Access Card application to start tracking.</p>
            <button type="button" className="btn-primary" onClick={onOpenApply}>
              <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
              Apply Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {applications.map(app => {
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        background: 'rgb(194, 47, 47)',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    </div>
                  </div>

                  {/* Status Circle Design with Numbers Inside */}
                  <div style={{
                    background: '#151416',
                    padding: '16px 20px 12px 20px',
                    borderRadius: '10px',
                    border: '1px solid #2d2c30'
                  }}>
                    <StatusStepper
                      currentStatus={app.status}
                      size="normal"
                      onStepClick={() => (onOpenStatusModal ? onOpenStatusModal(app) : onSelectApp(app))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default StudentDashboard;
