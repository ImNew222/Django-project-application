import { useState, useEffect } from 'react';
import { leaderboardAPI, typingAPI, socialAPI, quizAPI, compilerAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    Trophy, Award, Target, Flame, Zap, Star,
    BookOpen, Shield, Crown, Medal, Sparkles,
    Lock, CheckCircle, Swords, Code2
} from 'lucide-react';

const BADGES = [
    {
        id: 'first_quiz',
        name: 'First Steps',
        description: 'Complete your first quiz',
        icon: Star,
        color: '#3b82f6',
        check: (stats) => stats.total_quizzes >= 1,
    },
    {
        id: 'ten_quizzes',
        name: 'Quiz Veteran',
        description: 'Complete 10 quizzes',
        icon: Target,
        color: '#8b5cf6',
        check: (stats) => stats.total_quizzes >= 10,
    },
    {
        id: 'perfect_score',
        name: 'Perfectionist',
        description: 'Get 100% on a quiz',
        icon: CheckCircle,
        color: '#22c55e',
        check: (stats, extra) => extra.hasPerfect,
    },
    {
        id: 'streak_5',
        name: 'On Fire',
        description: 'Achieve a 5 win streak',
        icon: Flame,
        color: '#f97316',
        check: (stats) => stats.best_streak >= 5,
    },
    {
        id: 'streak_10',
        name: 'Unstoppable',
        description: 'Achieve a 10 win streak',
        icon: Zap,
        color: '#ef4444',
        check: (stats) => stats.best_streak >= 10,
    },
    {
        id: 'rank_scholar',
        name: 'Scholar',
        description: 'Reach Scholar rank (500 pts)',
        icon: BookOpen,
        color: '#06b6d4',
        check: (stats) => stats.rank_points >= 500,
    },
    {
        id: 'rank_expert',
        name: 'Expert',
        description: 'Reach Expert rank (1500 pts)',
        icon: Shield,
        color: '#8b5cf6',
        check: (stats) => stats.rank_points >= 1500,
    },
    {
        id: 'rank_master',
        name: 'Master',
        description: 'Reach Master rank (3000 pts)',
        icon: Award,
        color: '#f59e0b',
        check: (stats) => stats.rank_points >= 3000,
    },
    {
        id: 'rank_legend',
        name: 'Legend',
        description: 'Reach Legend rank (5000 pts)',
        icon: Crown,
        color: '#ec4899',
        check: (stats) => stats.rank_points >= 5000,
    },
    {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Create 10 social posts',
        icon: Sparkles,
        color: '#14b8a6',
        check: (stats, extra) => extra.postCount >= 10,
    },
    {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Type at 60+ WPM in a typing contest',
        icon: Zap,
        color: '#6366f1',
        check: (stats, extra) => extra.bestWPM >= 60,
    },
    {
        id: 'accuracy_king',
        name: 'Accuracy King',
        description: 'Maintain 80%+ quiz accuracy',
        icon: Medal,
        color: '#d946ef',
        check: (stats) => stats.total_questions_answered >= 10 && stats.accuracy >= 80,
    },
    // ── Coding Badges ──
    {
        id: 'code_warrior',
        name: 'Code Warrior',
        description: 'Win your first code battle',
        icon: Swords,
        color: '#ef4444',
        check: (stats, extra) => extra.codingStats?.battles_won >= 1,
    },
    {
        id: 'battle_hardened',
        name: 'Battle Hardened',
        description: 'Win 10 code battles',
        icon: Shield,
        color: '#dc2626',
        check: (stats, extra) => extra.codingStats?.battles_won >= 10,
    },
    {
        id: 'tournament_champion',
        name: 'Tournament Champion',
        description: 'Win a tournament',
        icon: Crown,
        color: '#f59e0b',
        check: (stats, extra) => extra.codingStats?.tournament_wins >= 1,
    },
    {
        id: 'streak_master',
        name: 'Streak Master',
        description: '7-day daily challenge streak',
        icon: Flame,
        color: '#f97316',
        check: (stats, extra) => extra.codingStats?.best_daily_streak >= 7,
    },
    {
        id: 'daily_devotee',
        name: 'Daily Devotee',
        description: '30-day daily challenge streak',
        icon: Star,
        color: '#eab308',
        check: (stats, extra) => extra.codingStats?.best_daily_streak >= 30,
    },
    {
        id: 'elo_rising',
        name: 'ELO Rising',
        description: 'Reach 1200 ELO rating',
        icon: Code2,
        color: '#6366f1',
        check: (stats, extra) => extra.codingStats?.elo_rating >= 1200,
    },
];

export default function AchievementsPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [extra, setExtra] = useState({ hasPerfect: false, postCount: 0, bestWPM: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, historyRes, postsRes, typingRes, profileRes] = await Promise.all([
                    leaderboardAPI.getMyStats(),
                    quizAPI.getHistory(),
                    socialAPI.getMyPosts().catch(() => ({ data: [] })),
                    typingAPI.getHistory().catch(() => ({ data: [] })),
                    compilerAPI.profileStats().catch(() => ({ data: { coding_stats: {} } })),
                ]);
                setStats(statsRes.data);
                const hasPerfect = historyRes.data.some(
                    (q) => q.score === q.total_questions && q.total_questions > 0
                );
                const postCount = postsRes.data?.length || 0;
                const bestWPM = typingRes.data?.length
                    ? Math.max(...typingRes.data.map((t) => t.wpm || 0))
                    : 0;
                const codingStats = profileRes.data?.coding_stats || {};
                setExtra({ hasPerfect, postCount, bestWPM, codingStats });
            } catch (err) {
                console.error('Failed to load achievements:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="loading">Loading achievements...</div>;

    const unlocked = BADGES.filter((b) => stats && b.check(stats, extra));
    const locked = BADGES.filter((b) => !stats || !b.check(stats, extra));

    return (
        <div className="achievements-page">
            <h1><Trophy size={28} /> Achievements</h1>
            <p className="achievements-summary">
                {unlocked.length} / {BADGES.length} badges unlocked
            </p>

            <div className="badge-progress-bar">
                <div
                    className="badge-progress-fill"
                    style={{ width: `${(unlocked.length / BADGES.length) * 100}%` }}
                />
            </div>

            <h2>Unlocked</h2>
            <div className="badges-grid">
                {unlocked.length === 0 && (
                    <p className="muted">No badges yet — keep playing!</p>
                )}
                {unlocked.map((badge) => {
                    const Icon = badge.icon;
                    return (
                        <div key={badge.id} className="badge-card unlocked" style={{ borderColor: badge.color }}>
                            <div className="badge-icon" style={{ background: badge.color }}>
                                <Icon size={24} color="#fff" />
                            </div>
                            <div className="badge-info">
                                <strong>{badge.name}</strong>
                                <span>{badge.description}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <h2>Locked</h2>
            <div className="badges-grid">
                {locked.map((badge) => (
                    <div key={badge.id} className="badge-card locked">
                        <div className="badge-icon locked-icon">
                            <Lock size={24} color="#999" />
                        </div>
                        <div className="badge-info">
                            <strong>{badge.name}</strong>
                            <span>{badge.description}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
