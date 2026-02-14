import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Eye, Trophy, ChevronLeft, Loader, Users, Crown,
    CheckCircle2, XCircle, Swords, Wifi, WifiOff
} from 'lucide-react';

const DIFF_CONFIG = {
    easy: { label: 'Easy', color: '#22c55e', emoji: '🟢' },
    medium: { label: 'Medium', color: '#f59e0b', emoji: '🟡' },
    hard: { label: 'Hard', color: '#ef4444', emoji: '🔴' },
};

export default function SpectatorView() {
    const { tournamentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [state, setState] = useState(null);
    const [connected, setConnected] = useState(false);
    const [events, setEvents] = useState([]); // live feed
    const wsRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('access');
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname;
        const port = '8000';
        const url = `${protocol}://${host}:${port}/ws/spectate/${tournamentId}/?token=${token}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);

            if (data.type === 'initial_state') {
                setState(data);
            } else if (data.type === 'match_update') {
                // Update match in state
                setState(prev => {
                    if (!prev) return prev;
                    const matches = (prev.matches || []).map(m =>
                        m.id === data.match_id
                            ? { ...m, p1_passed: data.p1_passed, p1_total: data.p1_total, p2_passed: data.p2_passed, p2_total: data.p2_total, status: data.status }
                            : m
                    );
                    return { ...prev, matches };
                });
                setEvents(prev => [{
                    id: Date.now(),
                    text: `📝 ${data.player1 || '?'} vs ${data.player2 || '?'} — score update`,
                    time: new Date(),
                }, ...prev].slice(0, 30));
            } else if (data.type === 'match_completed') {
                setState(prev => {
                    if (!prev) return prev;
                    const matches = (prev.matches || []).map(m =>
                        m.id === data.match_id
                            ? { ...m, winner: data.winner, p1_passed: data.p1_passed, p1_total: data.p1_total, p2_passed: data.p2_passed, p2_total: data.p2_total, status: 'completed' }
                            : m
                    );
                    return { ...prev, matches };
                });
                setEvents(prev => [{
                    id: Date.now(),
                    text: `🏆 ${data.winner} wins Round ${data.round_number}!`,
                    time: new Date(),
                }, ...prev].slice(0, 30));
            } else if (data.type === 'tournament_completed') {
                setState(prev => prev ? { ...prev, status: 'completed', winner: data.winner } : prev);
                setEvents(prev => [{
                    id: Date.now(),
                    text: `🎉 ${data.winner} wins the tournament!`,
                    time: new Date(),
                }, ...prev].slice(0, 30));
            } else if (data.type === 'round_advanced') {
                setEvents(prev => [{
                    id: Date.now(),
                    text: `🔄 ${data.message}`,
                    time: new Date(),
                }, ...prev].slice(0, 30));
            }
        };

        return () => ws.close();
    }, [tournamentId]);

    if (!state) {
        return (
            <div className="spectator-page">
                <div className="spectator-loading">
                    <Loader className="spin" size={32} />
                    <p>Connecting to tournament...</p>
                </div>
            </div>
        );
    }

    const dc = DIFF_CONFIG[state.difficulty] || DIFF_CONFIG.medium;

    // Group matches by round
    const rounds = {};
    (state.matches || []).forEach(m => {
        if (!rounds[m.round_number]) rounds[m.round_number] = [];
        rounds[m.round_number].push(m);
    });
    const roundNums = Object.keys(rounds).map(Number).sort();
    const totalRounds = state.total_rounds || roundNums.length;

    const roundLabel = (r) => {
        if (r === totalRounds) return '🏆 Final';
        if (r === totalRounds - 1) return 'Semifinal';
        if (r === totalRounds - 2) return 'Quarterfinal';
        return `Round ${r}`;
    };

    return (
        <div className="spectator-page">
            {/* Header */}
            <div className="spectator-header">
                <button className="battle-btn-ghost" onClick={() => navigate('/tournament')}>
                    <ChevronLeft size={18} /> Back
                </button>
                <div className="spectator-title">
                    <Eye size={24} />
                    <h1>Spectating: {state.name}</h1>
                    <span className="spec-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                </div>
                <div className="spectator-status">
                    {connected
                        ? <span className="spec-live"><Wifi size={14} /> LIVE</span>
                        : <span className="spec-offline"><WifiOff size={14} /> Disconnected</span>
                    }
                    <span><Users size={14} /> {state.player_count}/{state.max_players}</span>
                </div>
            </div>

            {/* Winner Banner */}
            {state.status === 'completed' && state.winner && (
                <div className="spectator-winner-banner">
                    <Crown size={28} />
                    <span>🎉 <strong>{state.winner}</strong> wins the tournament!</span>
                </div>
            )}

            {/* Main Content: bracket + live feed side by side */}
            <div className="spectator-body">
                {/* Bracket */}
                <div className="spectator-bracket">
                    <div className="bracket-container">
                        <div className="bracket-scroll">
                            <div className="bracket" style={{ '--rounds': roundNums.length }}>
                                {roundNums.map(r => (
                                    <div key={r} className="bracket-round">
                                        <div className="bracket-round-label">{roundLabel(r)}</div>
                                        <div className="bracket-matches">
                                            {rounds[r].map(m => (
                                                <div key={m.id} className={`bracket-match ${m.status} spectator-match`}>
                                                    <div className={`bm-player ${m.winner === m.player1 ? 'winner' : m.winner && m.winner !== m.player1 ? 'loser' : ''}`}>
                                                        <span className="bm-name">{m.player1 || 'TBD'}</span>
                                                        {m.p1_total > 0 && (
                                                            <span className="bm-score">
                                                                {m.p1_passed}/{m.p1_total}
                                                                {m.p1_passed === m.p1_total && m.p1_total > 0 && <CheckCircle2 size={12} />}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="bm-vs">
                                                        {m.status === 'in_progress' ? <Loader className="spin" size={12} /> : 'VS'}
                                                    </div>
                                                    <div className={`bm-player ${m.winner === m.player2 ? 'winner' : m.winner && m.winner !== m.player2 ? 'loser' : ''}`}>
                                                        <span className="bm-name">{m.player2 || 'TBD'}</span>
                                                        {m.p2_total > 0 && (
                                                            <span className="bm-score">
                                                                {m.p2_passed}/{m.p2_total}
                                                                {m.p2_passed === m.p2_total && m.p2_total > 0 && <CheckCircle2 size={12} />}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Feed */}
                <div className="spectator-feed">
                    <h3><Swords size={16} /> Live Feed</h3>
                    {events.length === 0 ? (
                        <div className="spec-feed-empty">
                            <p>Waiting for match activity...</p>
                        </div>
                    ) : (
                        <div className="spec-feed-list">
                            {events.map(ev => (
                                <div key={ev.id} className="spec-feed-item">
                                    <span className="spec-feed-text">{ev.text}</span>
                                    <span className="spec-feed-time">
                                        {ev.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
