import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leaderboardAPI, quizAPI } from '../api/client';
import { Trophy, BarChart3, Flame, ClipboardList, Target, TrendingUp, Swords, Award } from 'lucide-react';
import Skeleton, { SkeletonStatGrid } from '../components/Skeleton';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, historyRes] = await Promise.all([
                    leaderboardAPI.getMyStats(),
                    quizAPI.getHistory(),
                ]);
                setStats(statsRes.data);
                setHistory(historyRes.data.slice(0, 5)); // Last 5 quizzes
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="dashboard-page">
            <div className="welcome-section">
                <Skeleton width="300px" height="28px" />
                <Skeleton width="200px" height="16px" />
            </div>
            <SkeletonStatGrid count={4} />
        </div>
    );

    return (
        <div className="dashboard-page">
            <div className="welcome-section">
                <h1>Welcome back, {user?.first_name || user?.username}!</h1>
                <p>Ready for another quiz battle?</p>
            </div>

            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Trophy size={28} /></div>
                    <div className="stat-value">{stats?.rank_points || 0}</div>
                    <div className="stat-label">Rank Points</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><BarChart3 size={28} /></div>
                    <div className="stat-value">{stats?.rank_title || 'Newbie'}</div>
                    <div className="stat-label">Rank Title</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><Flame size={28} /></div>
                    <div className="stat-value">{stats?.current_streak || 0}</div>
                    <div className="stat-label">Current Streak</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><ClipboardList size={28} /></div>
                    <div className="stat-value">{stats?.total_quizzes || 0}</div>
                    <div className="stat-label">Quizzes Taken</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><Target size={28} /></div>
                    <div className="stat-value">{stats?.accuracy || 0}%</div>
                    <div className="stat-label">Accuracy</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><TrendingUp size={28} /></div>
                    <div className="stat-value">#{stats?.rank_position || '-'}</div>
                    <div className="stat-label">Rank Position</div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <Link to="/quiz" className="action-card">
                    <span className="action-icon"><Swords size={32} /></span>
                    <span className="action-text">Start Quiz Battle</span>
                </Link>
                <Link to="/leaderboard" className="action-card">
                    <span className="action-icon"><Award size={32} /></span>
                    <span className="action-text">View Leaderboard</span>
                </Link>
            </div>

            {/* Recent Quiz History */}
            {history.length > 0 && (
                <div className="section">
                    <h2>Recent Quizzes</h2>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Difficulty</th>
                                <th>Score</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((session) => (
                                <tr key={session.id}>
                                    <td>{session.subject_name}</td>
                                    <td>
                                        <span className={`badge badge-${session.difficulty}`}>
                                            {session.difficulty}
                                        </span>
                                    </td>
                                    <td>
                                        {session.score}/{session.total_questions} ({session.percentage}%)
                                    </td>
                                    <td>{new Date(session.started_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
