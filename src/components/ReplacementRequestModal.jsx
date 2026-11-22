import { useState } from 'react';
import { api } from '../services/api';

export default function ReplacementRequestModal({ cards, onClose, onCreated }) {
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [reason, setReason] = useState('Damaged / unreadable ID');
  const [photoChoice, setPhotoChoice] = useState('old');
  const [proof, setProof] = useState(null);
  const [dateLost, setDateLost] = useState('');
  const [circumstances, setCircumstances] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsAffidavit = reason !== 'Damaged / unreadable ID';

  const chooseDocument = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = needsAffidavit ? ['application/pdf', 'image/png', 'image/jpeg'] : ['image/png', 'image/jpeg'];
    const maxBytes = needsAffidavit ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (!allowed.includes(file.type) || file.size > maxBytes) {
      setError(needsAffidavit ? 'Choose a PDF, PNG, or JPEG up to 5 MB.' : 'Choose a PNG or JPEG photo of the damage up to 2 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProof({ data: reader.result, name: file.name });
    reader.readAsDataURL(file);
    setError('');
  };

  const choosePaymentReceipt = event => {
    const file = event.target.files?.[0];
    if (!file) return setPaymentReceipt(null);
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a PDF, PNG, or JPEG payment confirmation up to 5 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPaymentReceipt({ data: reader.result, name: file.name });
    reader.readAsDataURL(file);
    setError('');
  };

  const submit = async event => {
    event.preventDefault();
    if (!proof) return setError(needsAffidavit ? 'Attach your Affidavit of Loss for admin confirmation.' : 'Attach a clear photo showing the damage to your ID.');
    if (needsAffidavit && !dateLost) return setError('Provide the date the ID was lost or stolen.');
    setBusy(true);
    setError('');
    try {
      const file = await api.uploadFile({ kind: needsAffidavit ? 'affidavit_of_loss' : 'proof_of_loss', storage_path: proof.data, original_name: proof.name });
      let paymentFileId;
      if (paymentReceipt) {
        const receipt = await api.uploadFile({ kind: 'payment_receipt', storage_path: paymentReceipt.data, original_name: paymentReceipt.name });
        paymentFileId = receipt.id;
      }
      await api.createReissuance({
        original_card_id: Number(cardId), reason, proof_file_id: file.id, photo_choice: photoChoice,
        date_lost: needsAffidavit ? dateLost : undefined,
        circumstances,
        payment_reference: paymentReference,
        payment_file_id: paymentFileId,
      });
      await onCreated();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  return <div className="dialog-backdrop" onMouseDown={onClose}>
    <form className="request-dialog replacement-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
      <div className="dialog-header"><div><p className="kicker">ID REISSUANCE</p><h2>Request a replacement</h2></div><button type="button" className="dialog-close" aria-label="Close" onClick={onClose}>×</button></div>
      <p className="replacement-intro">Tell us what happened to your ID. The validation desk will review your request and supporting document.</p>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="replacement-fields">
        <label className="input-group"><span>ID to replace</span><select value={cardId} onChange={event => setCardId(event.target.value)} required>{cards.map(card => <option key={card.id} value={card.id}>{card.card_number} · {card.status}</option>)}</select></label>
        <label className="input-group"><span>Reason for replacement</span><select value={reason} onChange={event => { setReason(event.target.value); setProof(null); setDateLost(''); }}><option>Damaged / unreadable ID</option><option>Lost physical ID</option><option>Stolen ID</option></select></label>
        {needsAffidavit && <label className="input-group"><span>Date lost or stolen <em>Required</em></span><input type="date" max={new Date().toISOString().slice(0, 10)} value={dateLost} onChange={event => setDateLost(event.target.value)} required /></label>}
        <label className="input-group replacement-circumstances"><span>Circumstances <em>Optional</em></span><textarea rows="2" value={circumstances} onChange={event => setCircumstances(event.target.value)} placeholder="Briefly describe how it happened" /></label>
      </div>
      <div className="replacement-document"><div className="replacement-document-icon">{needsAffidavit ? 'PDF' : 'IMG'}</div><div><strong>{needsAffidavit ? 'Affidavit of Loss' : 'Photo of the damaged ID'}</strong><p>{needsAffidavit ? 'Required for lost or stolen IDs. Upload a signed affidavit for admin confirmation.' : 'Upload a clear image showing the damage so staff can verify the request.'}</p></div></div>
      <label className="input-group replacement-upload"><span>Supporting document <em>{needsAffidavit ? 'PDF, PNG, or JPEG · up to 5 MB' : 'PNG or JPEG · up to 2 MB'}</em></span><input key={needsAffidavit ? 'affidavit' : 'damage'} type="file" accept={needsAffidavit ? 'application/pdf,image/png,image/jpeg' : 'image/png,image/jpeg'} onChange={chooseDocument} required /><small>{proof ? `Attached: ${proof.name}` : 'Your document will be available to the admin reviewing this request.'}</small></label>
      <div className="replacement-payment"><label className="input-group"><span>Payment reference <em>Optional</em></span><input value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="e.g. OPC-2026-00123" /></label><label className="input-group replacement-upload"><span>Payment confirmation <em>PDF, PNG, or JPEG · up to 5 MB</em></span><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={choosePaymentReceipt} /><small>{paymentReceipt ? `Attached: ${paymentReceipt.name}` : 'Attach your official receipt if you have it.'}</small></label></div>
      <fieldset className="photo-choice"><legend>Photo on replacement ID</legend><label><input type="radio" name="photoChoice" value="old" checked={photoChoice === 'old'} onChange={() => setPhotoChoice('old')} /> Reuse my current ID photo</label><label><input type="radio" name="photoChoice" value="new" checked={photoChoice === 'new'} onChange={() => setPhotoChoice('new')} /> Take a new photo at UPRESS</label>{photoChoice === 'new' && <small>UPRESS staff will capture your photo when you visit the desk.</small>}</fieldset>
      <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy || !cardId}>{busy ? 'Submitting…' : 'Submit replacement request'}</button></div>
    </form>
  </div>;
}
