import React, { useState } from 'react';
import { api } from '../services/api';
import Arle from '../assets/Arle.png';

function ApplyModal({ isOpen, onClose, currentUser, onSuccess }) {
  if (!isOpen) return null;

  const studentProfile = currentUser?.role === 'student' ? currentUser.profile : null;

  const [formData, setFormData] = useState({
    type: 'New ID',
    student_number: studentProfile?.student_number || '',
    first_name: studentProfile?.first_name || '',
    last_name: studentProfile?.last_name || '',
    program: studentProfile?.program || 'BS Computer Science',
    year_level: studentProfile?.year_level || '1st Year',
    photo_url: studentProfile?.first_name === 'The' ? Arle : '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    if (!formData.first_name || !formData.last_name || !formData.student_number) {
      setError('Please provide student number, first name, and last name.');
      return;
    }

    try {
      setLoading(true);

      let photoFileId = null;
      if (formData.photo_url) {
        const fileRecord = await api.uploadFile({
          uploaded_by: currentUser?.id || 1,
          kind: 'id_photo',
          storage_path: formData.photo_url,
          media_type: formData.photo_url.startsWith('data:') ? 'image/png' : 'image/jpeg',
        });
        photoFileId = fileRecord.id;
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
            <i className="fa-solid fa-id-card" style={{ marginRight: '8px' }}></i>
            Apply for ID / Access Card
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
                <option value="New ID">New Student ID</option>
                <option value="Access Card">Building / Lab Access Card</option>
              </select>
              <span className="form-hint">Maps to APPLICATIONS.type</span>
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
                Applicant Photo (2x2 Formal Photo)
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
                    Stored in UPLOADED FILES (kind: 'id_photo')
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }}></i>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ApplyModal;
