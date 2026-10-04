import Arle from '../assets/Arle.png';
import wmsulogo from '../assets/wmsulogo.png';
import '../style/navbar.css';

function Navbar({
  currentUser,
  onOpenApply,
  onOpenReissue,
  onOpenAuth,
  onOpenStatusModal,
  onLogout,
  setActiveTab
}) {
  const isStudent = currentUser?.role === 'student';
  const isAdmin = currentUser?.role === 'admin';

  const studentProfile = isStudent ? currentUser.profile : null;
  const adminProfile = isAdmin ? currentUser.profile : null;

  const displayName = isStudent
    ? `${studentProfile?.first_name || 'Student'} ${studentProfile?.last_name || ''}`
    : 'Admin Officer';

  const subtitle = isStudent
    ? (studentProfile?.student_number || '2025-01190')
    : (adminProfile?.office || 'Registrar');

  return (
    <div className='navbar'>
      <div className='wmsulogo' style={{ cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
        <img src={wmsulogo} alt="WMSU Logo" />
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>WMSU ID ISSUANCE</h2>
          <span style={{ fontSize: '0.72rem', opacity: 0.85, letterSpacing: '0.04em' }}>Official University Portal</span>
        </div>
      </div>

      <div className='selections'>
        {isStudent && (
          <div className='issuance'>
            <button type="button" className='applyid' onClick={onOpenApply}>
              <i className="fa-solid fa-id-card" style={{ marginRight: '6px' }}></i>
              Apply for ID
            </button>
            <button type="button" className='reissueid' onClick={onOpenReissue}>
              <i className="fa-solid fa-rotate-right" style={{ marginRight: '6px' }}></i>
              Lost/Destroyed Reissue
            </button>
          </div>
        )}


      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          className='profile'
          style={{ cursor: 'pointer' }}
          onClick={onOpenAuth}
          title="Click to Switch User / Profile"
        >
          <img src={Arle} alt="Profile" />
          <div>
            <h3 style={{ fontSize: '0.95rem', margin: 0 }}>{displayName}</h3>
            <h5 style={{ fontSize: '0.75rem', margin: 0, opacity: 0.85 }}>{subtitle} ({currentUser?.role?.toUpperCase() || 'STUDENT'})</h5>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Sign out of account"
            style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Log Out</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default Navbar;
