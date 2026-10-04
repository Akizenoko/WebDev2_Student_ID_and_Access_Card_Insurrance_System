import React, { useState } from 'react';
import { api } from '../services/api';
import Arle from '../assets/Arle.png';
import StatusStepper from './StatusStepper';

function ApplicationDetailModal({ isOpen, onClose, application, currentUser, onUpdate }) {
  if (!isOpen || !application) return null;

  const isAdmin = currentUser?.role === 'admin';
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(application.status);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      await api.updateApplicationStatus(application.id, newStatus, currentUser?.id || 2);
      setSelectedStatus(newStatus);
      setUpdating(false);
      onUpdate?.();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    return <span className={`status-pill status-${status}`}>{status}</span>;
  };

  const photoSrc = application.photo?.storage_path?.startsWith('/assets/Arle.png')
    ? Arle
    : (application.photo?.storage_path || Arle);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-clipboard-list" style={{ marginRight: '8px' }}></i>
            Application #{application.application_no}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div style={{
            background: '#19181a',
            borderRadius: '12px',
            border: '1px solid #363438',
            padding: '16px 20px',
            marginBottom: '4px'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
              Issuance Lifecycle Stage
            </div>
            <StatusStepper currentStatus={application.status} size="normal" />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#1f1e20',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid #3d3b3f'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgb(194, 47, 47)',
                background: '#121113'
              }}>
                <img
                  src={photoSrc}
                  alt="Student"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <h4 style={{ fontSize: '1.15rem', color: '#ffffff', margin: 0 }}>
                  {application.student ? `${application.student.first_name} ${application.student.last_name}` : 'Student'}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '2px 0 0 0' }}>
                  {application.student?.program} &bull; {application.student?.student_number} &bull; {application.student?.year_level}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '6px' }}>{getStatusBadge(application.status)}</div>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Type: <strong>{application.type}</strong></span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: '#1c1b1d', padding: '16px', borderRadius: '12px', border: '1px solid #363438' }}>
              <h5 style={{ fontSize: '0.9rem', color: '#f87171', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Application Metadata
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#9ca3af' }}>Application ID:</span>{' '}
                  <strong style={{ color: '#ffffff' }}>#{application.id}</strong>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Submitted At:</span>{' '}
                  <span style={{ color: '#ffffff' }}>{new Date(application.submitted_at).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Assigned Handler:</span>{' '}
                  <span style={{ color: '#ffffff' }}>
                    {application.assignedAdmin ? `${application.assignedAdmin.office} (${application.assignedAdmin.employee_no})` : 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Student Email:</span>{' '}
                  <span style={{ color: '#ffffff' }}>{application.student?.email || 'N/A'}</span>
                </div>

                {application.reissuance && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>Reissuance Details:</div>
                    <div><span style={{ color: '#9ca3af' }}>Reason:</span> {application.reissuance.reason}</div>
                    <div><span style={{ color: '#9ca3af' }}>Fee:</span> ₱{application.reissuance.fee_amount?.toFixed(2)}</div>
                    <div><span style={{ color: '#9ca3af' }}>Original Card ID:</span> #{application.reissuance.original_card_id}</div>
                  </div>
                )}

                {application.card && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>Generated Card Record:</div>
                    <div><span style={{ color: '#9ca3af' }}>Card Number:</span> <strong style={{ color: '#fff' }}>{application.card.card_number}</strong></div>
                    <div><span style={{ color: '#9ca3af' }}>Issued:</span> {application.card.issue_date}</div>
                    <div><span style={{ color: '#9ca3af' }}>Valid Until:</span> {application.card.valid_until}</div>
                    <div><span style={{ color: '#9ca3af' }}>Status:</span> <strong style={{ color: '#34d399' }}>{application.card.status}</strong></div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#1c1b1d', padding: '16px', borderRadius: '12px', border: '1px solid #363438' }}>
              <h5 style={{ fontSize: '0.9rem', color: '#f87171', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                STATUS HISTORY Audit Trail
              </h5>
              <div className="timeline">
                {application.history?.map((step, idx) => (
                  <div key={step.id || idx} className={`timeline-item ${idx === application.history.length - 1 ? 'active' : ''}`}>
                    <div className="timeline-dot" />
                    <div className="timeline-time">
                      {new Date(step.changed_at).toLocaleString()}
                    </div>
                    <div className="timeline-title">
                      {step.from_status && (
                        <>
                          <span style={{ textTransform: 'capitalize' }}>{step.from_status}</span>
                          <i className="fa-solid fa-arrow-right" style={{ margin: '0 6px', fontSize: '0.75rem' }}></i>
                        </>
                      )}
                      <span style={{ textTransform: 'capitalize', color: '#fff' }}>{step.to_status}</span>
                    </div>
                    <div className="timeline-desc">
                      Changed by: {step.changer_email} ({step.changer_role})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div style={{
              background: '#222123',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(194, 47, 47, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff' }}>
                  <i className="fa-solid fa-gear" style={{ marginRight: '6px' }}></i>
                  Admin Status Management:
                </span>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  Current Status: <strong style={{ color: '#f87171' }}>{application.status}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={updating || application.status === 'processing'}
                  onClick={() => handleStatusChange('processing')}
                  style={{ borderColor: '#f59e0b', color: '#fbbf24' }}
                >
                  <i className="fa-solid fa-spinner" style={{ marginRight: '6px' }}></i>
                  Mark In Processing
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={updating || application.status === 'ready'}
                  onClick={() => handleStatusChange('ready')}
                  style={{ borderColor: '#a855f7', color: '#c084fc' }}
                >
                  <i className="fa-solid fa-box" style={{ marginRight: '6px' }}></i>
                  Mark Ready for Pickup
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={updating || application.status === 'released'}
                  onClick={() => handleStatusChange('released')}
                  style={{ background: '#10b981', borderColor: '#059669' }}
                >
                  <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                  Release Card
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={updating || application.status === 'rejected'}
                  onClick={() => handleStatusChange('rejected')}
                  style={{ color: '#f87171' }}
                >
                  <i className="fa-solid fa-ban" style={{ marginRight: '6px' }}></i>
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApplicationDetailModal;
