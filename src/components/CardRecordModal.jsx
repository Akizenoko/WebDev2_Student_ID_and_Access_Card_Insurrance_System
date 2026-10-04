import React from 'react';
import wmsulogo from '../assets/wmsulogo.png';
import Arle from '../assets/Arle.png';

function CardRecordModal({ isOpen, onClose, card }) {
  if (!isOpen || !card) return null;

  const student = card.student;
  const photoUrl = card.photo?.storage_path?.startsWith('/assets/Arle.png')
    ? Arle
    : (card.photo?.storage_path || Arle);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'lost': return '#ef4444';
      case 'damaged': return '#f59e0b';
      case 'expired': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-id-card" style={{ marginRight: '6px' }}></i>
            Official University Card Record
          </h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">

          <div className="id-card-container">
            <div className="wmsu-card">
              <div className="wmsu-card-header">
                <img src={wmsulogo} alt="WMSU Seal" />
                <div>
                  <h4>WESTERN MINDANAO STATE UNIVERSITY</h4>
                  <p>Zamboanga City, Philippines &bull; Student Identification</p>
                </div>
              </div>

              <div className="wmsu-card-body">
                <div className="wmsu-card-photo">
                  <img src={photoUrl} alt="Student" />
                </div>
                <div className="wmsu-card-info">
                  <div className="name">
                    {student ? `${student.first_name} ${student.last_name}` : 'Student Cardholder'}
                  </div>
                  <div className="student-no">
                    ID: {student?.student_number || '2025-01190'}
                  </div>
                  <div className="meta">
                    <strong>Program:</strong> {student?.program || 'BS Computer Science'}
                  </div>
                  <div className="meta">
                    <strong>Year:</strong> {student?.year_level || 'Undergraduate'}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: `${getStatusColor(card.status)}22`,
                      color: getStatusColor(card.status),
                      border: `1px solid ${getStatusColor(card.status)}66`,
                      textTransform: 'uppercase'
                    }}>
                      {card.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="wmsu-card-footer">
                <div>
                  <strong>Card No:</strong> {card.card_number}
                </div>
                <div>
                  <strong>Valid Until:</strong> {card.valid_until}
                </div>
              </div>
            </div>
          </div>

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

export default CardRecordModal;
