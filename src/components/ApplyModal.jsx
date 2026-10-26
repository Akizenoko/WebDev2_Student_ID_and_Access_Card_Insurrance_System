import { useState, useCallback } from 'react';
import { api } from '../services/api';
import Arle from '../assets/Arle.png';
import { isCardValidationOver } from '../utils/status';

function ApplyModal({ isOpen, onClose, currentUser, onSuccess, applications = [], cards = [], initialType = 'New ID' }) {
  const studentProfile = currentUser?.role === 'student' ? currentUser.profile : null;

  const hasAppliedNewId = Array.isArray(applications)
    ? applications.some(a => a.type === 'New ID' && a.status !== 'rejected')
    : false;

  const hasExpiredCard = Array.isArray(cards) && cards.some(c => isCardValidationOver(c));

  const hasPendingAccessCard = Array.isArray(applications)
    ? applications.some(a => a.type === 'Access Card' && ['submitted', 'processing', 'ready'].includes(a.status))
    : false;

  const hasActiveAccessCard = Array.isArray(cards)
    ? cards.some(c => c.status === 'active' && (c.card_type === 'Access Card' || c.application?.type === 'Access Card'))
    : false;

  const canApplyAccessCard = !hasPendingAccessCard && !hasActiveAccessCard;

  const resolveType = useCallback((t) => {
    if (!t) return hasAppliedNewId ? (hasExpiredCard ? 'Renewal' : (canApplyAccessCard ? 'Access Card' : 'New ID')) : 'New ID';
    if (hasAppliedNewId && t === 'New ID') return hasExpiredCard ? 'Renewal' : (canApplyAccessCard ? 'Access Card' : 'New ID');
    if (t === 'Renewal' && !hasExpiredCard) return canApplyAccessCard ? 'Access Card' : 'New ID';
    if (t === 'Access Card' && !canApplyAccessCard) return hasExpiredCard ? 'Renewal' : 'New ID';
    return t;
  }, [hasAppliedNewId, hasExpiredCard, canApplyAccessCard]);

  const defaultType = resolveType(initialType);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  const [formData, setFormData] = useState({
    type: defaultType,
    student_number: studentProfile?.student_number || '',
    first_name: studentProfile?.first_name || '',
    middle_name: studentProfile?.middle_name || '',
    last_name: studentProfile?.last_name || '',
    program: studentProfile?.program || 'BS Computer Science',
    year_level: studentProfile?.year_level || '1st Year',
    photo_url: studentProfile?.photo_url || (studentProfile?.first_name === 'The' ? Arle : ''),
  });

  // Reset/sync form state when modal opens without cascading effect renders
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const type = resolveType(initialType);
      setFormData({
        type,
        student_number: studentProfile?.student_number || '',
        first_name: studentProfile?.first_name || '',
        middle_name: studentProfile?.middle_name || '',
        last_name: studentProfile?.last_name || '',
        program: studentProfile?.program || 'BS Computer Science',
        year_level: studentProfile?.year_level || '1st Year',
        photo_url: studentProfile?.photo_url || (studentProfile?.first_name === 'The' ? Arle : ''),
      });
      setError('');
    }
  }

  if (!isOpen) return null;

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (hasAppliedNewId && formData.type === 'New ID') {
      setError('You have already applied for your first-time Student ID. If your validation has expired, choose "Card Renewal (Validation is over)", or select "Building / Lab Access Card".');
      return;
    }

    if (formData.type === 'Access Card') {
      if (hasPendingAccessCard) {
        setError('You already have a Building / Lab Access Card application in progress. You can only apply for one access card at a time.');
        return;
      }
      if (hasActiveAccessCard) {
        setError('You already have an active Building / Lab Access Card. You cannot apply for another access card while you have an active one.');
        return;
      }
    }

    if (formData.type === 'Renewal' && !hasExpiredCard) {
      setError('You can only renew your student card once its valid until date is over.');
      return;
    }

    if (!formData.first_name || !formData.last_name || !formData.student_number) {
      setError('Please provide student number, first name, and last name.');
      return;
    }

    if (!formData.photo_url) {
      setError('Please upload a 2x2 ID photo (white background).');
      return;
    }

    try {
      setLoading(true);

      let photoFileId = null;
      if (formData.photo_url.startsWith('data:')) {
        const fileRecord = await api.uploadFile({
          uploaded_by: currentUser?.id || 1,
          kind: 'id_photo',
          storage_path: formData.photo_url,
          media_type: formData.photo_url.includes('image/png') ? 'image/png' : 'image/jpeg',
        });
        photoFileId = fileRecord.id;
      } else {
        // Fallback for demo seed photo
        photoFileId = 1;
      }

      const studentId = studentProfile?.id || 1;
      await api.createApplication({
        student_id: studentId,
        photo_file_id: photoFileId,
        type: formData.type,
        user_id: currentUser?.id || 1,
      });

      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className={`fa-solid ${formData.type === 'Renewal' ? 'fa-arrows-rotate' : (formData.type === 'Access Card' ? 'fa-id-badge' : 'fa-id-card')}`} style={{ marginRight: '8px' }}></i>
            {formData.type === 'Renewal'
              ? 'Card Renewal Application (Validation Over)'
              : (formData.type === 'Access Card' ? 'Apply for Building / Lab Access Card' : 'Apply for Student ID')}
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
                Application Type <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                {!hasAppliedNewId && <option value="New ID">New Student ID</option>}
                <option value="Renewal" disabled={!hasExpiredCard}>
                  {hasExpiredCard
                    ? 'Card Renewal (Validation is over)'
                    : 'Card Renewal (Only once valid until is over)'}
                </option>
                <option value="Access Card" disabled={!canApplyAccessCard}>
                  {hasPendingAccessCard
                    ? 'Building / Lab Access Card (Application in progress)'
                    : hasActiveAccessCard
                      ? 'Building / Lab Access Card (Already active)'
                      : 'Building / Lab Access Card'}
                </option>
              </select>
              {formData.type === 'Renewal' && (
                hasExpiredCard ? (
                  <div style={{
                    marginTop: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#93c5fd',
                    lineHeight: 1.4
                  }}>
                    <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }}></i>
                    Renew your student card now that validation is over. Your renewed university ID will be issued with updated validation.
                  </div>
                ) : (
                  <div style={{
                    marginTop: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#fca5a5',
                    lineHeight: 1.4
                  }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                    Your student card is currently still valid. Renewal is only permitted once the valid until date is over.
                  </div>
                )
              )}
              {formData.type === 'Access Card' && (
                !canApplyAccessCard ? (
                  <div style={{
                    marginTop: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#fca5a5',
                    lineHeight: 1.4
                  }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                    {hasPendingAccessCard
                      ? 'You already have a Building / Lab Access Card application in progress. Only one Access Card application is permitted at a time.'
                      : 'You already hold an active Building / Lab Access Card. Students can only hold one access card at a time. If lost or damaged, please submit a Reissue Request.'}
                  </div>
                ) : (
                  <div style={{
                    marginTop: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#93c5fd',
                    lineHeight: 1.4
                  }}>
                    <i className="fa-solid fa-door-open" style={{ marginRight: '6px' }}></i>
                    Apply for official RFID access permissions to campus research laboratories, faculties, and university buildings.
                  </div>
                )
              )}
              {hasAppliedNewId && formData.type === 'New ID' && (
                <div style={{
                  marginTop: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                  lineHeight: 1.4
                }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                  You have already applied for your first-time Student ID. If your validation is over, select <strong>Card Renewal (Validation is over)</strong> above, or submit a <strong>Reissue Request</strong> for lost/damaged cards.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Middle Name <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Leave blank if none"
                value={formData.middle_name}
                onChange={e => setFormData({ ...formData, middle_name: e.target.value })}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Student Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 2025-01190"
                  value={formData.student_number}
                  onChange={e => setFormData({ ...formData, student_number: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Year Level</label>
                <select
                  className="form-select"
                  value={formData.year_level}
                  onChange={e => setFormData({ ...formData, year_level: e.target.value })}
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduate">Graduate School</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Degree Program</label>
              <select
                className="form-select"
                value={formData.program}
                onChange={e => setFormData({ ...formData, program: e.target.value })}
              >
                <option value="BS Computer Science">BS Computer Science</option>
                <option value="BS Information Technology">BS Information Technology</option>
                <option value="BS Nursing">BS Nursing</option>
                <option value="BS Civil Engineering">BS Civil Engineering</option>
                <option value="BA Political Science">BA Political Science</option>
                <option value="BS Criminology">BS Criminology</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Applicant Photo (2x2 Formal Photo) <span className="required">*</span>
              </label>
              <div className="photo-uploader">
                <div className="photo-preview">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Applicant preview" />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>No Photo</span>
                  )}
                </div>
                <div className="photo-controls">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ color: '#d1d5db', fontSize: '0.85rem' }}
                  />
                  <span className="form-hint">
                    Formal 2x2 photo with white background
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={
                loading ||
                (hasAppliedNewId && formData.type === 'New ID') ||
                (formData.type === 'Renewal' && !hasExpiredCard) ||
                (formData.type === 'Access Card' && !canApplyAccessCard)
              }
              style={
                (hasAppliedNewId && formData.type === 'New ID') ||
                (formData.type === 'Renewal' && !hasExpiredCard) ||
                (formData.type === 'Access Card' && !canApplyAccessCard)
                  ? { opacity: 0.5, cursor: 'not-allowed' }
                  : {}
              }
            >
              <i className={`fa-solid ${formData.type === 'Renewal' ? 'fa-arrows-rotate' : 'fa-paper-plane'}`} style={{ marginRight: '6px' }}></i>
              {loading ? 'Submitting...' : formData.type === 'Renewal' ? 'Submit Renewal Request' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApplyModal;
