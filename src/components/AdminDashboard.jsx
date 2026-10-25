import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Arle from '../assets/Arle.png';
import { formatFullName } from '../utils/formatName';

function AdminDashboard({ currentUser, onSelectApp }) {
  const [applications, setApplications] = useState([]);
  const [cards, setCards] = useState([]);
  const [reissuances, setReissuances] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [apps, cardList, reissueList, everything] = await Promise.all([
        api.getApplications({ search, status: statusFilter, type: typeFilter }),
        api.getCards(),
        api.getReissuanceRequests(),
        api.getApplications({ search: '', status: 'all', type: 'all' }),
      ]);
      setAllApps(Array.isArray(everything) ? everything : []);
      setApplications(Array.isArray(apps) ? apps : []);
      setCards(Array.isArray(cardList) ? cardList : []);
      setReissuances(Array.isArray(reissueList) ? reissueList : []);
    } catch (err) {
      console.error('Error fetching admin data', err);
      setApplications([]);
      setCards([]);
      setReissuances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  const timer = setTimeout(() => setSearch(searchInput), 300);
  return () => clearTimeout(timer);
}, [searchInput]);
  
  useEffect(() => {
    loadAll();
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
  setPage(1);
}, [search, statusFilter, typeFilter, dateFrom, dateTo]);

  const visibleApps = applications.filter(app => {
  const submitted = new Date(app.submitted_at);
    if (dateFrom && submitted < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && submitted > new Date(`${dateTo}T23:59:59.999`)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(visibleApps.length / PAGE_SIZE));
  const pagedApps = visibleApps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalApps = allApps.length;
  const submittedCount = allApps.filter(a => a.status === 'submitted').length;
  const processingCount = allApps.filter(a => a.status === 'processing').length;
  const readyCount = allApps.filter(a => a.status === 'ready').length;
  const releasedCount = allApps.filter(a => a.status === 'released').length;
  const rejectedCount = allApps.filter(a => a.status === 'rejected').length;

  return (
    <div style={{ padding: '0 50px 60px 50px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.5rem' }}>
            Administrative Control Center
          </h2>
          <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
            Process applications, manage status lifecycle, and issue official university ID & access cards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.85rem' }}
            onClick={loadAll}
          >
            <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#232225', padding: '18px', borderRadius: '12px', border: '1px solid #3d3b3f' }}>
          <span style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Total Applications</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>{totalApps}</div>
        </div>

        <div style={{ background: '#232225', padding: '18px', borderRadius: '12px', border: '1px solid #3d3b3f' }}>
          <span style={{ fontSize: '0.78rem', color: '#60a5fa', textTransform: 'uppercase', fontWeight: 600 }}>Submitted (Pending)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '6px' }}>{submittedCount}</div>
        </div>

        <div style={{ background: '#232225', padding: '18px', borderRadius: '12px', border: '1px solid #3d3b3f' }}>
          <span style={{ fontSize: '0.78rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>In Processing</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24', marginTop: '6px' }}>{processingCount}</div>
        </div>

        <div style={{ background: '#232225', padding: '18px', borderRadius: '12px', border: '1px solid #3d3b3f' }}>
          <span style={{ fontSize: '0.78rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 600 }}>Ready for Pickup</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', marginTop: '6px' }}>{readyCount}</div>
        </div>

        <div style={{ background: '#232225', padding: '18px', borderRadius: '12px', border: '1px solid #3d3b3f' }}>
          <span style={{ fontSize: '0.78rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 600 }}>Released Cards</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>{releasedCount}</div>
        </div>

        <div style={{ background: '#232225', padding: '18px', borderRadius: '12px', border: '1px solid #3d3b3f' }}>
          <span style={{ fontSize: '0.78rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>Rejected</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '6px' }}>{rejectedCount}</div>
        </div>

      </div>

      <div style={{
        background: '#232225',
        borderRadius: '14px',
        border: '1px solid #3d3b3f',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by Application #, Student Number, or Name..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready for Pickup</option>
            <option value="released">Released</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            className="form-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="all">All Card Types</option>
            <option value="New ID">New ID</option>
            <option value="Access Card">Access Card</option>
            <option value="Replacement">Replacement</option>
          </select>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
            Submitted From
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)}
              style={{ width: '160px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
            Submitted To
            <input
              type="date"
              className="form-input"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              style={{ width: '160px' }}
            />
          </label>
          {(dateFrom || dateTo) && (
            <button type="button" className="btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>
              Clear dates
            </button>
          )}
        </div>
      </div>

      <div style={{
        background: '#232225',
        borderRadius: '16px',
        border: '1px solid #3d3b3f',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #363438', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem' }}>
            Insurance Applications Queue ({visibleApps.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Official Verification Queue
          </span>
        </div>

        {loading ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading records...</div>
        ) : visibleApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9ca3af' }}>
            No applications found matching the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#1c1b1d', borderBottom: '1px solid #363438', color: '#9ca3af' }}>
                  <th style={{ padding: '12px 20px' }}>App No & Type</th>
                  <th style={{ padding: '12px 20px' }}>Applicant</th>
                  <th style={{ padding: '12px 20px' }}>Program / Year</th>
                  <th style={{ padding: '12px 20px' }}>Submitted Date</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedApps.map(app => {
                  const student = app.student;
                  const photoSrc = app.photo?.storage_path?.startsWith('/assets/Arle.png')
                    ? Arle
                    : (app.photo?.storage_path || Arle);

                  return (
                    <tr
                      key={app.id}
                      style={{ borderBottom: '1px solid #2d2c30', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#28272b'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{app.application_no}</div>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#f87171',
                          background: 'rgba(194,47,47,0.15)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginTop: '4px'
                        }}>
                          {app.type}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={photoSrc}
                            alt="Applicant"
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #555' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: '#ffffff' }}>
                              {formatFullName(student)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              {student?.student_number}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 20px', color: '#d1d5db' }}>
                        <div>{student?.program || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{student?.year_level}</div>
                      </td>

                      <td style={{ padding: '14px 20px', color: '#9ca3af', fontSize: '0.82rem' }}>
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '14px 20px' }}>
                        <span className={`status-pill status-${app.status}`}>
                          {app.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                          onClick={() => onSelectApp(app)}
                        >
                          <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i>
                          Review & Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
          {!loading && visibleApps.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid #363438' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </button>
              <button type="button" className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        background: '#232225',
        border: '1px solid #3a393d',
        borderRadius: '16px',
        marginTop: '24px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #3a393d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Reinsurance Requests ({reissuances.length})</h3>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Lost / Damaged Card Replacements</span>
        </div>

        {reissuances.length === 0 ? (
          <p style={{ padding: '24px 28px', color: '#9ca3af', margin: 0 }}>No reinsurance requests yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: '0.85rem' }}>
                <th style={{ padding: '14px 28px' }}>Application No</th>
                <th>Student</th>
                <th>Card No</th>
                <th>Reason</th>
                <th>Fee</th>
                <th>Date Filed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reissuances.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #3a393d' }}>
                  <td style={{ padding: '14px 28px', fontWeight: 600 }}>{r.application?.application_no || '-'}</td>
                  <td>
                    <div>{formatFullName(r.student)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.student?.student_number}</div>
                  </td>
                  <td>{r.card?.card_number || '-'}</td>
                  <td>{r.reason}</td>
                  <td>₱{Number(r.fee_amount).toFixed(2)}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b'
                    }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

export default AdminDashboard;
