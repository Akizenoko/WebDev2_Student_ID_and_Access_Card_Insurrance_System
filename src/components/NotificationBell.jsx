import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { api } from '../services/api';

export default function NotificationBell({ autoOpenReady = false }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const lastReadyId = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      const next = data.notifications || [];
      setItems(next);
      setUnread(data.unread || 0);

      const ready = next.find(notice => /ready for pickup/i.test(notice.message));
      if (autoOpenReady && ready && !ready.is_read && ready.id !== lastReadyId.current) {
        setOpen(true);
      }
      lastReadyId.current = ready?.id ?? null;
    } catch {
      // Notifications are non-critical; the bell simply stays quiet if they fail.
    }
  }, [autoOpenReady]);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const poller = setInterval(load, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(poller);
    };
  }, [load]);

  const markOne = async notice => {
    if (busy || notice.is_read) return;
    setBusy(true);
    try {
      await api.markNotificationRead(notice.id);
      await load();
    } catch {
      // Keep the notice visible if the read update cannot be saved.
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch {
      // Keep the unread badge if the update cannot be saved.
    } finally {
      setBusy(false);
    }
  };

  return <div className="notification-wrap">
    <button type="button" className="icon-button notification-bell" onClick={() => setOpen(true)} title="Notifications" aria-label="Open notifications">
      <Bell size={18} />
      {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <section className="request-dialog notification-dialog" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="dialog-header">
          <div><p className="kicker">NOTIFICATIONS</p><h2>{unread ? `${unread} unread` : 'You are all caught up'}</h2></div>
          <button type="button" className="dialog-close" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={18} /></button>
        </div>
        {unread > 0 && <div className="notification-actions"><button type="button" className="button button-compact" disabled={busy} onClick={markAll}><CheckCheck size={14} /> Mark all read</button></div>}
        <div className="notification-list">
          {items.length ? items.map(notice => <button
            type="button"
            key={notice.id}
            className={`notification-item ${notice.is_read ? '' : 'unread'}`}
            disabled={busy || notice.is_read}
            onClick={() => markOne(notice)}
          >
            <span className="notification-dot" />
            <span className="notification-copy">
              <strong>{notice.message}</strong>
              <small>{new Date(notice.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</small>
            </span>
          </button>) : <div className="notification-empty">No notifications yet. We will let you know when there is an update.</div>}
        </div>
      </section>
    </div>}
  </div>;
}
