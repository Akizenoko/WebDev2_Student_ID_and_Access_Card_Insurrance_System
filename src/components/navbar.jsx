import Arle from '../assets/Arle.png';
import wmsulogo from '../assets/wmsulogo.png';
import '../style/navbar.css';

function Navbar({
  currentUser,
  onOpenAuth,
  onOpenProfile,
  setActiveTab
}) {
  const isStudent = currentUser?.role === 'student';
  const isAdmin = currentUser?.role === 'admin';

  const studentProfile = isStudent ? currentUser.profile : null;
  const adminProfile = isAdmin ? currentUser.profile : null;

  const displayName = isStudent
    ? `${studentProfile?.first_name || 'Student'} ${studentProfile?.middle_name || ''} ${studentProfile?.last_name || ''}`
    : 'Admin Officer';

  const subtitle = isStudent
    ? (studentProfile?.student_number || '2025-01190')
    : (adminProfile?.office || 'Registrar');

  const photoPath = currentUser?.profile?.photo_url;
  const avatarSrc = !isStudent
    ? Arle
    : (photoPath ? (photoPath.startsWith('/assets/Arle.png') ? Arle : photoPath) : Arle);

  return (
    <div className='navbar'>
      <div className='wmsulogo' style={{ cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
        <img src={wmsulogo} alt="WMSU Logo" />
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>WMSU ID ISSUANCE</h2>
          <span style={{ fontSize: '0.72rem', opacity: 0.85, letterSpacing: '0.04em' }}>Official University Portal</span>
        </div>
      </div>

      <div className='selections'></div>

      <div
        className='profile'
        style={{ cursor: 'pointer' }}
        onClick={onOpenProfile || onOpenAuth}
        title="Click to view profile & identification"
      >
        <img src={avatarSrc} alt="Profile" style={{ objectFit: 'cover' }} />
        <div>
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>{displayName}</h3>
          <h5 style={{ fontSize: '0.75rem', margin: 0, opacity: 0.85 }}>{subtitle} ({currentUser?.role?.toUpperCase() || 'STUDENT'})</h5>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
