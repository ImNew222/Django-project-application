import { useState, useEffect } from 'react';
import { leaderboardAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Flame } from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [players, setPlayers] = useState([]);
    const [myStats, setMyStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [boardRes, statsRes] = await Promise.all([
                    leaderboardAPI.getLeaderboard(),
                    leaderboardAPI.getMyStats(),
                ]);
                setPlayers(boardRes.data);
                setMyStats(statsRes.data);
            } catch (err) {
                console.error('Failed to load leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="leaderboard-page">
            <h1><Trophy size={28} /> Leaderboard</h1>
            {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} lines={2} />)}
        </div>
    );

    const getMedal = (index) => {
        if (index === 0) return <Medal size={20} color="#FFD700" />;
        if (index === 1) return <Medal size={20} color="#C0C0C0" />;
        if (index === 2) return <Medal size={20} color="#CD7F32" />;
        return `#${index + 1}`;
    };

    return (
        <div className="leaderboard-page">
            <h1><Trophy size={28} /> Leaderboard</h1>

            {/* My Stats Banner */}
            {myStats && (
                <div className="my-stats-banner">
                    <div className="my-rank">#{myStats.rank_position}</div>
                    <div className="my-info">
                        <span className="my-name">{user?.username}</span>
                        <span className="my-title">{myStats.rank_title}</span>
                    </div>
                    <div className="my-points">{myStats.rank_points} pts</div>
                    <div className="my-streak"><Flame size={16} /> {myStats.current_streak}</div>
                </div>
            )}

            {/* Leaderboard Table */}
            {players.length === 0 ? (
                <div className="empty-state">
                    <p>No one has taken a quiz yet. Be the first!</p>
                </div>
            ) : (
                <table className="data-table leaderboard-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Title</th>
                            <th>Points</th>
                            <th>Quizzes</th>
                            <th>Accuracy</th>
                            <th>Streak</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((player, index) => (
                            <tr
                                key={index}
                                className={`${player.username === user?.username ? 'highlight-row' : ''} ${index < 3 ? 'top-three' : ''}`}
                            >
                                <td className="rank-cell">{getMedal(index)}</td>
                                <td className="player-cell">{player.username}</td>
                                <td>
                                    <span className="rank-badge">{player.rank_title}</span>
                                </td>
                                <td className="points-cell">{player.rank_points}</td>
                                <td>{player.total_quizzes}</td>
                                <td>{player.accuracy}%</td>
                                <td>{player.current_streak > 0 ? <><Flame size={14} /> {player.current_streak}</> : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
