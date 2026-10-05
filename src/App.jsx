import React, { useState, useEffect } from 'react';
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
import LoginPage from './pages/login.jsx';
import SignInPage from './pages/sign_in.jsx';
import { api } from './services/api.js';

import './style/App.css';
import './style/navbar.css';
import './style/header.css';
import './style/modals.css';

function App() {

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wmsu_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });


  const [authView, setAuthView] = useState('login');

  const [activeTab, setActiveTab] = useState('overview');
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isReissueOpen, setIsReissueOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [viewingCard, setViewingCard] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [userApplications, setUserApplications] = useState([]);
  const [statusTrackApp, setStatusTrackApp] = useState(null);

  useEffect(() => {
    async function loadUserApps() {
      if (!currentUser) return;
      try {
        const params = currentUser.role === 'student'
          ? { student_id: currentUser.profile?.id || 1 }
          : {};
        const apps = await api.getApplications(params);
        setUserApplications(apps || []);
        if (apps && apps.length > 0) {
          setStatusTrackApp(prev => {
            if (prev) {
              const matched = apps.find(a => a.id === prev.id);
              if (matched) return matched;
            }
            return apps[apps.length - 1];
          });
        } else {
          setStatusTrackApp(null);
        }
      } catch (err) {
        console.error('Failed to load applications for status', err);
      }
    }
    loadUserApps();
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

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(36, 35, 36)', color: '#ffffff' }}>
      <Navbar
        currentUser={currentUser}
        onOpenApply={() => setIsApplyOpen(true)}
        onOpenReissue={() => setIsReissueOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <Header
        currentUser={currentUser}
        onOpenApply={() => setIsApplyOpen(true)}
        onOpenReissue={() => setIsReissueOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        activeApplication={statusTrackApp}
      />

      <main style={{ marginTop: '-140px', position: 'relative', zIndex: 10 }}>
        {currentUser?.role === 'admin' ? (
          <AdminDashboard
            key={refreshKey}
            currentUser={currentUser}
            onSelectApp={handleSelectApp}
          />
        ) : (
          <StudentDashboard
            key={refreshKey}
            currentUser={currentUser}
            onOpenApply={() => setIsApplyOpen(true)}
            onOpenReissue={() => setIsReissueOpen(true)}
            onSelectApp={handleSelectApp}
            onViewCard={(card) => setViewingCard(card)}
            onOpenStatusModal={handleOpenStatusForApp}
          />
        )}
      </main>

      {/* Issuance Application Modal */}
      <ApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        currentUser={currentUser}
        onSuccess={handleRefresh}
      />

      {/* Lost / Destroyed Reissuance Modal */}
      <ReissueModal
        isOpen={isReissueOpen}
        onClose={() => setIsReissueOpen(false)}
        currentUser={currentUser}
        onSuccess={handleRefresh}
      />

      {/* Application Detail Review Modal */}
      <ApplicationDetailModal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        application={selectedApp}
        currentUser={currentUser}
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
