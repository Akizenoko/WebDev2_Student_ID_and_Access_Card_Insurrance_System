import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Arle from '../assets/Arle.png';

function AdminDashboard({ currentUser, onSelectApp }) {
  const [applications, setApplications] = useState([]);
  const [cards, setCards] = useState([]);
  const [reissuances, setReissuances] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [apps, cardList, reissueList] = await Promise.all([
        api.getApplications({ search, status: statusFilter, type: typeFilter }),
        api.getCards(),
        api.getReissuanceRequests(),
      ]);
      setApplications(apps);
      setCards(cardList);
      setReissuances(reissueList);
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [search, statusFilter, typeFilter]);

  const totalApps = applications.length;
  const submittedCount = applications.filter(a => a.status === 'submitted').length;
  const processingCount = applications.filter(a => a.status === 'processing').length;
  const readyCount = applications.filter(a => a.status === 'ready').length;
  const releasedCount = applications.filter(a => a.status === 'released').length;

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
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
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
            Issuance Applications Queue ({applications.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Official Verification Queue
          </span>
        </div>

        {loading ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading records...</div>
        ) : applications.length === 0 ? (
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
                {applications.map(app => {
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
                              {student ? `${student.first_name} ${student.last_name}` : 'Unknown'}
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
      </div>

    </div>
  );
}

export default AdminDashboard;
