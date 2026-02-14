import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
    Trophy, Plus, Users, Play, Clock, ChevronLeft, Loader,
    Code2, Eye, Lightbulb, Copy, Check, RotateCcw,
    Sun, Moon, Award, Shield, Swords, CheckCircle2, XCircle,
    Hash, Crown, Terminal, Trash2, LogOut, Timer
} from 'lucide-react';
import { compilerAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TournamentChat from '../components/TournamentChat';

const LANG_MAP = {
    71: { name: 'Python', monaco: 'python', starterKey: 'starter_python' },
    63: { name: 'JavaScript', monaco: 'javascript', starterKey: 'starter_javascript' },
    54: { name: 'C++', monaco: 'cpp', starterKey: 'starter_cpp' },
    62: { name: 'Java', monaco: 'java', starterKey: 'starter_java' },
};

const DIFF_CONFIG = {
    easy: { label: 'Easy', color: '#22c55e', emoji: '🟢' },
    medium: { label: 'Medium', color: '#f59e0b', emoji: '🟡' },
    hard: { label: 'Hard', color: '#ef4444', emoji: '🔴' },
};

export default function TournamentPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState('lobby'); // lobby | bracket | match
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTournament, setActiveTournament] = useState(null);
    const [activeMatch, setActiveMatch] = useState(null);

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '', description: '', max_players: 8, difficulty: 'medium', prize_points: 100,
    });

    // Join form
    const [joinCode, setJoinCode] = useState('');

    // Match state
    const [code, setCode] = useState('');
    const [langId, setLangId] = useState(71);
    const [darkTheme, setDarkTheme] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [copied, setCopied] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null); // seconds remaining

    const editorRef = useRef(null);

    const formatTime = (s) => {
        if (s == null || s < 0) return '--:--';
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Auto-poll: lobby refreshes list every 5s
    useEffect(() => {
        if (mode !== 'lobby') return;
        loadTournaments(true);
        const id = setInterval(() => loadTournaments(false), 5000);
        return () => clearInterval(id);
    }, [mode]);

    // Auto-poll: bracket view refreshes every 3s (detects start, match updates, cancellation)
    useEffect(() => {
        if (mode !== 'bracket' || !activeTournament) return;
        const poll = async () => {
            try {
                const res = await compilerAPI.tournamentDetail(activeTournament.id);
                // Detect cancellation
                if (res.data.status === 'cancelled') {
                    alert('⚠️ Tournament was cancelled by the host.');
                    setActiveTournament(null);
                    setMode('lobby');
                    loadTournaments(false);
                    return;
                }
                setActiveTournament(res.data);
                if (res.data.active_match) {
                    setActiveMatch(res.data.active_match);
                }
            } catch (e) { console.error(e); }
        };
        const id = setInterval(poll, 3000);
        return () => clearInterval(id);
    }, [mode, activeTournament?.id]);

    // Auto-poll: match waiting for opponent result every 4s
    useEffect(() => {
        if (mode !== 'match' || !activeTournament || !activeMatch) return;
        if (results?.match_over) return; // match done, stop polling
        const poll = async () => {
            try {
                const res = await compilerAPI.tournamentDetail(activeTournament.id);
                setActiveTournament(res.data);
                // Check if our match is now completed
                const updatedMatch = (res.data.matches || []).find(
                    m => m.id === activeMatch.match_id
                );
                if (updatedMatch && updatedMatch.status === 'completed') {
                    setResults(prev => prev ? { ...prev, match_over: true, winner: updatedMatch.winner } : prev);
                    setActiveMatch(res.data.active_match || null);
                }
            } catch (e) { console.error(e); }
        };
        const id = setInterval(poll, 4000);
        return () => clearInterval(id);
    }, [mode, activeTournament?.id, activeMatch?.match_id, results?.match_over]);

    // Countdown timer: calculates from match started_at + time_limit
    useEffect(() => {
        if (mode !== 'match' || !activeMatch) { setTimeLeft(null); return; }
        if (results?.match_over) { setTimeLeft(null); return; }

        const calcTimeLeft = () => {
            if (!activeMatch.started_at) return null;
            const startedAt = new Date(activeMatch.started_at).getTime();
            const limitMs = (activeMatch.time_limit || 10) * 60 * 1000;
            const remaining = Math.max(0, Math.floor((startedAt + limitMs - Date.now()) / 1000));
            return remaining;
        };

        setTimeLeft(calcTimeLeft());
        const id = setInterval(() => {
            const remaining = calcTimeLeft();
            setTimeLeft(remaining);
            if (remaining !== null && remaining <= 0) {
                // Time expired — trigger timeout check
                compilerAPI.checkTimeout(activeTournament.id).then(res => {
                    if (res.data.timed_out) {
                        openTournament(activeTournament.id);
                        setMode('bracket');
                    }
                }).catch(() => { });
                clearInterval(id);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [mode, activeMatch?.match_id, activeMatch?.started_at, results?.match_over]);

    const loadTournaments = async (showSpinner = false) => {
        if (showSpinner) setLoading(true);
        try {
            const res = await compilerAPI.tournaments();
            setTournaments(res.data);
        } catch (e) { console.error(e); }
        if (showSpinner) setLoading(false);
    };

    const createTournament = async () => {
        if (!createForm.name.trim()) return;
        try {
            const res = await compilerAPI.createTournament(createForm);
            setShowCreate(false);
            setCreateForm({ name: '', description: '', max_players: 8, difficulty: 'medium', prize_points: 100 });
            loadTournaments();
            openTournament(res.data.id);
        } catch (e) { console.error(e); }
    };

    const joinTournament = async () => {
        if (!joinCode.trim()) return;
        try {
            const res = await compilerAPI.joinByCode(joinCode);
            setJoinCode('');
            openTournament(res.data.id);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to join');
        }
    };

    const deleteTournament = async () => {
        if (!activeTournament) return;
        const msg = activeTournament.status === 'in_progress'
            ? 'Cancel this tournament? All ongoing matches will end. This cannot be undone.'
            : 'Cancel this tournament? This cannot be undone.';
        if (!window.confirm(msg)) return;
        try {
            await compilerAPI.deleteTournament(activeTournament.id);
            setActiveTournament(null);
            setMode('lobby');
            loadTournaments(false);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to cancel');
        }
    };

    const leaveTournament = async () => {
        if (!activeTournament) return;
        const msg = activeTournament.status === 'in_progress'
            ? 'Leave and forfeit your current match? Your opponent will auto-advance.'
            : 'Leave this tournament?';
        if (!window.confirm(msg)) return;
        try {
            await compilerAPI.leaveTournament(activeTournament.id);
            setActiveTournament(null);
            setActiveMatch(null);
            setMode('lobby');
            loadTournaments(false);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to leave');
        }
    };

    const openTournament = async (id) => {
        try {
            const res = await compilerAPI.tournamentDetail(id);
            setActiveTournament(res.data);
            setMode('bracket');

            if (res.data.active_match) {
                setActiveMatch(res.data.active_match);
                const lang = LANG_MAP[langId];
                setCode(res.data.active_match.challenge?.[lang?.starterKey] || '');
            }
        } catch (e) { console.error(e); }
    };

    const startTournament = async () => {
        if (!activeTournament) return;
        try {
            await compilerAPI.startTournament(activeTournament.id);
            openTournament(activeTournament.id);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to start');
        }
    };

    const submitSolution = async () => {
        if (!code.trim() || !activeMatch || !activeTournament) return;
        setSubmitting(true);
        setResults(null);
        try {
            const res = await compilerAPI.tournamentSubmit(activeTournament.id, {
                match_id: activeMatch.match_id,
                source_code: code,
                language_id: langId,
            });
            setResults(res.data);
            if (res.data.match_over) {
                // Refresh the bracket
                setTimeout(() => openTournament(activeTournament.id), 2000);
            }
        } catch (e) {
            alert(e.response?.data?.error || 'Submit failed');
        }
        setSubmitting(false);
    };

    const changeLang = (newId) => {
        setLangId(newId);
        if (activeMatch?.challenge) {
            const lang = LANG_MAP[newId];
            setCode(activeMatch.challenge[lang?.starterKey] || '');
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const goToMatch = () => {
        if (activeMatch) {
            const lang = LANG_MAP[langId];
            setCode(activeMatch.challenge?.[lang?.starterKey] || '');
            setResults(null);
            setMode('match');
        }
    };

    /* ════════════════════════════════════════════════════════
       LOBBY
       ════════════════════════════════════════════════════════ */
    if (mode === 'lobby') {
        return (
            <div className="tournament-page">
                <div className="tournament-header">
                    <div className="tournament-header-left">
                        <Trophy size={28} />
                        <h1>Tournaments</h1>
                    </div>
                    <button className="tournament-create-btn" onClick={() => setShowCreate(!showCreate)}>
                        <Plus size={18} /> Create Tournament
                    </button>
                </div>

                {/* Create Form */}
                {showCreate && (
                    <div className="tournament-form-card">
                        <h3>Create New Tournament</h3>
                        <div className="tf-row">
                            <input
                                type="text" placeholder="Tournament Name"
                                value={createForm.name}
                                onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                className="tf-input"
                            />
                        </div>
                        <div className="tf-row">
                            <input
                                type="text" placeholder="Description (optional)"
                                value={createForm.description}
                                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                className="tf-input"
                            />
                        </div>
                        <div className="tf-row tf-row-grid">
                            <label>
                                <span>Players</span>
                                <select value={createForm.max_players} onChange={e => setCreateForm({ ...createForm, max_players: Number(e.target.value) })}>
                                    <option value={4}>4 Players</option>
                                    <option value={8}>8 Players</option>
                                    <option value={16}>16 Players</option>
                                </select>
                            </label>
                            <label>
                                <span>Difficulty</span>
                                <select value={createForm.difficulty} onChange={e => setCreateForm({ ...createForm, difficulty: e.target.value })}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </label>
                            <label>
                                <span>Prize Points</span>
                                <input type="number" value={createForm.prize_points} onChange={e => setCreateForm({ ...createForm, prize_points: Number(e.target.value) })} min={10} max={1000} />
                            </label>
                        </div>
                        <button className="tf-submit" onClick={createTournament}><Trophy size={16} /> Create</button>
                    </div>
                )}

                {/* Join by Code */}
                <div className="tournament-join-bar">
                    <Hash size={18} />
                    <input
                        type="text" placeholder="Enter 6-character join code"
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="tf-input-sm"
                        style={{ flex: 1, maxWidth: 200 }}
                    />
                    <button className="tournament-join-btn" onClick={joinTournament} disabled={!joinCode || joinCode.length !== 6}>
                        Join Tournament
                    </button>
                </div>

                {/* Tournament List */}
                {loading ? (
                    <div className="tournament-loading"><Loader className="spin" size={32} /></div>
                ) : tournaments.length === 0 ? (
                    <div className="tournament-empty">
                        <Trophy size={48} />
                        <h2>No Tournaments Yet</h2>
                        <p>Create a tournament and invite your friends!</p>
                    </div>
                ) : (
                    <div className="tournament-list">
                        {tournaments.map(t => {
                            const dc = DIFF_CONFIG[t.difficulty] || DIFF_CONFIG.medium;
                            return (
                                <div key={t.id} className={`tournament-card ${t.status}`} onClick={() => openTournament(t.id)}>
                                    <div className="tc-top">
                                        <span className="tc-status">{t.status === 'open' ? '🟢 Open' : t.status === 'in_progress' ? '🔵 In Progress' : '🏆 Completed'}</span>
                                        <span className="tc-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                                    </div>
                                    <h3>{t.name}</h3>
                                    <div className="tc-meta">
                                        <span><Users size={14} /> {t.player_count}/{t.max_players}</span>
                                        <span><Hash size={14} /> {t.join_code}</span>
                                    </div>
                                    <div className="tc-rewards">
                                        <span className="tc-reward gold">🥇 {t.prize_points} pts</span>
                                        <span className="tc-reward silver">🥈 {t.runner_up_points} pts</span>
                                        <span className="tc-reward elo">⚡ +{t.elo_bonus} ELO</span>
                                    </div>
                                    {t.winner && <div className="tc-winner"><Crown size={14} /> Winner: {t.winner}</div>}
                                    <div className="tc-footer">
                                        <span className="tc-host">by {t.created_by}</span>
                                        <div className="tc-footer-right">
                                            {t.is_joined && <span className="tc-joined-badge">✓ Joined</span>}
                                            {t.status === 'in_progress' && (
                                                <button
                                                    className="tc-spectate-btn"
                                                    onClick={e => { e.stopPropagation(); navigate(`/spectate/${t.id}`); }}
                                                    title="Watch live"
                                                >
                                                    <Eye size={14} /> Spectate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════
       BRACKET VIEW
       ════════════════════════════════════════════════════════ */
    if (mode === 'bracket' && activeTournament) {
        const t = activeTournament;
        const dc = DIFF_CONFIG[t.difficulty] || DIFF_CONFIG.medium;

        // Group matches by round
        const rounds = {};
        (t.matches || []).forEach(m => {
            if (!rounds[m.round_number]) rounds[m.round_number] = [];
            rounds[m.round_number].push(m);
        });
        const roundNums = Object.keys(rounds).map(Number).sort();

        const roundLabel = (r, total) => {
            if (r === total) return '🏆 Final';
            if (r === total - 1) return 'Semifinal';
            if (r === total - 2) return 'Quarterfinal';
            return `Round ${r}`;
        };

        return (
            <div className="tournament-page">
                <div className="tournament-header">
                    <button className="battle-btn-ghost" onClick={() => { setMode('lobby'); setActiveTournament(null); }}>
                        <ChevronLeft size={18} /> Back
                    </button>
                    <div className="tournament-header-left">
                        <Trophy size={24} />
                        <h1>{t.name}</h1>
                        <span className="tc-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                    </div>
                    <div className="tournament-header-info">
                        <span><Users size={14} /> {t.player_count}/{t.max_players}</span>
                        <span><Award size={14} /> {t.prize_points} pts</span>
                        <span className="tc-code"><Hash size={14} /> {t.join_code}</span>
                    </div>
                </div>

                {/* Host Controls */}
                {t.is_host && (t.status === 'open' || t.status === 'in_progress') && (
                    <div className="tournament-host-bar">
                        {t.status === 'open' ? (
                            <span>Share code <strong>{t.join_code}</strong> with friends to join!</span>
                        ) : (
                            <span>Tournament in progress — Round {t.current_round}/{t.total_rounds}</span>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="tournament-cancel-btn" onClick={deleteTournament}>
                                <Trash2 size={16} /> Cancel
                            </button>
                            {t.status === 'open' && (
                                <button className="tf-submit" onClick={startTournament} disabled={t.player_count < 2}>
                                    <Play size={16} /> Start ({t.player_count} players)
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Non-host Leave Button */}
                {!t.is_host && t.is_joined && (t.status === 'open' || t.status === 'in_progress') && (
                    <div className="tournament-leave-bar">
                        <span>{t.status === 'in_progress' ? 'Leaving will forfeit your current match.' : 'You can leave before the tournament starts.'}</span>
                        <button className="tournament-cancel-btn" onClick={leaveTournament}>
                            <LogOut size={16} /> Leave Tournament
                        </button>
                    </div>
                )}

                {/* Rewards Info */}
                {t.status !== 'cancelled' && (
                    <div className="tournament-rewards-bar">
                        <span className="tc-reward gold">🥇 Winner: {t.prize_points} pts + {t.elo_bonus} ELO</span>
                        <span className="tc-reward silver">🥈 Runner-up: {t.runner_up_points} pts</span>
                    </div>
                )}

                {/* Winner Banner */}
                {t.status === 'completed' && t.winner && (
                    <div className="tournament-winner-banner">
                        <Crown size={28} />
                        <span>🎉 <strong>{t.winner}</strong> wins the tournament! +{t.prize_points} pts</span>
                    </div>
                )}

                {/* Active Match Button */}
                {activeMatch && t.status === 'in_progress' && (
                    <div className="tournament-active-match">
                        <Swords size={20} />
                        <span>Your match vs <strong>{activeMatch.opponent}</strong> is ready!</span>
                        <button className="tf-submit" onClick={goToMatch}><Play size={16} /> Battle Now</button>
                    </div>
                )}

                {/* Participants (when open) */}
                {t.status === 'open' && (
                    <div className="tournament-participants">
                        <h3><Users size={16} /> Participants ({t.player_count}/{t.max_players})</h3>
                        <div className="tp-list">
                            {t.participants.map((p, i) => (
                                <div key={i} className="tp-item">
                                    <span className="tp-user">{p.username}</span>
                                    {p.username === t.created_by && <span className="tp-host-badge">Host</span>}
                                </div>
                            ))}
                            {Array.from({ length: t.max_players - t.player_count }).map((_, i) => (
                                <div key={`empty-${i}`} className="tp-item empty">
                                    <span className="tp-user">Waiting...</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bracket Visualization */}
                {roundNums.length > 0 && (
                    <div className="bracket-container">
                        <div className="bracket-scroll">
                            <div className="bracket" style={{ '--rounds': roundNums.length }}>
                                {roundNums.map(r => (
                                    <div key={r} className="bracket-round">
                                        <div className="bracket-round-label">{roundLabel(r, t.total_rounds)}</div>
                                        <div className="bracket-matches">
                                            {rounds[r].map(m => (
                                                <div key={m.id} className={`bracket-match ${m.status} ${m.is_my_match ? 'my-match' : ''}`}>
                                                    <div className={`bm-player ${m.winner === m.player1 ? 'winner' : m.winner && m.winner !== m.player1 ? 'loser' : ''}`}>
                                                        <span className="bm-name">{m.player1 || 'TBD'}</span>
                                                        {m.p1_total > 0 && <span className="bm-score">{m.p1_passed}/{m.p1_total}</span>}
                                                    </div>
                                                    <div className="bm-vs">VS</div>
                                                    <div className={`bm-player ${m.winner === m.player2 ? 'winner' : m.winner && m.winner !== m.player2 ? 'loser' : ''}`}>
                                                        <span className="bm-name">{m.player2 || 'TBD'}</span>
                                                        {m.p2_total > 0 && <span className="bm-score">{m.p2_passed}/{m.p2_total}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Refresh Button */}
                {t.status === 'in_progress' && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button className="battle-btn-ghost" onClick={() => openTournament(t.id)}>
                            <RotateCcw size={16} /> Refresh Bracket
                        </button>
                    </div>
                )}

                {/* Tournament Chat */}
                {t.is_joined && (t.status === 'open' || t.status === 'in_progress') && (
                    <TournamentChat tournamentId={t.id} />
                )}
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════
       MATCH VIEW (Code Arena)
       ════════════════════════════════════════════════════════ */
    if (mode === 'match' && activeMatch && activeTournament) {
        const challenge = activeMatch.challenge;
        const dc = DIFF_CONFIG[challenge?.difficulty] || DIFF_CONFIG.medium;

        return (
            <div className="battle-page arena">
                <div className="arena-topbar">
                    <button className="battle-btn-ghost" onClick={() => setMode('bracket')}>
                        <ChevronLeft size={18} /> Bracket
                    </button>
                    <div className="arena-title">
                        <span className="arena-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                        <h2>{challenge?.title}</h2>
                        <span className="arena-pvp-badge">🏆 Tournament vs {activeMatch.opponent}</span>
                    </div>
                    <div className="arena-meta">
                        {timeLeft !== null && (
                            <span className={`tournament-timer ${timeLeft <= 60 ? 'danger' : timeLeft <= 180 ? 'warning' : ''}`}>
                                <Timer size={16} /> {formatTime(timeLeft)}
                            </span>
                        )}
                        <button className="theme-toggle-btn" onClick={() => setDarkTheme(!darkTheme)}>
                            {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </div>

                <div className="arena-body">
                    <div className="arena-problem">
                        <div className="arena-desc" dangerouslySetInnerHTML={{
                            __html: challenge?.description?.replace(/\n/g, '<br>')
                                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                                .replace(/## (.*?)(<br>)/g, '<h3>$1</h3>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }} />

                        {challenge?.sample_tests?.length > 0 && (
                            <div className="arena-samples">
                                <h3><Eye size={16} /> Sample Test Cases</h3>
                                {challenge.sample_tests.map((t, i) => (
                                    <div key={t.id || i} className="sample-test">
                                        <div className="st-label">Test {i + 1}</div>
                                        <div className="st-row">
                                            <div className="st-col"><span className="st-head">Input</span><pre>{t.input_data}</pre></div>
                                            <div className="st-col"><span className="st-head">Expected</span><pre>{t.expected_output}</pre></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {challenge?.hint && (
                            <div className="arena-hint">
                                <button className="battle-btn-ghost" onClick={() => setShowHint(!showHint)}>
                                    <Lightbulb size={16} /> {showHint ? 'Hide Hint' : 'Show Hint'}
                                </button>
                                {showHint && <div className="hint-text">{challenge.hint}</div>}
                            </div>
                        )}
                    </div>

                    <div className="arena-editor-panel">
                        <div className="arena-toolbar">
                            <select value={langId} onChange={e => changeLang(Number(e.target.value))} className="arena-lang-select">
                                {Object.entries(LANG_MAP).map(([id, info]) => (
                                    <option key={id} value={id}>{info.name}</option>
                                ))}
                            </select>
                            <div className="arena-actions">
                                <button className="battle-btn-ghost" onClick={copyCode} title="Copy">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
                                <button className="battle-btn-ghost" onClick={() => {
                                    const li = LANG_MAP[langId];
                                    setCode(challenge?.[li?.starterKey] || '');
                                }} title="Reset"><RotateCcw size={16} /></button>
                            </div>
                        </div>

                        <div className="arena-editor">
                            <Editor
                                height="100%"
                                language={LANG_MAP[langId]?.monaco || 'python'}
                                theme={darkTheme ? 'vs-dark' : 'light'}
                                value={code}
                                onChange={val => setCode(val || '')}
                                onMount={editor => { editorRef.current = editor; }}
                                options={{
                                    fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false,
                                    wordWrap: 'on', tabSize: 4, automaticLayout: true,
                                }}
                            />
                        </div>

                        <div className="arena-submit-bar">
                            <button
                                className={`arena-submit-btn ${results?.match_over ? 'completed' : ''}`}
                                onClick={submitSolution}
                                disabled={submitting || results?.match_over}
                            >
                                {submitting ? <><Loader className="spin" size={18} /> Running Tests...</>
                                    : results?.match_over ? <><CheckCircle2 size={18} /> Match Complete</>
                                        : <><Play size={18} /> Submit Solution</>}
                            </button>
                        </div>

                        {results && (
                            <div className={`arena-results ${results.all_passed ? 'all-passed' : 'some-failed'}`}>
                                <div className="ar-header">
                                    <h3>
                                        {results.all_passed ? (
                                            <><CheckCircle2 size={20} /> All Tests Passed! 🎉</>
                                        ) : (
                                            <><XCircle size={20} /> {results.passed}/{results.total} Tests Passed</>
                                        )}
                                    </h3>
                                </div>

                                {results.match_over && (
                                    <div className={`tournament-match-result ${results.winner === user?.username ? 'won' : 'lost'}`}>
                                        <span>{results.winner === user?.username ? '🎉 You advance!' : `${results.winner} wins this round`}</span>
                                        <span className="tmr-scores">
                                            P1: {results.scores?.p1?.passed}/{results.scores?.p1?.total} |
                                            P2: {results.scores?.p2?.passed}/{results.scores?.p2?.total}
                                        </span>
                                    </div>
                                )}

                                {!results.match_over && (
                                    <div className="tournament-waiting">
                                        <Loader className="spin" size={16} /> Waiting for opponent to submit...
                                    </div>
                                )}

                                <div className="ar-tests">
                                    {results.test_results?.map((tr, i) => (
                                        <div key={i} className={`ar-test ${tr.passed ? 'pass' : 'fail'}`}>
                                            <div className="art-head">
                                                <span>{tr.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}</span>
                                                <span>Test {i + 1} {!tr.is_sample && '(Hidden)'}</span>
                                                {tr.execution_time && <span className="art-time">{tr.execution_time}s</span>}
                                            </div>
                                            {tr.is_sample && !tr.passed && (
                                                <div className="art-detail">
                                                    <div><strong>Input:</strong> <code>{tr.input}</code></div>
                                                    <div><strong>Expected:</strong> <code>{tr.expected}</code></div>
                                                    <div><strong>Got:</strong> <code>{tr.actual || '(empty)'}</code></div>
                                                    {tr.stderr && <div className="art-err"><strong>Error:</strong> <code>{tr.stderr}</code></div>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
