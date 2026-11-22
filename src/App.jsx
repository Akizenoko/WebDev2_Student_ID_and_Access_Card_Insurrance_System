import { useEffect, useState } from 'react';
import AuthPortal from './components/AuthPortal';
import PortalDashboard from './components/PortalDashboard';
import './style/portal.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wmsu_auth_user');
    if (!saved) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    }
    try {
      const stored = JSON.parse(saved);
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored.token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(current => setUser({ ...current, token: stored.token }))
        .catch(() => localStorage.removeItem('wmsu_auth_user'))
        .finally(() => setTimeout(() => setReady(true), 0));
    } catch {
      localStorage.removeItem('wmsu_auth_user');
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const signIn = (nextUser) => { localStorage.setItem('wmsu_auth_user', JSON.stringify(nextUser)); setUser(nextUser); };
  const signOut = () => { localStorage.removeItem('wmsu_auth_user'); setUser(null); };

  if (!ready) return <div className="app-loading">Loading secure portal…</div>;
  return user ? <PortalDashboard user={user} onSignOut={signOut} /> : <AuthPortal onSignIn={signIn} />;
}
