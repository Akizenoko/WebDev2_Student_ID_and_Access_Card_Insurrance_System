import '../style/header.css';
import '../style/navbar.css';
import Arle from '../assets/Arle.png';

function Header({
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenStatusModal,
  activeApplication
}) {
  const isStudent = currentUser?.role === 'student';
  const profile = currentUser?.profile;

  const title = isStudent
    ? <div style={{ whiteSpace: 'pre-line' }}>
  {`Welcome,
${profile?.first_name || 'The'} ${profile?.middle_name || ''} ${profile?.last_name || 'Knave'}`}
</div>
    : `Welcome, ${profile?.office || 'Registrar Administrator'}`;

  const subtitle = isStudent
    ? `${profile?.program || 'Computer Science'} - ${profile?.student_number || '2025-01190'}`
    : `Employee No: ${profile?.employee_no || 'EMP-2023-042'} - Admin Portal`;

  const photoPath = currentUser?.profile?.photo_url || activeApplication?.photo?.storage_path;
  const avatarSrc = !isStudent
    ? Arle
    : (photoPath ? (photoPath.startsWith('/assets/Arle.png') ? Arle : photoPath) : Arle);

  return (
    <div
      className='main'
      style={{
        paddingTop: isStudent ? '55px' : '65px',
      }}
    >
      {/* Large Decorative Low-Opacity Black Text */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(4.5rem, 12vw, 9.5rem)',
          fontWeight: 900,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#000000',
          opacity: 0.12,
          userSelect: 'none',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 1,
          lineHeight: 1
        }}
      >
        {currentUser?.role === 'admin' ? 'ADMIN DASHBOARD' : 'DASHBOARD'}
      </div>

      {/* Header Profile Info and Action Buttons Row */}
      <div className='headerContentRow'>
        <div
          className='profileHeader'
          onClick={onOpenProfile || onOpenAuth}
          style={{ cursor: 'pointer' }}
          title="Click to view profile & identification"
        >
          <img
            src={avatarSrc}
            alt="Profile"
            style={{
              width: '160px',
              height: '160px',
              minWidth: '160px',
              minHeight: '160px',
              maxWidth: '160px',
              maxHeight: '160px',
              borderRadius: '50%',
              aspectRatio: '1 / 1',
              flexShrink: 0,
              objectFit: 'cover'
            }}
          />
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        
        <div className='issuance'>
          {isStudent ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              {onOpenStatusModal && (
                <button
                  type="button"
                  className='reissueid'
                  onClick={onOpenStatusModal}
                  style={{ width: 'auto', padding: '11px 20px', fontSize: '0.88rem' }}
                >
                  <i className="fa-solid fa-timeline" style={{ marginRight: '6px' }}></i>
                  Track Progress
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className='applyid'
                onClick={onOpenAuth}
                style={{ width: 'auto', padding: '13px 24px' }}
              >
                <i className="fa-solid fa-user-graduate" style={{ marginRight: '6px' }}></i>
                Switch User
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
