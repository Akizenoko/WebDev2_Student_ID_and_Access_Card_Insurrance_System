import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Arle from '../assets/Arle.png';
import { formatFullName } from '../utils/formatName';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

function AdminDashboard({ onSelectApp, onViewCard }) {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'cards' | 'reissuance'
  const [applications, setApplications] = useState([]);
  const [cards, setCards] = useState([]);
  const [reissuances, setReissuances] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Applications filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState('submitted_at');
  const [sortDir, setSortDir] = useState('desc');

  // Card records filters
  const [cardSearch, setCardSearch] = useState('');
  const [cardStatusFilter, setCardStatusFilter] = useState('all');
  const [cardTypeFilter, setCardTypeFilter] = useState('all');

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

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
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let ignore = false;
    async function fetchAdminData() {
      try {
        setLoading(true);
        const [apps, cardList, reissueList, everything] = await Promise.all([
          api.getApplications({ search, status: statusFilter, type: typeFilter }),
          api.getCards(),
          api.getReissuanceRequests(),
          api.getApplications({ search: '', status: 'all', type: 'all' }),
        ]);
        if (!ignore) {
          setAllApps(Array.isArray(everything) ? everything : []);
          setApplications(Array.isArray(apps) ? apps : []);
          setCards(Array.isArray(cardList) ? cardList : []);
          setReissuances(Array.isArray(reissueList) ? reissueList : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching admin data', err);
          setApplications([]);
          setCards([]);
          setReissuances([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchAdminData();
    return () => { ignore = true; };
  }, [search, statusFilter, typeFilter]);

  // Export applications to CSV
  const handleExportApplicationsCSV = () => {
    if (!visibleApps.length) {
      alert('No applications to export.');
      return;
    }
    const headers = ['Application No', 'Type', 'Status', 'Student Number', 'Student Name', 'Program', 'Year Level', 'Submitted Date', 'Remarks'];
    const rows = visibleApps.map(a => [
      a.application_no,
      a.type,
      a.status,
      a.student?.student_number || '',
      formatFullName(a.student),
      a.student?.program || '',
      a.student?.year_level || '',
      new Date(a.submitted_at).toLocaleDateString(),
      (a.remarks || '').replace(/"/g, '""'),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(f => `"${f}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WMSU_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export card records to CSV
  const handleExportCardsCSV = () => {
    if (!filteredCards.length) {
      alert('No card records to export.');
      return;
    }
    const headers = ['Card Number', 'Card Type', 'Status', 'Student Number', 'Student Name', 'Program', 'Issue Date', 'Valid Until'];
    const rows = filteredCards.map(c => [
      c.card_number,
      c.card_type || 'Student ID',
      c.status,
      c.student?.student_number || '',
      formatFullName(c.student),
      c.student?.program || '',
      formatDate(c.issue_date),
      formatDate(c.valid_until),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(f => `"${f}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WMSU_Card_Records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleApps = applications.filter(app => {
    const submitted = new Date(app.submitted_at);
    if (dateFrom && submitted < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && submitted > new Date(`${dateTo}T23:59:59.999`)) return false;
    return true;
  });

  const sortedApps = [...visibleApps].sort((a, b) => {
    let x, y;
    if (sortKey === 'submitted_at') {
      x = new Date(a.submitted_at); y = new Date(b.submitted_at);
    } else if (sortKey === 'applicant') {
      x = (a.student?.last_name || '').toLowerCase();
      y = (b.student?.last_name || '').toLowerCase();
    } else if (sortKey === 'status') {
      x = a.status; y = b.status;
    } else {
      x = a.application_no; y = b.application_no;
    }
    if (x < y) return sortDir === 'asc' ? -1 : 1;
    if (x > y) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(visibleApps.length / PAGE_SIZE));
  const pagedApps = sortedApps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Cards filtering
  const filteredCards = cards.filter(c => {
    if (cardStatusFilter !== 'all' && c.status?.toLowerCase() !== cardStatusFilter.toLowerCase()) {
      return false;
    }
    if (cardTypeFilter !== 'all' && (c.card_type || 'Student ID') !== cardTypeFilter) {
      return false;
    }
    if (cardSearch.trim()) {
      const q = cardSearch.toLowerCase().trim();
      const cardNum = (c.card_number || '').toLowerCase();
      const sNum = (c.student?.student_number || '').toLowerCase();
      const sName = `${c.student?.first_name || ''} ${c.student?.last_name || ''}`.toLowerCase();
      return cardNum.includes(q) || sNum.includes(q) || sName.includes(q);
    }
    return true;
  });

  const totalApps = allApps.length;
  const submittedCount = allApps.filter(a => a.status === 'submitted').length;
  const processingCount = allApps.filter(a => a.status === 'processing').length;
  const readyCount = allApps.filter(a => a.status === 'ready').length;
  const releasedCount = allApps.filter(a => a.status === 'released').length;
  const rejectedCount = allApps.filter(a => a.status === 'rejected').length;
  const activeCardsCount = cards.filter(c => c.status === 'active').length;

  return (
    <div style={{ padding: '0 50px 60px 50px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={Arle}
            alt="Admin Profile"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgb(194, 47, 47)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              flexShrink: 0
            }}
          />
          <div>
            <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.5rem' }}>
              Administrative Control Center
            </h2>
            <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              Process applications, manage card records, and handle reissuance requests.
            </p>
          </div>
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

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
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

        <div style={{ background: '#232225', padding: '18px', borderRadius: '12px', border: '1px solid #3d3b3f' }}>
          <span style={{ fontSize: '0.78rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 600 }}>Active Card Records</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>{activeCardsCount}</div>
        </div>
      </div>

      {/* Admin Section Tabs Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #3d3b3f', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          style={{
            background: activeTab === 'applications' ? 'rgb(194, 47, 47)' : '#232225',
            color: '#ffffff',
            border: '1px solid',
            borderColor: activeTab === 'applications' ? 'rgb(194, 47, 47)' : '#3d3b3f',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-clipboard-list"></i>
          Applications Queue ({visibleApps.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          style={{
            background: activeTab === 'cards' ? 'rgb(194, 47, 47)' : '#232225',
            color: '#ffffff',
            border: '1px solid',
            borderColor: activeTab === 'cards' ? 'rgb(194, 47, 47)' : '#3d3b3f',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-id-card"></i>
          Card Records ({cards.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reissuance')}
          style={{
            background: activeTab === 'reissuance' ? 'rgb(194, 47, 47)' : '#232225',
            color: '#ffffff',
            border: '1px solid',
            borderColor: activeTab === 'reissuance' ? 'rgb(194, 47, 47)' : '#3d3b3f',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-rotate-right"></i>
          Reissuance Requests ({reissuances.length})
        </button>
      </div>

      {/* TAB 1: APPLICATIONS QUEUE */}
      {activeTab === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Applications Search & Filter Bar */}
          <div style={{
            background: '#232225',
            borderRadius: '14px',
            border: '1px solid #3d3b3f',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-end',
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

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
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
                <option value="Renewal">Renewal</option>
              </select>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
                Submitted From
                <input
                  type="date"
                  className="form-input"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ width: '150px' }}
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
                  style={{ width: '150px' }}
                />
              </label>

              {(dateFrom || dateTo) && (
                <button type="button" className="btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  Clear dates
                </button>
              )}

              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                onClick={handleExportApplicationsCSV}
                title="Download applications table as CSV"
              >
                <i className="fa-solid fa-file-csv" style={{ marginRight: '6px' }}></i>
                Export CSV
              </button>
            </div>
          </div>

          {/* Applications Table Card */}
          <div style={{
            background: '#232225',
            borderRadius: '16px',
            border: '1px solid #3d3b3f',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #363438', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem' }}>
                ID & Access Card Applications Queue ({visibleApps.length})
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
                      <th style={{ padding: '12px 20px', cursor: 'pointer' }} onClick={() => toggleSort('application_no')}>
                        App No & Type {sortKey === 'application_no' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ padding: '12px 20px', cursor: 'pointer' }} onClick={() => toggleSort('applicant')}>
                        Applicant {sortKey === 'applicant' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ padding: '12px 20px' }}>Program / Year</th>
                      <th style={{ padding: '12px 20px', cursor: 'pointer' }} onClick={() => toggleSort('submitted_at')}>
                        Submitted Date {sortKey === 'submitted_at' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ padding: '12px 20px', cursor: 'pointer' }} onClick={() => toggleSort('status')}>
                        Status {sortKey === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
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
                            {formatDate(app.submitted_at)}
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
        </div>
      )}

      {/* TAB 2: CARD RECORDS MANAGEMENT */}
      {activeTab === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Records Filter Bar */}
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
            <div style={{ flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by Card Number, Student Number, or Name..."
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                value={cardStatusFilter}
                onChange={e => setCardStatusFilter(e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="all">All Card Statuses</option>
                <option value="active">Active</option>
                <option value="lost">Lost</option>
                <option value="damaged">Damaged</option>
                <option value="expired">Expired</option>
              </select>

              <select
                className="form-select"
                value={cardTypeFilter}
                onChange={e => setCardTypeFilter(e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="all">All Card Types</option>
                <option value="Student ID">Student ID</option>
                <option value="Access Card">Access Card</option>
              </select>

              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                onClick={handleExportCardsCSV}
                title="Download card records as CSV"
              >
                <i className="fa-solid fa-file-csv" style={{ marginRight: '6px' }}></i>
                Export CSV
              </button>
            </div>
          </div>

          {/* Cards Records Table */}
          <div style={{
            background: '#232225',
            borderRadius: '16px',
            border: '1px solid #3d3b3f',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #363438', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem' }}>
                Issued Card Records Registry ({filteredCards.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                Official University ID & RFID Access Cards
              </span>
            </div>

            {loading ? (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading card records...</div>
            ) : filteredCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9ca3af' }}>
                No card records found matching filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#1c1b1d', borderBottom: '1px solid #363438', color: '#9ca3af' }}>
                      <th style={{ padding: '12px 20px' }}>Card Number</th>
                      <th style={{ padding: '12px 20px' }}>Card Type</th>
                      <th style={{ padding: '12px 20px' }}>Cardholder</th>
                      <th style={{ padding: '12px 20px' }}>Issue Date</th>
                      <th style={{ padding: '12px 20px' }}>Valid Until (Validity)</th>
                      <th style={{ padding: '12px 20px' }}>Status</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCards.map(c => {
                      const isAccess = c.card_type === 'Access Card' || c.application?.type === 'Access Card';
                      const cardType = isAccess ? 'Access Card' : 'Student ID';
                      const statusColor = c.status === 'active' ? '#34d399' : (c.status === 'lost' ? '#f87171' : (c.status === 'damaged' ? '#fbbf24' : '#9ca3af'));

                      return (
                        <tr
                          key={c.id}
                          style={{ borderBottom: '1px solid #2d2c30', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#28272b'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                              {c.card_number}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                              Card Record #{c.id}
                            </span>
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: isAccess ? 'rgba(56, 189, 248, 0.15)' : 'rgba(194, 47, 47, 0.15)',
                              color: isAccess ? '#38bdf8' : '#f87171'
                            }}>
                              <i className={`fa-solid ${isAccess ? 'fa-id-badge' : 'fa-id-card'}`}></i>
                              {cardType}
                            </span>
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: 600, color: '#ffffff' }}>
                              {formatFullName(c.student)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              {c.student?.student_number} &bull; {c.student?.program}
                            </div>
                          </td>

                          <td style={{ padding: '14px 20px', color: '#d1d5db', fontSize: '0.85rem' }}>
                            {formatDate(c.issue_date)}
                          </td>

                          <td style={{ padding: '14px 20px', color: c.status === 'expired' ? '#f87171' : '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>
                            {formatDate(c.valid_until)}
                          </td>

                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: `${statusColor}22`,
                              color: statusColor,
                              border: `1px solid ${statusColor}66`
                            }}>
                              {c.status}
                            </span>
                          </td>

                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                              onClick={() => onViewCard?.(c)}
                            >
                              <i className="fa-solid fa-eye" style={{ marginRight: '6px' }}></i>
                              View Card Record
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
      )}

      {/* TAB 3: REISSUANCE REQUESTS */}
      {activeTab === 'reissuance' && (
        <div style={{
          background: '#232225',
          border: '1px solid #3a393d',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #3a393d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
                Reissuance Requests ({reissuances.length})
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
                Lost, stolen, or physically damaged card replacement applications
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>
              Standard Fee: ₱150.00
            </span>
          </div>

          {reissuances.length === 0 ? (
            <p style={{ padding: '30px 28px', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
              No reissuance requests on record.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#1c1b1d', borderBottom: '1px solid #363438', color: '#9ca3af' }}>
                    <th style={{ padding: '14px 24px' }}>Application No</th>
                    <th style={{ padding: '14px 24px' }}>Applicant</th>
                    <th style={{ padding: '14px 24px' }}>Original Card No</th>
                    <th style={{ padding: '14px 24px' }}>Reason</th>
                    <th style={{ padding: '14px 24px' }}>Fee Amount</th>
                    <th style={{ padding: '14px 24px' }}>Date Filed</th>
                    <th style={{ padding: '14px 24px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reissuances.map(r => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid #2d2c30', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#28272b'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 24px', fontWeight: 700, color: '#ffffff' }}>
                        {r.application?.application_no || `APP-REF-${r.application_id}`}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{formatFullName(r.student)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.student?.student_number}</div>
                      </td>
                      <td style={{ padding: '14px 24px', fontFamily: 'monospace', color: '#d1d5db' }}>
                        {r.card?.card_number || '-'}
                      </td>
                      <td style={{ padding: '14px 24px', color: '#e5e7eb', maxWidth: '240px' }}>
                        {r.reason}
                      </td>
                      <td style={{ padding: '14px 24px', fontWeight: 600, color: '#34d399' }}>
                        ₱{Number(r.fee_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 24px', color: '#9ca3af', fontSize: '0.82rem' }}>
                        {formatDate(r.created_at)}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: r.status === 'released'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : r.status === 'rejected'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : r.status === 'processing'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                          color: r.status === 'released'
                            ? '#4ade80'
                            : r.status === 'rejected'
                              ? '#f87171'
                              : r.status === 'processing'
                                ? '#60a5fa'
                                : '#f59e0b'
                        }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;
