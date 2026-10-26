import { useState, useEffect } from 'react';
import Navbar from './components/navbar.jsx';
import Header from './components/header.jsx';
import StudentDashboard from './components/StudentDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import ApplyModal from './components/ApplyModal.jsx';
import ReissueModal from './components/ReissueModal.jsx';
import ApplicationDetailModal from './components/ApplicationDetailModal.jsx';
import CardRecordModal from './components/CardRecordModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import StatusTrackerModal from './components/StatusTrackerModal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import LogoutConfirmModal from './components/LogoutConfirmModal.jsx';
import LoginPage from './pages/login.jsx';
import SignInPage from './pages/sign_in.jsx';
import { api } from './services/api.js';
import Arle from './assets/Arle.png';

import './style/App.css';
import './style/navbar.css';
import './style/header.css';
import './style/modals.css';

function App() {

  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // On every page load, verify the stored token is still valid.
  // If missing or expired, clear storage and go to login.
  useEffect(() => {
    async function verifySession() {
      try {
        const saved = localStorage.getItem('wmsu_auth_user');
        if (!saved) { setAuthChecked(true); return; }

        const { token } = JSON.parse(saved);
        if (!token) { localStorage.removeItem('wmsu_auth_user'); setAuthChecked(true); return; }

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const user = await res.json();
          setCurrentUser({ ...user, token });
        } else {
          // token expired or invalid — force re-login
          localStorage.removeItem('wmsu_auth_user');
        }
      } catch {
        localStorage.removeItem('wmsu_auth_user');
      } finally {
        setAuthChecked(true);
      }
    }
    verifySession();
  }, []);

  const [authView, setAuthView] = useState('login');

  const [activeTab, setActiveTab] = useState('overview');
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applyType, setApplyType] = useState('New ID');
  const [isReissueOpen, setIsReissueOpen] = useState(false);
  const [reissueReason, setReissueReason] = useState('Lost physical ID card');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [viewingCard, setViewingCard] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [userApplications, setUserApplications] = useState([]);
  const [userCards, setUserCards] = useState([]);
  const [statusTrackApp, setStatusTrackApp] = useState(null);

  const handleOpenApply = (type = 'New ID') => {
    setApplyType(typeof type === 'string' ? type : 'New ID');
    setIsApplyOpen(true);
  };

  const handleOpenReissue = (reason = 'Lost physical ID card') => {
    setReissueReason(typeof reason === 'string' ? reason : 'Lost physical ID card');
    setIsReissueOpen(true);
  };

  useEffect(() => {
    async function loadUserData() {
      if (!currentUser) return;
      try {
        const studentId = currentUser.role === 'student' ? (currentUser.profile?.id || 1) : null;
        const [apps, cardsData] = await Promise.all([
          api.getApplications(),
          studentId ? api.getCards({ student_id: studentId }) : Promise.resolve([]),
        ]);
        const safeApps = Array.isArray(apps) ? apps : [];
        const safeCards = Array.isArray(cardsData) ? cardsData : [];
        setUserApplications(safeApps);
        setUserCards(safeCards);
        if (safeApps.length > 0) {
          setStatusTrackApp(prev => {
            if (prev) {
              const matched = safeApps.find(a => a.id === prev.id);
              if (matched) return matched;
            }
            return safeApps[safeApps.length - 1];
          });
        } else {
          setStatusTrackApp(null);
        }
      } catch (err) {
        console.error('Failed to load user data for status', err);
        setUserApplications([]);
        setUserCards([]);
        setStatusTrackApp(null);
      }
    }
    loadUserData();
  }, [currentUser, refreshKey]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('wmsu_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    handleRefresh();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('wmsu_auth_user');
    } catch (e) {
      console.error(e);
    }
    setAuthView('login');
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSelectApp = async (app) => {
    try {
      const fullApp = await api.getApplication(app.id);
      setSelectedApp(fullApp);
    } catch {
      setSelectedApp(app);
    }
  };

  const handleOpenStatusForApp = (app) => {
    if (app) setStatusTrackApp(app);
    setIsStatusModalOpen(true);
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: 'rgb(24, 23, 25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    if (authView === 'sign_in') {
      return (
        <SignInPage
          onLoginSuccess={handleLoginSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }

    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignIn={() => setAuthView('sign_in')}
      />
    );
  }

  const latestPhoto = currentUser?.role === 'admin'
    ? Arle
    : ([...userApplications].reverse().find(a => a.photo?.storage_path)?.photo?.storage_path || currentUser?.profile?.photo_url || Arle);
  const effectiveUser = currentUser ? {
    ...currentUser,
    profile: currentUser.profile ? {
      ...currentUser.profile,
      photo_url: currentUser.role === 'admin' ? Arle : (latestPhoto || currentUser.profile.photo_url || Arle),
    } : null,
  } : null;

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(36, 35, 36)', color: '#ffffff' }}>
      <Navbar
        currentUser={effectiveUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <Header
        currentUser={effectiveUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        activeApplication={statusTrackApp}
      />

      <main style={{ marginTop: '-140px', position: 'relative', zIndex: 10 }}>
        {currentUser?.role === 'admin' ? (
          <AdminDashboard
            key={refreshKey}
            currentUser={effectiveUser}
            onSelectApp={handleSelectApp}
            onViewCard={(card) => setViewingCard(card)}
          />
        ) : (
          <StudentDashboard
            key={refreshKey}
            currentUser={effectiveUser}
            onOpenApply={(type) => handleOpenApply(type)}
            onOpenReissue={handleOpenReissue}
            onSelectApp={handleSelectApp}
            onViewCard={(card) => setViewingCard(card)}
            onOpenStatusModal={handleOpenStatusForApp}
          />
        )}
      </main>

      {/* User Profile & Identification Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={effectiveUser}
        onOpenSwitchUser={() => {
          setIsProfileOpen(false);
          setIsAuthOpen(true);
        }}
        onRequestLogout={() => {
          setIsProfileOpen(false);
          setIsLogoutConfirmOpen(true);
        }}
        onViewCard={(card) => {
          setIsProfileOpen(false);
          setViewingCard(card);
        }}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          handleLogout();
        }}
        currentUser={effectiveUser}
      />

      {/* Issuance Application Modal */}
      <ApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        currentUser={effectiveUser}
        onSuccess={handleRefresh}
        applications={userApplications}
        cards={userCards}
        initialType={applyType}
      />

      {/* Lost / Destroyed Reissuance & Renewal Modal */}
      <ReissueModal
        isOpen={isReissueOpen}
        onClose={() => setIsReissueOpen(false)}
        currentUser={effectiveUser}
        onSuccess={handleRefresh}
        initialReason={reissueReason}
        applications={userApplications}
        cards={userCards}
      />

      {/* Application Detail Review Modal */}
      <ApplicationDetailModal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        application={selectedApp}
        currentUser={effectiveUser}
        onViewCard={(card) => {
          setSelectedApp(null);
          setViewingCard(card);
        }}
        onUpdate={() => {
          handleRefresh();
          if (selectedApp) {
            handleSelectApp(selectedApp);
          }
        }}
      />

      {/* Digital ID Card Viewer Modal */}
      <CardRecordModal
        isOpen={Boolean(viewingCard)}
        onClose={() => setViewingCard(null)}
        card={viewingCard}
      />

      {/* Switch User / Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
        }}
      />

      {/* Real-time Status Tracker Modal with Enlarged Circles & Detailed Process Info */}
      <StatusTrackerModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        applications={userApplications}
        currentApp={statusTrackApp}
        onSelectApp={(app) => setStatusTrackApp(app)}
        onOpenApply={() => setIsApplyOpen(true)}
      />
    </div>
  );
}

export default App;
