import '../style/header.css';
import '../style/navbar.css';
import Arle from '../assets/Arle.png';
import StatusStepper from './StatusStepper';

function Header({
  currentUser,
  onOpenApply,
  onOpenReissue,
  onOpenAuth,
  onOpenStatusModal,
  activeApplication
}) {
  const isStudent = currentUser?.role === 'student';
  const profile = currentUser?.profile;

  const title = isStudent
    ? `Welcome, ${profile?.first_name || 'The'} ${profile?.last_name || 'Knave'}`
    : `Welcome, ${profile?.office || 'Registrar Administrator'}`;

  const subtitle = isStudent
    ? `${profile?.program || 'Computer Science'} - ${profile?.student_number || '2025-01190'}`
    : `Employee No: ${profile?.employee_no || 'EMP-2023-042'} - Admin Portal`;

  const status = activeApplication?.status || (isStudent ? 'submitted' : 'processing');

  return (
    <div
      className='main'
      style={{
        paddingTop: isStudent ? '32px' : '65px',
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

      {/* Progress inside the Header at the TOP (Only for Student) */}
      {isStudent && (
        <div
          className='headerProgressCard'
          onClick={onOpenStatusModal}
          title="Click to view detailed ID lifecycle & tracking modal"
        >
          <StatusStepper currentStatus={status} size="small" showLabels={true} />
        </div>
      )}

      {/* Header Profile Info and Action Buttons Row */}
      <div className='headerContentRow'>
        <div className='profileHeader' onClick={onOpenAuth} style={{ cursor: 'pointer' }} title="Click to view profile or switch account">
          <img src={Arle} alt="Profile" />
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        
        <div className='issuance'>
          {isStudent ? (
            <>
              <button type="button" className='applyid' onClick={onOpenApply}>
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                Apply New ID
              </button>
              <button type="button" className='reissueid' onClick={onOpenReissue}>
                <i className="fa-solid fa-rotate-right" style={{ marginRight: '6px' }}></i>
                Lost/Destroyed Reissue
              </button>
            </>
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