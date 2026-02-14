import { useState, useEffect } from 'react';
import { compilerAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    Users, Search, UserPlus, UserMinus, Crown,
    Shield, Swords, Loader, X
} from 'lucide-react';

const TIER_COLORS = {
    Bronze: '#cd7f32', Silver: '#94a3b8', Gold: '#f59e0b',
    Platinum: '#06b6d4', Diamond: '#8b5cf6', Master: '#ef4444',
};

export default function FriendsPage() {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [tab, setTab] = useState('following');
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friends, setFriends] = useState({ following: [], followers: [], following_count: 0, followers_count: 0 });
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    // Challenge state
    const [challengeTarget, setChallengeTarget] = useState(null);
    const [challengeSending, setChallengeSending] = useState(false);

    useEffect(() => { loadFriends(); }, []);

    const loadFriends = async () => {
        try {
            const res = await compilerAPI.getFriends();
            setFriends(res.data);
        } catch { /* ignore */ } finally { setLoading(false); }
    };

    const doSearch = async () => {
        if (searchQ.trim().length < 2) return;
        setSearching(true);
        try {
            const res = await compilerAPI.searchUsers(searchQ.trim());
            setSearchResults(res.data);
        } catch { /* ignore */ } finally { setSearching(false); }
    };

    const toggleFollow = async (userId) => {
        try {
            const res = await compilerAPI.toggleFollow(userId);
            addToast(res.data.is_following ? '✅ Followed!' : '👋 Unfollowed', 'success');
            loadFriends();
            setSearchResults(prev => prev.map(u =>
                u.id === userId ? { ...u, is_following: res.data.is_following } : u
            ));
        } catch { addToast('Failed to follow/unfollow', 'error'); }
    };

    const sendChallenge = async (difficulty) => {
        if (!challengeTarget) return;
        setChallengeSending(true);
        try {
            await compilerAPI.sendInvite({
                receiver_id: challengeTarget.id,
                difficulty,
            });
            addToast(`⚔️ Challenge sent to ${challengeTarget.username}!`, 'success');
            setChallengeTarget(null);
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to send challenge', 'error');
        } finally {
            setChallengeSending(false);
        }
    };

    const UserCard = ({ u }) => (
        <div className="friend-card">
            <div className="friend-avatar">
                {u.username[0].toUpperCase()}
            </div>
            <div className="friend-info">
                <div className="friend-name">
                    {u.first_name || u.username}
                    {u.last_name ? ` ${u.last_name}` : ''}
                </div>
                <div className="friend-username">@{u.username}</div>
                <div className="friend-badges">
                    <span className="friend-elo"
                        style={{ color: TIER_COLORS[u.elo_tier] || '#888' }}>
                        <Shield size={12} /> {u.elo_rating} ELO
                    </span>
                    <span className="friend-tier"
                        style={{ background: TIER_COLORS[u.elo_tier] || '#888' }}>
                        {u.elo_tier}
                    </span>
                    <span className="friend-rank">
                        <Crown size={12} /> {u.rank_title}
                    </span>
                </div>
            </div>
            <div className="friend-actions">
                <button
                    className="btn btn-sm btn-challenge"
                    onClick={() => setChallengeTarget(u)}
                    title="Challenge to battle"
                >
                    <Swords size={14} /> Challenge
                </button>
                <button
                    className={`btn btn-sm ${u.is_following ? 'btn-outline' : 'btn-primary'}`}
                    onClick={() => toggleFollow(u.id)}
                >
                    {u.is_following
                        ? <><UserMinus size={14} /> Unfollow</>
                        : <><UserPlus size={14} /> Follow</>
                    }
                </button>
            </div>
        </div>
    );

    const list = tab === 'following' ? friends.following
        : tab === 'followers' ? friends.followers
            : searchResults;

    return (
        <div className="friends-page">
            <h1><Users size={24} /> Friends</h1>

            <div className="friends-tabs">
                <button className={`ftab ${tab === 'following' ? 'active' : ''}`}
                    onClick={() => setTab('following')}>
                    Following <span className="ftab-count">{friends.following_count}</span>
                </button>
                <button className={`ftab ${tab === 'followers' ? 'active' : ''}`}
                    onClick={() => setTab('followers')}>
                    Followers <span className="ftab-count">{friends.followers_count}</span>
                </button>
                <button className={`ftab ${tab === 'search' ? 'active' : ''}`}
                    onClick={() => setTab('search')}>
                    <Search size={14} /> Find Users
                </button>
            </div>

            {tab === 'search' && (
                <div className="friends-search-bar">
                    <input
                        type="text"
                        placeholder="Search by username..."
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doSearch()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={doSearch} disabled={searching}>
                        {searching ? <Loader size={14} className="spin" /> : <Search size={14} />}
                        Search
                    </button>
                </div>
            )}

            {loading ? (
                <div className="loading-state"><Loader className="spin" /> Loading...</div>
            ) : list.length === 0 ? (
                <div className="empty-state">
                    {tab === 'search'
                        ? (searchResults.length === 0 && searchQ ? 'No users found' : 'Type a username and search')
                        : tab === 'following' ? 'You\'re not following anyone yet'
                            : 'No one is following you yet'}
                </div>
            ) : (
                <div className="friends-list">
                    {list.map(u => <UserCard key={u.id} u={u} />)}
                </div>
            )}

            {/* Difficulty Picker Modal */}
            {challengeTarget && (
                <div className="challenge-modal-overlay" onClick={() => setChallengeTarget(null)}>
                    <div className="challenge-modal" onClick={e => e.stopPropagation()}>
                        <button className="challenge-modal-close" onClick={() => setChallengeTarget(null)}>
                            <X size={18} />
                        </button>
                        <h3>⚔️ Challenge {challengeTarget.username}</h3>
                        <p>Choose a difficulty for the battle:</p>
                        <div className="challenge-difficulty-options">
                            <button
                                className="challenge-diff-btn easy"
                                onClick={() => sendChallenge('easy')}
                                disabled={challengeSending}
                            >
                                🟢 Easy
                            </button>
                            <button
                                className="challenge-diff-btn medium"
                                onClick={() => sendChallenge('medium')}
                                disabled={challengeSending}
                            >
                                🟡 Medium
                            </button>
                            <button
                                className="challenge-diff-btn hard"
                                onClick={() => sendChallenge('hard')}
                                disabled={challengeSending}
                            >
                                🔴 Hard
                            </button>
                        </div>
                        {challengeSending && (
                            <div className="challenge-sending">
                                <Loader size={16} className="spin" /> Sending challenge...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
