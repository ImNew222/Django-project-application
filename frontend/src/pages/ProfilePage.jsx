import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, compilerAPI } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    User, Mail, Shield, Calendar, BookOpen, Heart, Users,
    Edit3, Save, X, Tag, ToggleLeft, ToggleRight,
    Swords, Trophy, Flame, Code2, Award, Crown, Zap,
    TrendingUp, Target, CheckCircle2
} from 'lucide-react';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const { addToast } = useToast();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [form, setForm] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        bio: user?.bio || '',
        gender: user?.gender || '',
        interests: user?.interests || '',
        is_available_for_pairing: user?.is_available_for_pairing || false,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await compilerAPI.profileStats();
                setProfileData(res.data);
            } catch (e) {
                console.error('Failed to load profile stats:', e);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await authAPI.updateProfile(form);
            await refreshUser();
            setEditing(false);
            addToast('Profile updated successfully!', 'success');
        } catch (err) {
            addToast('Failed to update profile. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            bio: user?.bio || '',
            gender: user?.gender || '',
            interests: user?.interests || '',
            is_available_for_pairing: user?.is_available_for_pairing || false,
        });
        setEditing(false);
    };

    const joinDate = user?.date_joined
        ? new Date(user.date_joined).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        })
        : '';

    const stats = profileData?.coding_stats;
    const heatmap = profileData?.heatmap || {};
    const history = profileData?.history || [];

    return (
        <div className="profile-page">
            {/* ── Header Card ──────────────────────────────── */}
            <div className="profile-header-card">
                <div className="profile-avatar">
                    {user?.first_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="profile-header-info">
                    <h1>{user?.first_name} {user?.last_name}</h1>
                    <span className="profile-username">@{user?.username}</span>
                    <div className="profile-badges-row">
                        {stats && (
                            <>
                                <span className="profile-elo-badge">
                                    {stats.elo_tier_icon} {stats.elo_tier} · {stats.elo_rating} ELO
                                </span>
                                <span className="profile-rank-badge">
                                    <Shield size={12} /> {stats.rank_title} · {stats.rank_points} pts
                                </span>
                            </>
                        )}
                    </div>
                    <span className="profile-join-date"><Calendar size={12} /> Joined {joinDate}</span>
                </div>
                {!editing ? (
                    <button className="btn btn-secondary btn-sm profile-edit-btn" onClick={() => setEditing(true)}>
                        <Edit3 size={14} /> Edit Profile
                    </button>
                ) : (
                    <div className="profile-edit-actions">
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                            <X size={14} /> Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* ── Stats Cards ──────────────────────────────── */}
            {stats && (
                <div className="profile-stats-grid">
                    <div className="profile-stat-card elo">
                        <div className="psc-icon"><TrendingUp size={20} /></div>
                        <div className="psc-value">{stats.elo_rating}</div>
                        <div className="psc-label">ELO Rating</div>
                    </div>
                    <div className="profile-stat-card battles">
                        <div className="psc-icon"><Swords size={20} /></div>
                        <div className="psc-value">{stats.battles_won}<span className="psc-sub">/{stats.battles_total}</span></div>
                        <div className="psc-label">Battles Won</div>
                    </div>
                    <div className="profile-stat-card tournaments">
                        <div className="psc-icon"><Trophy size={20} /></div>
                        <div className="psc-value">{stats.tournament_wins}<span className="psc-sub">/{stats.tournament_played}</span></div>
                        <div className="psc-label">Tournament Wins</div>
                    </div>
                    <div className="profile-stat-card streak">
                        <div className="psc-icon"><Flame size={20} /></div>
                        <div className="psc-value">{stats.daily_streak}<span className="psc-sub">🔥</span></div>
                        <div className="psc-label">Daily Streak</div>
                    </div>
                    <div className="profile-stat-card problems">
                        <div className="psc-icon"><Target size={20} /></div>
                        <div className="psc-value">{stats.problems_solved}</div>
                        <div className="psc-label">Problems Solved</div>
                    </div>
                    <div className="profile-stat-card submissions">
                        <div className="psc-icon"><Code2 size={20} /></div>
                        <div className="psc-value">{stats.code_submissions}</div>
                        <div className="psc-label">Code Runs</div>
                    </div>
                </div>
            )}

            {/* ── Activity Heatmap ─────────────────────────── */}
            <div className="profile-card heatmap-card">
                <h2><Flame size={20} /> Activity Heatmap</h2>
                <p className="heatmap-subtitle">
                    {Object.values(heatmap).reduce((a, b) => a + b, 0)} contributions in the last year
                </p>
                <ActivityHeatmap heatmap={heatmap} />
            </div>

            {/* ── Two Column Grid ──────────────────────────── */}
            <div className="profile-grid">
                {/* Info Card */}
                <div className="profile-card">
                    <h2><User size={20} /> Personal Information</h2>
                    <div className="profile-fields">
                        {editing ? (
                            <>
                                <div className="profile-field">
                                    <label>First Name</label>
                                    <input type="text" value={form.first_name}
                                        onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                                </div>
                                <div className="profile-field">
                                    <label>Last Name</label>
                                    <input type="text" value={form.last_name}
                                        onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                                </div>
                                <div className="profile-field">
                                    <label>Gender</label>
                                    <select value={form.gender}
                                        onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                                        <option value="">Prefer not to say</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="profile-field">
                                    <label><Mail size={14} /> Email</label>
                                    <span>{user?.email}</span>
                                </div>
                                <div className="profile-field">
                                    <label><Shield size={14} /> Role</label>
                                    <span className={`role-${user?.role}`}>{user?.role}</span>
                                </div>
                                <div className="profile-field">
                                    <label><User size={14} /> Gender</label>
                                    <span>{user?.gender || 'Not set'}</span>
                                </div>
                                <div className="profile-field">
                                    <label><Calendar size={14} /> Joined</label>
                                    <span>{joinDate}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Bio & Interests Card */}
                <div className="profile-card">
                    <h2><BookOpen size={20} /> Bio & Interests</h2>
                    <div className="profile-fields">
                        {editing ? (
                            <>
                                <div className="profile-field full-width">
                                    <label>Bio</label>
                                    <textarea value={form.bio}
                                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                                        placeholder="Tell us about yourself..." rows={3} />
                                </div>
                                <div className="profile-field full-width">
                                    <label>Interests (comma-separated)</label>
                                    <input type="text" value={form.interests}
                                        onChange={(e) => setForm({ ...form, interests: e.target.value })}
                                        placeholder="e.g., Python, Web Dev, Machine Learning" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="profile-field full-width">
                                    <label><Heart size={14} /> Bio</label>
                                    <span>{user?.bio || 'No bio yet.'}</span>
                                </div>
                                <div className="profile-field full-width">
                                    <label><Tag size={14} /> Interests</label>
                                    <div className="profile-tags">
                                        {user?.interests ? user.interests.split(',').map((tag, i) => (
                                            <span key={i} className="profile-tag">{tag.trim()}</span>
                                        )) : <span className="muted">No interests added.</span>}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Match History ─────────────────────────────── */}
            {history.length > 0 && (
                <div className="profile-card history-card">
                    <h2><Swords size={20} /> Recent Match History</h2>
                    <div className="match-history-table">
                        <div className="mht-header">
                            <span>Type</span>
                            <span>Challenge</span>
                            <span>Result</span>
                            <span>Date</span>
                        </div>
                        {history.map((h, i) => (
                            <div key={i} className={`mht-row ${h.result}`}>
                                <span className="mht-type">
                                    {h.type === 'battle' ? <Swords size={14} /> : <Trophy size={14} />}
                                    {h.type === 'battle' ? 'Battle' : 'Tournament'}
                                </span>
                                <span className="mht-challenge">
                                    {h.challenge}
                                    {h.opponent && <small> vs {h.opponent}</small>}
                                </span>
                                <span className={`mht-result ${h.result}`}>
                                    {h.result === 'won' ? <CheckCircle2 size={14} /> : <X size={14} />}
                                    {h.result === 'won' ? 'Won' : 'Lost'}
                                    {h.points > 0 && ` (+${h.points})`}
                                </span>
                                <span className="mht-date">
                                    {h.date ? new Date(h.date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric'
                                    }) : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════
   ACTIVITY HEATMAP — GitHub-style contribution grid
   ═══════════════════════════════════════════════════════════ */
function ActivityHeatmap({ heatmap }) {
    const today = new Date();
    const daysInYear = 365;

    // Build 365-day array (oldest first)
    const days = [];
    for (let i = daysInYear - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        days.push({ date: d, key, count: heatmap[key] || 0 });
    }

    // Group into weeks (columns)
    const weeks = [];
    let currentWeek = [];
    const firstDay = days[0].date.getDay(); // 0=Sun, 1=Mon...

    // Pad the first week
    for (let i = 0; i < firstDay; i++) {
        currentWeek.push(null);
    }

    days.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    // Get intensity level (0-4)
    const maxCount = Math.max(1, ...days.map(d => d.count));
    const getLevel = (count) => {
        if (count === 0) return 0;
        if (count <= maxCount * 0.25) return 1;
        if (count <= maxCount * 0.5) return 2;
        if (count <= maxCount * 0.75) return 3;
        return 4;
    };

    // Month labels
    const months = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
        const validDay = week.find(d => d !== null);
        if (validDay) {
            const m = validDay.date.getMonth();
            if (m !== lastMonth) {
                months.push({ index: wi, name: validDay.date.toLocaleString('en-US', { month: 'short' }) });
                lastMonth = m;
            }
        }
    });

    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

    return (
        <div className="heatmap-container">
            <div className="heatmap-months">
                <div className="heatmap-day-labels">
                    {dayLabels.map((l, i) => <span key={i}>{l}</span>)}
                </div>
                <div className="heatmap-month-labels">
                    {months.map((m, i) => (
                        <span key={i} style={{ gridColumnStart: m.index + 1 }}>{m.name}</span>
                    ))}
                </div>
            </div>
            <div className="heatmap-scroll">
                <div className="heatmap-day-labels-side">
                    {dayLabels.map((l, i) => <span key={i}>{l}</span>)}
                </div>
                <div className="heatmap-grid">
                    <div className="heatmap-month-row">
                        {months.map((m, i) => (
                            <span key={i} style={{ gridColumnStart: m.index + 1 }}>{m.name}</span>
                        ))}
                    </div>
                    {weeks.map((week, wi) => (
                        <div key={wi} className="heatmap-week">
                            {week.map((day, di) => (
                                <div
                                    key={di}
                                    className={`heatmap-cell level-${day ? getLevel(day.count) : 'empty'}`}
                                    title={day ? `${day.key}: ${day.count} contribution${day.count !== 1 ? 's' : ''}` : ''}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="heatmap-legend">
                <span>Less</span>
                <div className="heatmap-cell level-0" />
                <div className="heatmap-cell level-1" />
                <div className="heatmap-cell level-2" />
                <div className="heatmap-cell level-3" />
                <div className="heatmap-cell level-4" />
                <span>More</span>
            </div>
        </div>
    );
}
