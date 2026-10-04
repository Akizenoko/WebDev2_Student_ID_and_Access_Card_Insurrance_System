import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function ReissueModal({ isOpen, onClose, currentUser, onSuccess }) {
  if (!isOpen) return null;

  const studentProfile = currentUser?.role === 'student' ? currentUser.profile : null;

  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [formData, setFormData] = useState({
    original_card_id: '',
    reason: 'Lost physical ID card',
    custom_reason: '',
    fee_amount: 150.00,
    proof_url: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCards() {
      try {
        setLoadingCards(true);
        const studentId = studentProfile?.id || 1;
        const res = await api.getCards({ student_id: studentId });
        setCards(res);
        if (res.length > 0) {
          setFormData(prev => ({ ...prev, original_card_id: res[0].id }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCards(false);
      }
    }
    fetchCards();
  }, [studentProfile]);

  const handleProofUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, proof_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.original_card_id) {
      setError('Please select the original card being replaced.');
      return;
    }

    try {
      setSubmitting(true);

      let photoFileId = null;
      if (formData.proof_url) {
        const fileRecord = await api.uploadFile({
          uploaded_by: currentUser?.id || 1,
          kind: 'proof_of_loss',
          storage_path: formData.proof_url,
          media_type: formData.proof_url.startsWith('data:') ? 'image/png' : 'image/jpeg',
        });
        photoFileId = fileRecord.id;
      }

      const finalReason = formData.reason === 'Other' 
        ? formData.custom_reason || 'Other reasons' 
        : formData.reason;

      await api.createReissuance({
        student_id: studentProfile?.id || 1,
        original_card_id: Number(formData.original_card_id),
        reason: finalReason,
        fee_amount: Number(formData.fee_amount),
        photo_file_id: photoFileId,
        user_id: currentUser?.id || 1,
      });

      setSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit reissuance request');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-rotate-right" style={{ marginRight: '8px' }}></i>
            Lost/Damaged Card Reissuance
          </h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {error && (
              <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Select Original Card to Replace <span className="required">*</span>
              </label>
              {loadingCards ? (
                <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading issued cards...</div>
              ) : cards.length > 0 ? (
                <select
                  className="form-select"
                  value={formData.original_card_id}
                  onChange={e => setFormData({ ...formData, original_card_id: e.target.value })}
                  required
                >
                  {cards.map(card => (
                    <option key={card.id} value={card.id}>
                      Card No: {card.card_number} (Status: {card.status}) - Valid until {card.valid_until}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ background: '#1c1b1d', padding: '12px', borderRadius: '8px', border: '1px solid #444', fontSize: '0.85rem', color: '#e5e7eb' }}>
                  No active card found for this student. You can file a new ID application first!
                </div>
              )}
              <span className="form-hint">Maps to REISSURANCE REQUEST.original_card_id</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Reason for Reissuance <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              >
                <option value="Lost physical ID card">Lost physical ID card</option>
                <option value="Damaged / Unreadable RFID chip">Damaged / Unreadable RFID chip</option>
                <option value="Physical wear / Broken card">Physical wear / Broken card</option>
                <option value="Stolen / Bag stolen">Stolen / Incident</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {formData.reason === 'Other' && (
              <div className="form-group">
                <label className="form-label">Specify Reason</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Provide details of loss or damage..."
                  value={formData.custom_reason}
                  onChange={e => setFormData({ ...formData, custom_reason: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">University Replacement Fee</label>
                <input
                  type="text"
                  className="form-input"
                  value={`₱ ${formData.fee_amount.toFixed(2)}`}
                  disabled
                />
                <span className="form-hint">Maps to REISSURANCE REQUEST.fee_amount</span>
              </div>

              <div className="form-group">
                <label className="form-label">Target Application Type</label>
                <input
                  type="text"
                  className="form-input"
                  value="Replacement"
                  disabled
                />
                <span className="form-hint">Maps to APPLICATIONS.type</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Supporting Document / Photo of Damaged Card (Optional)
              </label>
              <div className="photo-uploader">
                <div className="photo-preview">
                  {formData.proof_url ? (
                    <img src={formData.proof_url} alt="Proof preview" />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>No Document</span>
                  )}
                </div>
                <div className="photo-controls">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    style={{ color: '#d1d5db', fontSize: '0.85rem' }}
                  />
                  <span className="form-hint">
                    Stored in UPLOADED FILES (kind: 'proof_of_loss')
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.82rem', color: '#fca5a5' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
              <strong>Process Note:</strong> Submitting this request will automatically update the status of the selected card to <em>Lost/Damaged</em> in the <strong>CARDS</strong> table and create a new linked record in <strong>APPLICATIONS</strong> for processing.
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || cards.length === 0}
            >
              <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }}></i>
              {submitting ? 'Submitting...' : 'Submit Reissuance Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReissueModal;
