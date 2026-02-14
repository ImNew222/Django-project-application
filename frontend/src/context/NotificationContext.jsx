import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { compilerAPI } from '../api/client';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const wsRef = useRef(null);
    const reconnectRef = useRef(null);

    // Fetch initial notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await compilerAPI.getNotifications();
            setNotifications(res.data);
        } catch { /* ignore */ }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await compilerAPI.unreadCount();
            setUnreadCount(res.data.unread_count);
        } catch { /* ignore */ }
    }, []);

    // Mark notification(s) as read
    const markRead = useCallback(async (idOrAll) => {
        try {
            if (idOrAll === 'all') {
                await compilerAPI.markNotificationsRead({ all: true });
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            } else {
                await compilerAPI.markNotificationsRead({ id: idOrAll });
                setNotifications(prev =>
                    prev.map(n => n.id === idOrAll ? { ...n, is_read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch { /* ignore */ }
    }, []);

    // WebSocket connection
    useEffect(() => {
        if (!isAuthenticated) return;

        fetchNotifications();
        fetchUnreadCount();

        const connectWS = () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${protocol}://localhost:8000/ws/notifications/?token=${token}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_notification') {
                        const notif = data.notification;
                        setNotifications(prev => [notif, ...prev]);
                        setUnreadCount(prev => prev + 1);

                        // Toast notification
                        addToast(notif.title, 'info');
                    }
                } catch { /* ignore */ }
            };

            ws.onclose = () => {
                // Reconnect after 3 seconds
                reconnectRef.current = setTimeout(connectWS, 3000);
            };

            ws.onerror = () => {
                ws.close();
            };
        };

        connectWS();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
        };
    }, [isAuthenticated, fetchNotifications, fetchUnreadCount, addToast]);

    return (
        <NotificationContext.Provider value={{
            notifications, unreadCount, markRead,
            fetchNotifications, fetchUnreadCount,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
