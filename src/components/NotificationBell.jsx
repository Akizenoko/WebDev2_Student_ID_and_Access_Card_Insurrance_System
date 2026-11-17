import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function NotificationBell({ refreshKey }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await api.getNotifications();
      setItems(d.notifications || []);
      setUnread(d.unread || 0);
    } catch { /* ignore: bell is non-critical */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load, refreshKey]);

  const markOne = async (n) => {
    if (!n.is_read) { await api.markNotificationRead(n.id).catch(() => {}); load(); }
  };
  const markAll = async () => { await api.markAllNotificationsRead().catch(() => {}); load(); };

  return (
    <div className="notif-wrap">
      <button type="button" className="notif-btn" onClick={() => { setOpen(o => !o); if (!open) load(); }} title="Notifications">
        <i className="fa-solid fa-bell"></i>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" onClick={markAll}>Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">You're all caught up.</div>
          ) : items.map(n => (
            <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => markOne(n)}>
              <div>{n.message}</div>
              <small>{new Date(n.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;