import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export default function StaffPhotoCapture({ applicationId, onSaved }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };
  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    try {
      setError('');
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 600, height: 750, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch {
      setError('Camera access was not granted. Check the connected camera and browser permission.');
    }
  };
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return setError('Start the camera before taking a photo.');
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 750;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreview(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
  };
  const save = async () => {
    if (!preview) return;
    try {
      setSaving(true); setError('');
      const file = await api.uploadFile({ kind: 'id_photo', storage_path: preview, original_name: `UPRESS-${applicationId}.jpg` });
      await api.setApplicationPhoto(applicationId, file.id);
      onSaved?.();
    } catch (err) { setError(err.message || 'Unable to save the photo.'); }
    finally { setSaving(false); }
  };

  return <div className="staff-capture">
    <strong>UPRESS official photo capture</strong>
    <p>Capture a current ID photo from the connected camera. Students cannot provide this photo.</p>
    {error && <div className="capture-error">{error}</div>}
    {preview ? <img className="capture-preview" src={preview} alt="Captured student" /> : <video ref={videoRef} autoPlay playsInline className="capture-preview" />}
    <div className="capture-actions">
      {!preview && <button type="button" className="btn-outline" onClick={startCamera}>Open camera</button>}
      {!preview && <button type="button" className="btn-primary" onClick={takePhoto}>Capture photo</button>}
      {preview && <button type="button" className="btn-secondary" onClick={() => setPreview('')}>Retake</button>}
      {preview && <button type="button" className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save official photo'}</button>}
    </div>
  </div>;
}
