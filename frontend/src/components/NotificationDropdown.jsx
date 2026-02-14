import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Swords, UserPlus, Trophy, Award, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { compilerAPI } from '../api/client';
import { useToast } from '../context/ToastContext';

const ICON_MAP = {
    follow: UserPlus,
    battle_invite: Swords,
    battle_accepted: Swords,
    battle_declined: Swords,
    tournament_start: Trophy,
    achievement: Award,
};

const COLOR_MAP = {
    follow: '#22c55e',
    battle_invite: '#f59e0b',
    battle_accepted: '#22c55e',
    battle_declined: '#ef4444',
    tournament_start: '#8b5cf6',
    achievement: '#3b82f6',
};

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationDropdown() {
    const { notifications, unreadCount, markRead } = useNotifications();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleRespond = async (inviteId, action) => {
        try {
            const res = await compilerAPI.respondInvite(inviteId, { action });
            if (action === 'accept') {
                addToast('🎉 Battle accepted! Heading to battle...', 'success');
                setOpen(false);
                navigate('/battle');
            } else {
                addToast('Challenge declined', 'info');
            }
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to respond', 'error');
        }
    };

    return (
        <div className="notif-dropdown-wrapper" ref={dropdownRef}>
            <button
                className="btn-icon notif-bell"
                onClick={() => setOpen(!open)}
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                className="notif-mark-all"
                                onClick={() => markRead('all')}
                                title="Mark all as read"
                            >
                                <CheckCheck size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-dropdown-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">No notifications yet</div>
                        ) : (
                            notifications.map((n) => {
                                const Icon = ICON_MAP[n.type] || Bell;
                                const color = COLOR_MAP[n.type] || '#888';
                                const isBattleInvite = n.type === 'battle_invite' && n.data?.invite_id;

                                return (
                                    <div
                                        key={n.id}
                                        className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                                    >
                                        <div className="notif-icon" style={{ color }}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="notif-content">
                                            <div className="notif-title">{n.title}</div>
                                            {n.message && <div className="notif-message">{n.message}</div>}
                                            <div className="notif-time">{timeAgo(n.created_at)}</div>

                                            {isBattleInvite && !n.is_read && (
                                                <div className="notif-invite-actions">
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleRespond(n.data.invite_id, 'accept')}
                                                    >
                                                        ✅ Accept
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleRespond(n.data.invite_id, 'decline')}
                                                    >
                                                        ❌ Decline
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {!n.is_read && (
                                            <button
                                                className="notif-read-btn"
                                                onClick={() => markRead(n.id)}
                                                title="Mark as read"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
