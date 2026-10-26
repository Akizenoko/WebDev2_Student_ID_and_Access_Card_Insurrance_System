import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { isCardValidationOver } from '../utils/status';

function ReissueModal({ isOpen, onClose, currentUser, onSuccess, initialReason, applications = [] }) {
  const studentProfile = currentUser?.role === 'student' ? currentUser.profile : null;

  const [cards, setCards] = useState([]);
  const [fetchedApps, setFetchedApps] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [formData, setFormData] = useState({
    original_card_id: '',
    reason: initialReason || 'Lost physical ID card',
    custom_reason: '',
    fee_amount: 150.00,
    proof_url: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const effectiveApps = applications.length > 0 ? applications : fetchedApps;

  const getCardType = (card) => {
    if (!card) return 'Student ID';
    if (card.card_type === 'Access Card') return 'Access Card';
    if (card.application?.type === 'Access Card') return 'Access Card';
    return 'Student ID';
  };

  const isAccessReissue = useCallback((app) => {
    if (!app) return false;
    if (app.reissuance?.original_card_type === 'Access Card') return true;
    if (app.card_type === 'Access Card') return true;
    return false;
  }, []);

  const activeIdReissue = effectiveApps.find(
    a => (a.type === 'Replacement' || a.type === 'Renewal') &&
         ['submitted', 'processing', 'ready'].includes(a.status) &&
         !isAccessReissue(a)
  );

  const activeAccessReissue = effectiveApps.find(
    a => (a.type === 'Replacement' || a.type === 'Renewal') &&
         ['submitted', 'processing', 'ready'].includes(a.status) &&
         isAccessReissue(a)
  );

  const selectedCard = cards.find(c => String(c.id) === String(formData.original_card_id));
  const isSelectedAccess = getCardType(selectedCard) === 'Access Card';
  const activeReissueForSelectedCard = isSelectedAccess ? activeAccessReissue : activeIdReissue;
  const isSelectedCardExpired = isCardValidationOver(selectedCard);

  const hasActiveReissueForCard = useCallback((card) => {
    const isAccess = getCardType(card) === 'Access Card';
    return isAccess ? Boolean(activeAccessReissue) : Boolean(activeIdReissue);
  }, [activeAccessReissue, activeIdReissue]);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchData() {
      try {
        setLoadingCards(true);
        const studentId = studentProfile?.id || 1;
        const [cardRes, appRes] = await Promise.all([
          api.getCards({ student_id: studentId }),
          applications.length === 0 ? api.getApplications() : Promise.resolve(applications)
        ]);

        const safeCards = Array.isArray(cardRes) ? cardRes : [];
        setCards(safeCards);
        if (Array.isArray(appRes)) {
          setFetchedApps(appRes);
        }

        if (safeCards.length > 0) {
          // Default to first active card that does NOT have a pending reissue if possible
          const firstEligible = safeCards.find(c => c.status === 'active' && !hasActiveReissueForCard(c))
            || safeCards.find(c => c.status === 'active')
            || safeCards[0];
          const firstExpired = isCardValidationOver(firstEligible);
          let reason = initialReason || 'Lost physical ID card';
          const wantsRenew = reason.toLowerCase().includes('renew') || reason.toLowerCase().includes('validation');
          if (wantsRenew && !firstExpired) {
            reason = 'Lost physical ID card';
          }
          setFormData(prev => ({
            ...prev,
            original_card_id: firstEligible.id,
            reason
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCards(false);
      }
    }
    fetchData();
  }, [isOpen, initialReason, studentProfile, applications, hasActiveReissueForCard]);

  if (!isOpen) return null;

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

    if (activeReissueForSelectedCard) {
      setError(`You already have an active reissue request in progress for your ${isSelectedAccess ? 'Access Card' : 'Student ID Card'}. Reissue requests for ${isSelectedAccess ? 'Access Cards' : 'ID Cards'} must be processed one at a time.`);
      return;
    }

    if (!formData.original_card_id) {
      setError('Please select the original card being replaced.');
      return;
    }

    if (isRenew && !isSelectedCardExpired) {
      setError('You can only renew a card once the valid until date is over.');
      return;
    }

    try {
      setSubmitting(true);

      let photoFileId = null;
      if (formData.proof_url && formData.proof_url.startsWith('data:')) {
        const fileRecord = await api.uploadFile({
          uploaded_by: currentUser?.id || 1,
          kind: 'proof_of_loss',
          storage_path: formData.proof_url,
          media_type: formData.proof_url.includes('image/png') ? 'image/png' : 'image/jpeg',
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

  const isRenew = formData.reason.toLowerCase().includes('renew') || formData.reason.toLowerCase().includes('validation');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className={`fa-solid ${isRenew ? 'fa-arrows-rotate' : 'fa-rotate-right'}`} style={{ marginRight: '8px' }}></i>
            {isRenew ? 'ID Card Renewal (Validation Expired)' : 'Lost/Damaged Card Reissuance'}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {activeReissueForSelectedCard && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#fca5a5',
                fontSize: '0.85rem',
                lineHeight: 1.45
              }}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#f87171' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Active {isSelectedAccess ? 'Access Card' : 'Student ID'} Reissue In Progress ({activeReissueForSelectedCard.application_no})
                </div>
                You currently have an active <strong>{activeReissueForSelectedCard.type}</strong> request for your {isSelectedAccess ? 'Building / Lab Access Card' : 'Student ID Card'} (Status: <strong style={{ textTransform: 'uppercase', color: '#fff' }}>{activeReissueForSelectedCard.status}</strong>).
                Reissue requests for {isSelectedAccess ? 'Access Cards' : 'ID Cards'} are processed <strong>one at a time</strong>.
                {cards.some(c => !hasActiveReissueForCard(c)) && (
                  <div style={{ marginTop: '6px', color: '#93c5fd', fontSize: '0.8rem' }}>
                    <i className="fa-solid fa-circle-info" style={{ marginRight: '5px' }}></i>
                    ID and Access card reissues are separate. You may select your other card from the dropdown if you need to reissue it.
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {isRenew ? 'Select Card to Renew' : 'Select Original Card to Replace'} <span className="required">*</span>
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
                  {cards.map(card => {
                    const isAccess = getCardType(card) === 'Access Card';
                    const cardType = isAccess ? 'Access Card' : 'Student ID';
                    const isCardActive = card.status === 'active';
                    const isOver = isCardValidationOver(card);
                    const isPending = hasActiveReissueForCard(card);
                    return (
                      <option
                        key={card.id}
                        value={card.id}
                        disabled={isPending || (!isCardActive && !isOver)}
                      >
                        [{cardType}] Card No: {card.card_number} ({card.status.toUpperCase()}) - Valid until {card.valid_until ? new Date(card.valid_until).toLocaleDateString() : 'N/A'}
                        {isPending ? ' — [Reissue Pending]' : (!isCardActive && !isOver ? ` [${card.status.toUpperCase()}]` : '')}
                      </option>
                    );
                  })}
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
                Reason / Request Type <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              >
                <option value="Card Renewal (Validation is over)" disabled={!isSelectedCardExpired}>
                  {isSelectedCardExpired
                    ? 'Card Renewal (Validation is over)'
                    : 'Card Renewal (Only once valid until is over)'}
                </option>
                <option value="Lost physical ID card">Lost physical ID card</option>
                <option value="College Shifter (Shifted to new college)">College Shifter (Shifted to new college)</option>
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
                <label className="form-label">{isRenew ? 'Renewal Processing Fee' : 'University Replacement Fee'}</label>
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
                  value={isRenew ? 'Renewal' : 'Replacement'}
                  disabled
                />
                <span className="form-hint">Maps to APPLICATIONS.type</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {isRenew ? 'Supporting Document or Old Card Photo (Optional)' : 'Supporting Document / Photo of Damaged Card (Optional)'}
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

            {isRenew && !isSelectedCardExpired && (
              <div style={{
                color: '#f87171',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                lineHeight: 1.4
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                This card is currently active and valid until {selectedCard?.valid_until}. Card renewal is only available once its valid until date is over.
              </div>
            )}

            <div style={{ background: isRenew ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${isRenew ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`, padding: '12px 14px', borderRadius: '10px', fontSize: '0.82rem', color: isRenew ? '#93c5fd' : '#fca5a5' }}>
              <i className={`fa-solid ${isRenew ? 'fa-arrows-rotate' : 'fa-triangle-exclamation'}`} style={{ marginRight: '6px' }}></i>
              <strong>Process Note:</strong> {isRenew ? 'Submitting this renewal request will flag the expired card in the CARDS table and generate a linked Renewal application in APPLICATIONS for university processing and card re-validation.' : 'Submitting this request will automatically update the status of the selected card to Lost/Damaged in the CARDS table and create a new linked record in APPLICATIONS for processing.'}
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || cards.length === 0 || Boolean(activeReissueForSelectedCard) || (isRenew && !isSelectedCardExpired)}
              style={Boolean(activeReissueForSelectedCard) || (isRenew && !isSelectedCardExpired) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <i className={`fa-solid ${activeReissueForSelectedCard ? 'fa-ban' : isRenew ? 'fa-arrows-rotate' : 'fa-paper-plane'}`} style={{ marginRight: '6px' }}></i>
              {submitting ? 'Submitting...' : activeReissueForSelectedCard ? `${isSelectedAccess ? 'Access Card' : 'ID'} Reissue In Progress` : isRenew ? 'Submit Card Renewal Request' : 'Submit Reissuance Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReissueModal;
