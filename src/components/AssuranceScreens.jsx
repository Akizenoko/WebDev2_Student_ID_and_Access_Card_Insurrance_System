import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Pagination } from './Pagination';
import { usePaged } from '../hooks/usePaged';

const label = value => String(value || '—').replaceAll('_', ' ');
const date = value => value ? String(value).slice(0, 10) : '—';
const displayName = student => student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : 'Student';

function Section({ kicker, title, children, actions }) {
  return <section className="surface table-surface">
    <div className="section-title"><div><p className="kicker">{kicker}</p><h2>{title}</h2></div>{actions}</div>
    {children}
  </section>;
}

function Row({ cells, children }) {
  return <article className="issued-row">{cells.map((cell, index) => <div key={index}><strong>{cell.strong ?? cell}</strong>{cell.sub && <span>{cell.sub}</span>}</div>)}{children}</article>;
}

function ErrorLine({ error }) { return error ? <div className="auth-error" role="alert">{error}</div> : null; }

// ---------------------------------------------------------------------------
// Facilities and facility permissions
// ---------------------------------------------------------------------------
export function Facilities({ staff, cards }) {
  const [facilities, setFacilities] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', code: '', location: '' });
  const [grant, setGrant] = useState({ card_id: '', facility_id: '', valid_from: '', valid_until: '' });
  const facilityPager = usePaged(facilities);
  const permissionPager = usePaged(permissions);
  const load = async () => {
    try {
      const [f, p] = await Promise.all([api.getFacilities(), api.getPermissions()]);
      setFacilities(f); setPermissions(p);
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, []);
  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const updateGrant = event => setGrant(current => ({ ...current, [event.target.name]: event.target.value }));

  const addFacility = async event => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await api.createFacility(form);
      setForm({ name: '', code: '', location: '' }); setNotice('Facility added.'); await load();
    } catch (err) { setError(err.message); }
  };
  const grantAccess = async event => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await api.grantPermission(Number(grant.facility_id), {
        card_id: Number(grant.card_id), valid_from: grant.valid_from || undefined, valid_until: grant.valid_until || undefined,
      });
      setNotice('Facility permission saved.'); await load();
    } catch (err) { setError(err.message); }
  };
  const revoke = async id => {
    setError(''); setNotice('');
    try { await api.revokePermission(id); setNotice('Permission revoked.'); await load(); }
    catch (err) { setError(err.message); }
  };
  const deactivate = async id => {
    setError(''); setNotice('');
    try { await api.deactivateFacility(id); setNotice('Facility deactivated.'); await load(); }
    catch (err) { setError(err.message); }
  };

  return <>
    <ErrorLine error={error} />{notice && <div className="portal-notice">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}
    {staff && <div className="module-grid">
      <form className="surface module-form" onSubmit={addFacility}>
        <h3>Register a facility</h3>
        <label className="input-group"><span>Facility name</span><input name="name" value={form.name} onChange={updateForm} required /></label>
        <label className="input-group"><span>Access code</span><input name="code" value={form.code} onChange={updateForm} required /></label>
        <label className="input-group"><span>Location</span><input name="location" value={form.location} onChange={updateForm} /></label>
        <button className="button button-primary">Add facility</button>
      </form>
      <form className="surface module-form" onSubmit={grantAccess}>
        <h3>Assign a permission</h3>
        <label className="input-group"><span>Card</span><select name="card_id" value={grant.card_id} onChange={updateGrant} required><option value="">Select card</option>{cards.map(card => <option key={card.id} value={card.id}>{card.card_number} · {card.student?.student_number}</option>)}</select></label>
        <label className="input-group"><span>Facility</span><select name="facility_id" value={grant.facility_id} onChange={updateGrant} required><option value="">Select facility</option>{facilities.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <div className="split-fields"><label className="input-group"><span>Valid from</span><input type="date" name="valid_from" value={grant.valid_from} onChange={updateGrant} /></label><label className="input-group"><span>Valid until</span><input type="date" name="valid_until" value={grant.valid_until} onChange={updateGrant} /></label></div>
        <button className="button button-primary">Save permission</button>
      </form>
    </div>}
    <Section kicker="ACCESS ZONES" title={staff ? 'Registered facilities' : 'Permitted facilities'}>
      <div className="application-list">{facilityPager.items.map(f => <Row key={f.id} cells={[{ strong: f.name, sub: f.code }, { strong: f.location || 'No location set', sub: `${f.active_permissions} active permission(s)` }, { strong: f.is_active ? 'Active' : 'Inactive' }]}>
        {staff && <button className="button button-compact" disabled={!f.is_active} onClick={() => deactivate(f.id)}>Deactivate</button>}
      </Row>)}</div>
      <Pagination {...facilityPager} onPage={facilityPager.setPage} />
    </Section>
    <Section kicker="CREDENTIAL RIGHTS" title={staff ? 'Assigned permissions' : 'My access permissions'}>
      <div className="application-list">{permissionPager.items.map(p => <Row key={p.id} cells={[{ strong: p.facility_name, sub: p.facility_code }, { strong: p.card_number, sub: p.credential_ref }, { strong: p.student_number, sub: `${p.first_name} ${p.last_name}` }, { strong: `${date(p.valid_from)} – ${date(p.valid_until)}` }, { strong: p.is_active ? 'Active' : 'Revoked' }]}>
        {staff && p.is_active && <button className="button button-danger-quiet" onClick={() => revoke(p.id)}>Revoke</button>}
      </Row>)}</div>
      <Pagination {...permissionPager} onPage={permissionPager.setPage} />
    </Section>
  </>;
}

// ---------------------------------------------------------------------------
// Simulated card scanning and access attempts
// ---------------------------------------------------------------------------
export function AccessControl({ staff, cards, onRefresh }) {
  const [facilities, setFacilities] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [scan, setScan] = useState({ rfid_uid: '', facility_code: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accessControl, setAccessControl] = useState({ card_id: '', access_status: 'active', reason: '' });
  const [physicalControl, setPhysicalControl] = useState({ card_id: '', status: 'active', reason: '' });
  const [reference, setReference] = useState('');
  const [referenceResult, setReferenceResult] = useState(null);
  const pager = usePaged(attempts);
  const accessStates = ['unregistered', 'registered', 'requested', 'pending_activation', 'active', 'suspended', 'inactive', 'revoked'];
  const physicalStates = ['pending_production', 'ready_for_release', 'issued', 'active', 'lost', 'damaged', 'replaced', 'expired', 'suspended', 'revoked'];
  const load = useCallback(async () => {
    try {
      const [f, a] = await Promise.all([api.getFacilities(), staff ? api.getAccessAttempts() : api.getMyAccessAttempts()]);
      setFacilities(f); setAttempts(a);
    } catch (err) { setError(err.message); }
  }, [staff]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [staff, load]);
  const runScan = async event => {
    event.preventDefault(); setError(''); setNotice(''); setResult(null);
    const payload = scan; setScan(s => ({ ...s, rfid_uid: '' })); try { const outcome = await api.checkAccess(payload); setResult(outcome); await load(); }
    catch (err) { setError(err.message); }
  };
  const saveAccessStatus = async event => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await api.setAccessStatus(Number(accessControl.card_id), accessControl.access_status, accessControl.reason);
      setNotice('Access credential status updated.');
      await load(); onRefresh?.();
    } catch (err) { setError(err.message); }
  };
  const savePhysicalStatus = async event => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await api.setCardStatus(Number(physicalControl.card_id), physicalControl.status, physicalControl.reason);
      setNotice('Physical ID status updated.');
      await load(); onRefresh?.();
    } catch (err) { setError(err.message); }
  };
  const checkReference = async event => {
    event.preventDefault(); setError(''); setNotice(''); setReferenceResult(null);
    try { setReferenceResult(await api.checkCredential(reference)); }
    catch (err) { setError(err.message); }
  };
  return <>
    <ErrorLine error={error} />{notice && <div className="portal-notice">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}
    {staff && <div className="module-grid">
      <form className="surface module-form" onSubmit={saveAccessStatus}>
        <h3>Credential / access state</h3>
        <label className="input-group"><span>Card</span><select value={accessControl.card_id} onChange={e => setAccessControl(s => ({ ...s, card_id: e.target.value }))} required><option value="">Select card</option>{cards.map(card => <option key={card.id} value={card.id}>{card.card_number} · {card.credential_ref || 'no reference'}</option>)}</select></label>
        <label className="input-group"><span>Access status</span><select value={accessControl.access_status} onChange={e => setAccessControl(s => ({ ...s, access_status: e.target.value }))}>{accessStates.map(state => <option key={state}>{state}</option>)}</select></label>
        <label className="input-group"><span>Reason <em>Recommended</em></span><input value={accessControl.reason} onChange={e => setAccessControl(s => ({ ...s, reason: e.target.value }))} placeholder="e.g. activation approved" /></label>
        <button className="button button-primary">Save access state</button>
      </form>
      <form className="surface module-form" onSubmit={savePhysicalStatus}>
        <h3>Physical ID state</h3>
        <label className="input-group"><span>Card</span><select value={physicalControl.card_id} onChange={e => setPhysicalControl(s => ({ ...s, card_id: e.target.value }))} required><option value="">Select card</option>{cards.map(card => <option key={card.id} value={card.id}>{card.card_number} · {displayName(card.student)}</option>)}</select></label>
        <label className="input-group"><span>Physical status</span><select value={physicalControl.status} onChange={e => setPhysicalControl(s => ({ ...s, status: e.target.value }))}>{physicalStates.map(state => <option key={state}>{state}</option>)}</select></label>
        <label className="input-group"><span>Reason <em>Required for lost, replaced, suspended, revoked</em></span><input value={physicalControl.reason} onChange={e => setPhysicalControl(s => ({ ...s, reason: e.target.value }))} placeholder="State why the status changed" /></label>
        <button className="button button-primary">Save physical state</button>
      </form>
      <form className="surface module-form" onSubmit={checkReference}>
        <h3>Credential duplicate check</h3>
        <label className="input-group"><span>Credential reference</span><input value={reference} onChange={e => setReference(e.target.value)} placeholder="CRD-XXXXXXXX" required /></label>
        <button className="button button-secondary">Check reference</button>
        {referenceResult && <div className={`scan-result ${referenceResult.available ? '' : 'denied'}`}><strong>{referenceResult.available ? 'REFERENCE AVAILABLE' : 'ALREADY ASSIGNED'}</strong><span>{referenceResult.message}</span></div>}
      </form>
    </div>}
    {staff && <form className="surface module-form scan-form" onSubmit={runScan}>
      <h3>Simulated card scan</h3><p className="muted">The reader types the UID and submits when it sends Enter.</p>
      <div className="split-fields">
        <label className="input-group"><span>Tap card</span><input autoFocus value={scan.rfid_uid} onChange={e => setScan(s => ({ ...s, rfid_uid: e.target.value }))} placeholder="Tap card on reader" required /></label>
        <label className="input-group"><span>Facility</span><select value={scan.facility_code} onChange={e => setScan(s => ({ ...s, facility_code: e.target.value }))} required><option value="">Select facility</option>{facilities.filter(f => f.is_active).map(f => <option key={f.id} value={f.code}>{f.name} ({f.code})</option>)}</select></label>
      </div>
      <button className="button button-primary">Run access check</button>
      {result && <div className={`scan-result ${result.result}`}><strong>{result.result === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</strong><span>{result.reason || 'Credential, validity and facility permission confirmed.'}</span>{result.card && <span>{result.card.name} · {result.card.student_number} · {result.card.card_number}</span>}</div>}
    </form>}
    {!staff && <Section kicker="DIGITAL CREDENTIALS" title="My access credentials">
      <div className="application-list">{cards.map(card => <Row key={card.id} cells={[{ strong: card.card_number, sub: card.credential_ref || 'Reference pending' }, { strong: label(card.access_status) }, { strong: date(card.valid_until) }]} />)}</div>
    </Section>}
    <Section kicker="ACCESS LOG" title={staff ? 'Access attempts' : 'My access history'}>
      <div className="application-list">{pager.items.map(attempt => <Row key={attempt.id} cells={[{ strong: attempt.facility_name || attempt.facility_code || 'Unknown facility', sub: new Date(attempt.scanned_at).toLocaleString() }, { strong: attempt.credential_ref || '—', sub: attempt.card_number || '' }, { strong: attempt.student_number || '—', sub: attempt.first_name ? `${attempt.first_name} ${attempt.last_name}` : '' }, { strong: attempt.result === 'granted' ? 'Granted' : 'Denied', sub: attempt.reason || '' }]} />)}</div>
      <Pagination {...pager} onPage={pager.setPage} />
    </Section>
  </>;
}

// ---------------------------------------------------------------------------
// Semester revalidation / reassurance
// ---------------------------------------------------------------------------
export function Revalidation({ staff }) {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [semester, setSemester] = useState(`${new Date().getFullYear()}-First`);
  const [file, setFile] = useState(null);
  const [review, setReview] = useState(null);
  const [remarks, setRemarks] = useState('');
  const pager = usePaged(records);
  const load = async () => {
    try { setRecords(await api.getRevalidations()); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, []);
  const chooseFile = event => {
    const selected = event.target.files?.[0];
    if (!selected) return setFile(null);
    if (!['image/png', 'image/jpeg'].includes(selected.type)) return setError('Upload a PNG or JPEG of your current COR');
    if (selected.size > 2 * 1024 * 1024) return setError('COR image must be 2 MB or smaller');
    setError(''); setFile(selected);
  };
  const submit = async event => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      const uploaded = await api.uploadFile({ kind: 'cor', storage_path: await toDataUrl(file), original_name: file.name });
      await api.submitRevalidation({ semester, cor_file_id: uploaded.id });
      setFile(null); setNotice('COR submitted for semester validation.'); await load();
    } catch (err) { setError(err.message); }
  };
  const decide = async event => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await api.reviewRevalidation(review.record.id, { status: review.status, remarks });
      setReview(null); setRemarks(''); setNotice('Revalidation decision saved.'); await load();
    } catch (err) { setError(err.message); }
  };
  return <>
    <ErrorLine error={error} />{notice && <div className="portal-notice">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}
    {!staff && <form className="surface module-form" onSubmit={submit}>
      <h3>Confirm your enrollment for a new semester</h3>
      <label className="input-group"><span>Semester</span><input value={semester} onChange={e => setSemester(e.target.value)} placeholder="2026-First" pattern="\d{4}-(First|Second|Summer)" required /></label>
      <label className="input-group"><span>Current Certificate of Registration</span><input className="file-input" type="file" accept="image/png,image/jpeg" onChange={chooseFile} required /></label>
      <button className="button button-primary">Submit for review</button>
    </form>}
    <Section kicker="REASSURANCE" title={staff ? 'Semester revalidation queue' : 'My revalidation history'}>
      <div className="application-list">{pager.items.map(r => <Row key={r.id} cells={[{ strong: `${r.student_number}`, sub: `${r.first_name} ${r.last_name}` }, { strong: r.semester, sub: `${r.active_cards} active card(s)` }, { strong: label(r.status) }, { strong: r.reviewed_at ? date(r.reviewed_at) : 'Awaiting review', sub: r.reviewer_email || '' }, { strong: r.remarks || '—' }]}>
        <div className="inline-actions">{r.cor_path && <a className="text-button" href={r.cor_path} target="_blank" rel="noreferrer">View COR</a>}{staff && <>
          <button className="button button-compact" onClick={() => setReview({ record: r, status: 'verified' })}>Verify</button>
          <button className="button button-compact" onClick={() => setReview({ record: r, status: 'for_review' })}>For review</button>
          <button className="button button-danger-quiet" onClick={() => setReview({ record: r, status: 'ineligible' })}>Ineligible</button>
        </>}</div>
      </Row>)}</div>
      <Pagination {...pager} onPage={pager.setPage} />
    </Section>
    {review && <div className="dialog-backdrop" onMouseDown={() => setReview(null)}><form className="request-dialog" onMouseDown={e => e.stopPropagation()} onSubmit={decide}><div className="dialog-header"><div><p className="kicker">SEMESTER DECISION</p><h2>{label(review.status)}</h2></div><button type="button" className="dialog-close" onClick={() => setReview(null)}>×</button></div><p className="muted">Record a note for {review.record.student_number} for the {review.record.semester} semester.</p><ErrorLine error={error} /><label className="input-group"><span>Remarks {review.status === 'ineligible' && <em>Required</em>}</span><textarea rows="3" value={remarks} onChange={e => setRemarks(e.target.value)} required={review.status === 'ineligible'} placeholder="State the enrollment finding" /></label><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setReview(null)}>Cancel</button><button className="button button-primary">Save decision</button></div></form></div>}
  </>;
}

// ---------------------------------------------------------------------------
// Lost-ID reports and verification
// ---------------------------------------------------------------------------
export function LossReports({ staff }) {
  const [reports, setReports] = useState([]);
  const [verify, setVerify] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isLoss = report => /lost|stolen/i.test(report.reason || '');
  const visible = staff ? reports : reports.filter(isLoss);
  const pager = usePaged(visible);
  const load = async () => {
    try { setReports(await api.getReissuanceRequests()); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, []);
  const decide = async event => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await api.verifyLossReport(verify.report.id, { decision: verify.decision, remarks });
      setVerify(null); setRemarks(''); setNotice('Lost-ID report decision saved.'); await load();
    } catch (err) { setError(err.message); }
  };
  return <>
    <ErrorLine error={error} />{notice && <div className="portal-notice">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}
    <Section kicker="LOSS & REPLACEMENT" title={staff ? 'Lost-ID reports' : 'My loss and replacement reports'}>
      <div className="application-list">{pager.items.map(r => <Row key={r.id} cells={[{ strong: `${r.student?.first_name} ${r.student?.last_name}`, sub: r.student?.student_number }, { strong: r.original_card_number, sub: r.application?.application_no }, { strong: r.reason, sub: r.date_lost ? `Lost ${date(r.date_lost)}` : '' }, { strong: label(r.verification_status), sub: r.verified_by_email || '' }, { strong: r.payment_reference || 'No payment reference' }]}>
        <div className="inline-actions">{r.proof_path && <a className="text-button" href={r.proof_path} target="_blank" rel="noreferrer">Affidavit</a>}{staff && <>
          <button className="button button-compact" onClick={() => setVerify({ report: r, decision: 'verified' })}>Verify</button>
          <button className="button button-danger-quiet" onClick={() => setVerify({ report: r, decision: 'rejected' })}>Reject</button>
        </>}</div>
      </Row>)}</div>
      <Pagination {...pager} onPage={pager.setPage} />
    </Section>
    {verify && <div className="dialog-backdrop" onMouseDown={() => setVerify(null)}><form className="request-dialog" onMouseDown={e => e.stopPropagation()} onSubmit={decide}><div className="dialog-header"><div><p className="kicker">LOSS REPORT REVIEW</p><h2>{verify.decision === 'verified' ? 'Verify this report?' : 'Reject this report?'}</h2></div><button type="button" className="dialog-close" onClick={() => setVerify(null)}>×</button></div><p className="muted">Verifying suspends the old card credential immediately. The replacement still moves through the application queue.</p><ErrorLine error={error} /><label className="input-group"><span>Review remarks</span><textarea rows="3" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add a note for the record" /></label><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setVerify(null)}>Cancel</button><button className={`button ${verify.decision === 'verified' ? 'button-primary' : 'button-danger'}`}>Save decision</button></div></form></div>}
  </>;
}

// ---------------------------------------------------------------------------
// Assurance dashboard
// ---------------------------------------------------------------------------
function ChartCard({ title, subtitle, children }) {
  return <article className="surface chart-card">
    <div className="chart-head"><p className="kicker">ANALYTICS</p><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
    {children}
  </article>;
}

function BarList({ rows, color = '#1f7a5c' }) {
  const max = Math.max(1, ...rows.map(row => Number(row.count) || 0));
  return <div className="bar-list">
    {rows.length ? rows.map(row => <div className="bar-row" key={row.status ?? row.label}>
      <span className="bar-label">{label(row.status ?? row.label)}</span>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${((Number(row.count) || 0) / max) * 100}%`, background: color }} /></div>
      <strong>{row.count}</strong>
    </div>) : <p className="muted">No records yet.</p>}
  </div>;
}

function AccessDonut({ scans, denied }) {
  const granted = Math.max(0, Number(scans) - Number(denied));
  const percent = scans ? (granted / scans) * 100 : 0;
  const background = scans
    ? `conic-gradient(#2e8b57 0 ${percent}%, #e2495b ${percent}% 100%)`
    : '#e6ece9';
  return <div className="donut-wrap">
    <div className="donut" style={{ background }}>
      <div className="donut-hole"><strong>{scans}</strong><span>scans today</span></div>
    </div>
    <div className="donut-legend">
      <div><i className="legend-granted" /><span>Granted</span><strong>{granted}</strong></div>
      <div><i className="legend-denied" /><span>Denied</span><strong>{denied}</strong></div>
    </div>
  </div>;
}

function TrendBars({ rows }) {
  const max = Math.max(1, ...rows.map(row => Number(row.count) || 0));
  return <div className="trend-bars">
    {rows.length ? rows.map(row => <div className="trend-column" key={row.sort_key ?? row.month}>
      <div className="trend-track"><div className="trend-fill" style={{ height: `${Math.max(3, ((Number(row.count) || 0) / max) * 100)}%` }} /></div>
      <strong>{row.count}</strong><span>{row.month}</span>
    </div>) : <p className="muted">No applications in the last six months.</p>}
  </div>;
}

export function ReportsOverview() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.getReportSummary().then(setSummary).catch(err => setError(err.message)); }, []);
  if (error) return <ErrorLine error={error} />;
  if (!summary) return <p className="muted">Loading report…</p>;
  const cards = [
    ['Open applications', summary.open_applications], ['Pending access requests', summary.pending_access_requests],
    ['Pending loss reports', summary.pending_loss_reports], ['Pending revalidations', summary.pending_revalidations],
    ['Active access cards', summary.active_access_cards], ['Blocked access cards', summary.blocked_access_cards],
    ['Active facilities', summary.active_facilities], ['Scans today', summary.scans_today],
    ['Denied attempts today', summary.denied_today], ['Revalidations for review', summary.revalidations_for_review],
  ];
  return <div className="report-stack">
    <section className="surface table-surface"><div className="section-title"><div><p className="kicker">ASSURANCE REPORT</p><h2>Operations summary</h2></div></div><div className="summary-grid">{cards.map(([name, value]) => <article className="metric-card" key={name}><div><span>{name}</span><strong>{value}</strong></div></article>)}</div></section>
    <div className="chart-grid">
      <ChartCard title="Applications by status" subtitle="Current queue distribution"><BarList rows={summary.application_statuses || []} /></ChartCard>
      <ChartCard title="Access scans today" subtitle="Granted against denied attempts"><AccessDonut scans={summary.scans_today} denied={summary.denied_today} /></ChartCard>
      <ChartCard title="Card statuses" subtitle="Physical credential records"><BarList rows={summary.card_statuses || []} color="#3f6fa3" /></ChartCard>
      <ChartCard title="Revalidation statuses" subtitle="Semester validation progress"><BarList rows={summary.revalidation_statuses || []} color="#b27635" /></ChartCard>
      <ChartCard title="Applications, last 6 months" subtitle="Submission trend"><TrendBars rows={summary.monthly_applications || []} /></ChartCard>
      <ChartCard title="Top scanned facilities" subtitle="Most accessed campus locations"><BarList rows={summary.facility_scans || []} color="#8a63a8" /></ChartCard>
    </div>
  </div>;
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected file'));
    reader.readAsDataURL(file);
  });
}
