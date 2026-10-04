import React from 'react';
import StatusStepper, { getStepIndex } from './StatusStepper';

const STEP_DETAILS = {
  submitted: {
    step: 1,
    title: 'Application Submitted & Queued',
    color: '#60a5fa',
    badge: 'Under Review',
    icon: 'fa-file-arrow-up',
    description: 'Your application form, photo upload, and student details have been successfully received by the WMSU ID Management System.',
    currentActions: [
      'Document queue verification',
      'Eligibility and student enrollment check with registrar records',
      'Photo quality check for ID specifications (2x2 white background)'
    ],
    nextStep: 'Once validated by the registrar, your application will advance to ID card generation and RFID chip encoding.',
    location: 'Office of the University Registrar - Processing Division',
    actionRequired: 'No student action required at this moment. You will be notified once processing commences.'
  },
  processing: {
    step: 2,
    title: 'In Processing & ID Card Encoding',
    color: '#fbbf24',
    badge: 'In Production',
    icon: 'fa-gears',
    description: 'Your identity documents have been approved. Your WMSU Smart Card is currently in production.',
    currentActions: [
      'High-definition thermal printing of student credentials',
      'Encoding 13.56 MHz RFID / NFC smart access chip',
      'Barcode & QR code generation for campus library and entrance turnstiles',
      'Quality assurance and security hologram application'
    ],
    nextStep: 'The card is undergoing final testing and will be routed to Window 4 for student pickup.',
    location: 'Central ID Production Unit - Administration Building Ground Floor',
    actionRequired: 'Ensure you have your physical Certificate of Registration (COR) ready for verification during pickup.'
  },
  ready: {
    step: 3,
    title: 'Ready for Pickup at Registrar Window',
    color: '#c084fc',
    badge: 'Ready for Claiming',
    icon: 'fa-box-open',
    description: 'Congratulations! Your official WMSU Student ID / Access Card is ready for claiming.',
    currentActions: [
      'Physical card staged at Registrar Window 4',
      'Access permissions synced with university turnstile system'
    ],
    nextStep: 'Visit the Registrar Window to sign the issuance registry and claim your physical card and ID lanyard.',
    location: 'Window 4, Office of the University Registrar, Administration Building (Monday-Friday, 8:00 AM - 5:00 PM)',
    actionRequired: 'Please present your Certificate of Registration (COR) and a valid government ID or previous school ID to receive your card.'
  },
  released: {
    step: 4,
    title: 'Card Released & Active',
    color: '#34d399',
    badge: 'Completed',
    icon: 'fa-circle-check',
    description: 'Your university identification card has been officially handed over and is active across campus facilities.',
    currentActions: [
      'ID Card Status: ACTIVE in campus registry',
      'Building access, library borrowing, and laboratory access enabled',
      'Card insurance coverage active for the academic year'
    ],
    nextStep: 'Keep your card secure. If lost or damaged, you may submit a Lost/Destroyed Reissuance request anytime.',
    location: 'Campus Wide / Active Student Status',
    actionRequired: 'Remember to wear your ID at all times inside the university premises.'
  },
  rejected: {
    step: 0,
    title: 'Application Requires Revision',
    color: '#f87171',
    badge: 'Action Needed',
    icon: 'fa-circle-exclamation',
    description: 'There was an issue processing your application (e.g. invalid photo resolution, mismatched student number, or incomplete requirements).',
    currentActions: [
      'Application marked for revision by registrar staff'
    ],
    nextStep: 'Please submit a new application with corrected credentials or visit Registrar Window 4 for guidance.',
    location: 'Registrar Inquiry Window',
    actionRequired: 'Please re-submit your photo or verify your enrolled student number.'
  }
};

function StatusTrackerModal({ isOpen, onClose, applications = [], currentApp = null, onSelectApp, onOpenApply }) {
  if (!isOpen) return null;

  const activeApp = currentApp || applications[0] || null;
  const currentStatus = activeApp?.status?.toLowerCase() || 'submitted';
  const details = STEP_DETAILS[currentStatus] || STEP_DETAILS.submitted;
  const currentStepNum = getStepIndex(currentStatus) + 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '1080px' }}>
        
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              <i className="fa-solid fa-timeline"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>ID Issuance Lifecycle & Status Tracking</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                Real-time progress tracker and milestone breakdown
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ gap: '24px', padding: '28px' }}>
          
          {/* Multi-application selector if student has more than one */}
          {applications.length > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#1c1b1d',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #363438'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Select Application:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {applications.map(app => {
                  const isSelected = activeApp?.id === app.id;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => onSelectApp?.(app)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid rgb(194, 47, 47)' : '1px solid #444',
                        background: isSelected ? 'rgba(194, 47, 47, 0.25)' : '#252427',
                        color: isSelected ? '#ffffff' : '#d1d5db',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {app.application_no} ({app.type})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expanded Big Circle Stepper Design */}
          <div style={{
            background: 'linear-gradient(180deg, #1f1e21 0%, #161517 100%)',
            borderRadius: '18px',
            border: '1px solid #3e3c42',
            padding: '30px 24px 24px 24px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                  {activeApp ? `Application ${activeApp.application_no} (${activeApp.type})` : 'Standard Pipeline'}
                </span>
              </div>

              <div style={{
                fontSize: '0.85rem',
                color: details.color,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className={`fa-solid ${details.icon}`}></i>
                <span>Currently: Step {currentStepNum} of 4</span>
              </div>
            </div>

            {/* BIGGER CIRCLE DESIGN */}
            <StatusStepper currentStatus={currentStatus} size="large" />
          </div>

          {/* Current Step Detailed Breakdown Card */}
          <div style={{
            background: '#201f22',
            borderRadius: '16px',
            border: `1px solid ${details.color}40`,
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '6px',
              bottom: 0,
              background: details.color
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{
                    background: `${details.color}25`,
                    color: details.color,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    Step {currentStepNum}: {details.badge}
                  </span>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                    {details.title}
                  </h4>
                </div>
                <p style={{ margin: 0, color: '#e5e7eb', fontSize: '0.92rem', lineHeight: 1.5, maxWidth: '640px' }}>
                  {details.description}
                </p>
              </div>

              <div style={{
                background: '#161517',
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid #363438',
                fontSize: '0.82rem',
                minWidth: '200px'
              }}>
                <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Target Location:</div>
                <div style={{ color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-location-dot" style={{ color: '#f87171' }}></i>
                  {details.location}
                </div>
              </div>
            </div>

            {/* Current Operations / Checklist */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #333235' }}>
              <div style={{ fontSize: '0.82rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                <i className="fa-solid fa-list-check" style={{ marginRight: '6px', color: details.color }}></i>
                Stage Verification Operations
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                {details.currentActions.map((act, i) => (
                  <div key={i} style={{
                    background: '#181719',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2d2c30',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.82rem',
                    color: '#d1d5db'
                  }}>
                    <i className="fa-solid fa-check" style={{ color: details.color, fontSize: '0.85rem' }}></i>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps & Student Action */}
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              border: '1px dashed #444246',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.83rem'
            }}>
              <div>
                <strong style={{ color: '#fbbf24' }}>Next Step: </strong>
                <span style={{ color: '#d1d5db' }}>{details.nextStep}</span>
              </div>
              <div>
                <strong style={{ color: '#60a5fa' }}>Student Action: </strong>
                <span style={{ color: '#d1d5db' }}>{details.actionRequired}</span>
              </div>
            </div>
          </div>

          {/* Application Metadata & Timeline History */}
          {activeApp && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              
              <div style={{ background: '#1c1b1d', padding: '16px 20px', borderRadius: '12px', border: '1px solid #363438' }}>
                <h5 style={{ fontSize: '0.85rem', color: '#f87171', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                  Application Details
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                  <div><span style={{ color: '#9ca3af' }}>Application No:</span> <strong style={{ color: '#fff' }}>{activeApp.application_no}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Card Type:</span> <strong style={{ color: '#fff' }}>{activeApp.type}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Submitted:</span> <span style={{ color: '#fff' }}>{new Date(activeApp.submitted_at).toLocaleString()}</span></div>
                  <div><span style={{ color: '#9ca3af' }}>Applicant:</span> <span style={{ color: '#fff' }}>{activeApp.student ? `${activeApp.student.first_name} ${activeApp.student.last_name}` : 'Student'}</span></div>
                  <div><span style={{ color: '#9ca3af' }}>Student ID:</span> <span style={{ color: '#fff' }}>{activeApp.student?.student_number}</span></div>
                </div>
              </div>

              <div style={{ background: '#1c1b1d', padding: '16px 20px', borderRadius: '12px', border: '1px solid #363438' }}>
                <h5 style={{ fontSize: '0.85rem', color: '#f87171', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                  Status History Logs
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                  {activeApp.history?.length > 0 ? (
                    activeApp.history.map((h, i) => (
                      <div key={h.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid #28272a', paddingBottom: '6px' }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{h.to_status}</span>
                          <span style={{ color: '#9ca3af', marginLeft: '6px' }}>by {h.changer_role || 'System'}</span>
                        </div>
                        <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          {new Date(h.changed_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No status changes recorded yet.</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {!activeApp && (
            <div style={{ textAlign: 'center', padding: '24px', background: '#1c1b1d', borderRadius: '12px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '14px' }}>You haven't submitted any ID applications yet.</p>
              <button type="button" className="btn-primary" onClick={() => { onClose(); onOpenApply?.(); }}>
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                Apply for Student ID Now
              </button>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close Tracker
          </button>
        </div>

      </div>
    </div>
  );
}

export default StatusTrackerModal;
