import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Bell, 
  X, 
  CheckCheck, 
  FolderSync, 
  Clock, 
  ArrowRight, 
  Info,
  Trash2
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { getCurrentUserId } from '../utils/authSession';

export default function NotificationPanel({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'alerts'
  const [dropRequests, setDropRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readDropCount, setReadDropCount] = useState(() => {
    return Number(localStorage.getItem('sagar_read_drop_count') || 0);
  });
  const [clearedDropCount, setClearedDropCount] = useState(() => {
    return Number(localStorage.getItem('sagar_cleared_drop_count') || 0);
  });
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sagar_read_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const [clearedIds, setClearedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sagar_cleared_notifications') || '[]');
    } catch {
      return [];
    }
  });

  const fetchDropRequests = async () => {
    try {
      setLoading(true);
      const userId = getCurrentUserId() || 1;
      const res = await axios.get(`${API_BASE_URL}/viewdrop-projectlist/${userId}`);
      const data = res.data || [];
      const pending = data.filter(
        (item) => item.reject_request_status !== 0 && !item.drop_date
      );
      setDropRequests(pending);
    } catch (err) {
      console.error('Failed to load notifications in panel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setReadDropCount(Number(localStorage.getItem('sagar_read_drop_count') || 0));
      setClearedDropCount(Number(localStorage.getItem('sagar_cleared_drop_count') || 0));
      fetchDropRequests();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setReadDropCount(Number(localStorage.getItem('sagar_read_drop_count') || 0));
      setClearedDropCount(Number(localStorage.getItem('sagar_cleared_drop_count') || 0));
      fetchDropRequests();
    };
    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('drop-request-updated', handleUpdate);
    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('drop-request-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const markAsRead = (id) => {
    if (id === 'global-drop-requests-summary') {
      const count = dropRequests.length;
      setReadDropCount(count);
      localStorage.setItem('sagar_read_drop_count', String(count));
    }
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, id]));
      localStorage.setItem('sagar_read_notifications', JSON.stringify(next));
      return next;
    });
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const markAllAsRead = () => {
    const count = dropRequests.length;
    setReadDropCount(count);
    localStorage.setItem('sagar_read_drop_count', String(count));

    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]));
      localStorage.setItem('sagar_read_notifications', JSON.stringify(next));
      return next;
    });
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const clearAll = () => {
    const count = dropRequests.length;
    setClearedDropCount(count);
    setReadDropCount(count);
    localStorage.setItem('sagar_cleared_drop_count', String(count));
    localStorage.setItem('sagar_read_drop_count', String(count));

    const allIds = notifications.map((n) => n.id);
    setClearedIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds, 'sys-welcome']));
      localStorage.setItem('sagar_cleared_notifications', JSON.stringify(next));
      return next;
    });
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const notifications = useMemo(() => {
    const list = [];

    // Single consolidated notification for all pending drop requests
    const isDropCleared = dropRequests.length > 0 && dropRequests.length <= clearedDropCount;
    if (dropRequests.length > 0 && !isDropCleared) {
      const count = dropRequests.length;
      const notifId = 'global-drop-requests-summary';
      const isRead = count <= readDropCount && readIds.includes(notifId);
      list.push({
        id: notifId,
        type: 'request',
        category: 'Project Workflow',
        title: 'Project Drop Requests',
        count: count,
        message: `There ${count === 1 ? 'is' : 'are'} ${count} pending project drop ${count === 1 ? 'request' : 'requests'} awaiting review.`,
        details: `${count} pending drop ${count === 1 ? 'request has' : 'requests have'} been submitted by organizations for Ministry review.`,
        time: 'Requires Action',
        actionUrl: '/projects/project/view-drop-request',
        actionLabel: `Review All (${count})`,
        isRead,
      });
    }

    // Static system advisory
    if (!clearedIds.includes('sys-welcome')) {
      list.push({
        id: 'sys-welcome',
        type: 'system',
        category: 'System Advisory',
        title: 'Portal Operational',
        message: 'All Sagarmanthan modules and real-time database synchronizations are operating normally.',
        time: 'Real-time',
        isRead: true,
      });
    }

    return list;
  }, [dropRequests, readDropCount, clearedDropCount, readIds, clearedIds]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    if (filter === 'alerts') {
      return notifications.filter((n) => n.type === 'system' || n.type === 'alert');
    }
    return notifications;
  }, [notifications, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out">
          
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-800/60 shadow-xs">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight font-display">
                    Global Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Portal-wide alerts & updates
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All</span>
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Global Filter Tabs */}
          <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center space-x-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('alerts')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filter === 'alerts'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              System Alerts
            </button>
          </div>

          {/* Notification Items List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400">
                <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Checking notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Bell className="h-6 w-6 opacity-40" />
                </div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Notifications</h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  You're all caught up! New requests and updates will appear here automatically.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isRequest = notif.type === 'request' || notif.type === 'drop-request';
                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`group relative p-3.5 rounded-xl border transition-all duration-200 ${
                      notif.isRead
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-xs hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start space-x-2.5 w-full">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isRequest 
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50' 
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                        }`}>
                          {isRequest ? <FolderSync className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 dark:text-white">
                                {notif.title}
                              </span>
                              {!notif.isRead && (
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                              )}
                            </div>
                            {notif.count > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full leading-none shadow-xs">
                                {notif.count} Pending
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                            {notif.message}
                          </p>

                          {notif.details && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-md border border-slate-100 dark:border-slate-800">
                              "{notif.details}"
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                              <Clock className="h-3 w-3" />
                              <span>{notif.time}</span>
                            </span>

                            {notif.actionUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.id);
                                  onClose();
                                  navigate(notif.actionUrl);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
                              >
                                <span>{notif.actionLabel || 'View'}</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Ministry of Ports, Shipping and Waterways
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
