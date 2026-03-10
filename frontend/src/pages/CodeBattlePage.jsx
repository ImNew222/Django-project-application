import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
    Swords, Play, RotateCcw, Trophy, Clock, CheckCircle2, XCircle,
    ChevronLeft, Loader, Code2, Eye, Lightbulb, Award, Plus, Trash2,
    Filter, Terminal, Sun, Moon, Copy, Check, Users, Zap, User, Wifi, WifiOff
} from 'lucide-react';
import { compilerAPI } from '../api/client';

/* ── language map ────────────────────────────────────────── */
const LANG_MAP = {
    71: { name: 'Python', monaco: 'python', starterKey: 'starter_python' },
    63: { name: 'JavaScript', monaco: 'javascript', starterKey: 'starter_javascript' },
    54: { name: 'C++', monaco: 'cpp', starterKey: 'starter_cpp' },
    62: { name: 'Java', monaco: 'java', starterKey: 'starter_java' },
};

const DIFF_CONFIG = {
    easy: { label: 'Easy', color: '#22c55e', emoji: '🟢', pts: 10 },
    medium: { label: 'Medium', color: '#f59e0b', emoji: '🟡', pts: 25 },
    hard: { label: 'Hard', color: '#ef4444', emoji: '🔴', pts: 50 },
};

function getWsUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.VITE_WS_URL || 'localhost:8000';
    return `${proto}://${host}/ws/battle/`;
}

export default function CodeBattlePage() {
    /* ── state ──────────────────────────────────────────────── */
    const [mode, setMode] = useState('menu');  // 'menu' | 'solo_browser' | 'solo_arena' | 'pvp_lobby' | 'pvp_arena' | 'pvp_result'
    const [challenges, setChallenges] = useState([]);
    const [challenge, setChallenge] = useState(null);
    const [session, setSession] = useState(null);
    const [filterDiff, setFilterDiff] = useState('all');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [code, setCode] = useState('');
    const [langId, setLangId] = useState(71);
    const [darkTheme, setDarkTheme] = useState(true);
    const [showHint, setShowHint] = useState(false);
    const [copied, setCopied] = useState(false);
    const [timer, setTimer] = useState(0);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    // Community challenges
    const [communityTab, setCommunityTab] = useState(false);
    const [communityChallenges, setCommunityChallenges] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [ccForm, setCcForm] = useState({ title: '', description: '', difficulty: 'easy', hint: '', test_cases: [{ input: '', expected_output: '', is_sample: true }] });
    const [ccSubmitting, setCcSubmitting] = useState(false);

    // PvP Replay
    const [replayData, setReplayData] = useState(null);
    const [showReplay, setShowReplay] = useState(false);
    const [loadingReplay, setLoadingReplay] = useState(false);

    // PvP state
    const [pvpDifficulty, setPvpDifficulty] = useState('easy');
    const [pvpStatus, setPvpStatus] = useState('idle');  // idle | searching | matched | countdown | battle | ended
    const [pvpOpponent, setPvpOpponent] = useState('');
    const [pvpCountdown, setPvpCountdown] = useState(null);
    const [pvpChallenge, setPvpChallenge] = useState(null);
    const [pvpResults, setPvpResults] = useState(null);
    const [pvpBattleEnd, setPvpBattleEnd] = useState(null);
    const [opponentProgress, setOpponentProgress] = useState(null);
    const [playerNumber, setPlayerNumber] = useState(null);
    const [pvpMyResults, setPvpMyResults] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [myElo, setMyElo] = useState(null);
    const [opponentElo, setOpponentElo] = useState(null);

    const editorRef = useRef(null);
    const timerRef = useRef(null);
    const wsRef = useRef(null);

    /* ── load challenges ────────────────────────────────────── */
    useEffect(() => {
        loadChallenges();
        loadHistory();
        return () => {
            if (wsRef.current) wsRef.current.close();
            clearInterval(timerRef.current);
        };
    }, []);

    const loadChallenges = async () => {
        setLoading(true);
        try {
            const res = await compilerAPI.challenges();
            setChallenges(res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const loadHistory = async () => {
        try {
            const res = await compilerAPI.battleHistory();
            setHistory(res.data);
        } catch (e) { /* ignore */ }
    };

    const loadCommunity = async () => {
        try {
            const res = await compilerAPI.getCommunity();
            setCommunityChallenges(res.data);
        } catch { /* ignore */ }
    };

    const createCommunityChallenge = async () => {
        setCcSubmitting(true);
        try {
            await compilerAPI.createCommunity(ccForm);
            setCcForm({ title: '', description: '', difficulty: 'easy', hint: '', test_cases: [{ input: '', expected_output: '', is_sample: true }] });
            setShowCreateModal(false);
            loadCommunity();
        } catch { /* ignore */ } finally { setCcSubmitting(false); }
    };

    const loadReplay = async (battleId) => {
        setLoadingReplay(true);
        try {
            const res = await compilerAPI.pvpReplay(battleId);
            setReplayData(res.data);
            setShowReplay(true);
        } catch { /* ignore */ } finally { setLoadingReplay(false); }
    };

    /* ── timer ─────────────────────────────────────────────── */
    useEffect(() => {
        if ((mode === 'solo_arena' && session?.status === 'in_progress') || mode === 'pvp_arena') {
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [mode, session]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    /* ── Solo: select challenge ────────────────────────────── */
    const selectChallenge = async (slug) => {
        setLoading(true);
        try {
            const res = await compilerAPI.challengeDetail(slug);
            setChallenge(res.data);
            const sessionRes = await compilerAPI.battleStart(slug);
            setSession(sessionRes.data);
            const langInfo = LANG_MAP[langId];
            setCode(res.data[langInfo?.starterKey] || '# Write your solution here\n');
            setResults(null);
            setShowHint(false);
            setTimer(0);
            setMode('solo_arena');
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    /* ── language switch ───────────────────────────────────── */
    const changeLang = (newId) => {
        setLangId(newId);
        const ch = challenge || pvpChallenge;
        if (ch) {
            const langInfo = LANG_MAP[newId];
            setCode(ch[langInfo?.starterKey] || '');
        }
    };

    /* ── Solo: submit ──────────────────────────────────────── */
    const submitSolution = async () => {
        if (!session || !code.trim()) return;
        setSubmitting(true);
        setResults(null);
        try {
            const res = await compilerAPI.battleSubmit(session.id, {
                source_code: code, language_id: langId, language_name: LANG_MAP[langId]?.name || 'Unknown',
            });
            setResults(res.data);
            if (res.data.session_status === 'completed') {
                clearInterval(timerRef.current);
                setSession(prev => ({ ...prev, status: 'completed' }));
                loadHistory();
            }
        } catch (e) { console.error(e); }
        setSubmitting(false);
    };

    /* ── copy code ─────────────────────────────────────────── */
    const copyCode = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    /* ── back to menu ──────────────────────────────────────── */
    const backToMenu = () => {
        clearInterval(timerRef.current);
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setMode('menu');
        setChallenge(null);
        setSession(null);
        setResults(null);
        setPvpStatus('idle');
        setPvpChallenge(null);
        setPvpBattleEnd(null);
        setPvpMyResults(null);
        setOpponentProgress(null);
        setWsConnected(false);
        loadChallenges();
    };

    /* ════════════════════════════════════════════════════════ */
    /* PvP WebSocket Logic                                     */
    /* ════════════════════════════════════════════════════════ */
    const connectWebSocket = () => {
        const token = localStorage.getItem('access_token');
        if (!token) { alert('Please log in first'); return; }

        const ws = new WebSocket(`${getWsUrl()}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsConnected(true);
            setPvpStatus('searching');
            ws.send(JSON.stringify({ type: 'find_match', difficulty: pvpDifficulty }));
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            handleWsMessage(data);
        };

        ws.onclose = () => {
            setWsConnected(false);
            if (pvpStatus === 'searching') setPvpStatus('idle');
        };

        ws.onerror = () => {
            setWsConnected(false);
        };
    };

    const handleWsMessage = (data) => {
        switch (data.type) {
            case 'connected':
                if (data.elo) setMyElo(data.elo);
                break;
            case 'waiting':
                setPvpStatus('searching');
                break;
            case 'matched':
                setPvpStatus('matched');
                setPvpOpponent(data.opponent);
                setPlayerNumber(data.player_number);
                if (data.opponent_elo) setOpponentElo(data.opponent_elo);
                break;
            case 'countdown':
                setPvpStatus('countdown');
                setPvpCountdown(data.seconds);
                break;
            case 'battle_start':
                setPvpStatus('battle');
                setPvpChallenge(data.challenge);
                setChallenge(data.challenge);
                const langInfo = LANG_MAP[langId];
                setCode(data.challenge[langInfo?.starterKey] || '# Write your solution\n');
                setTimer(0);
                setMode('pvp_arena');
                break;
            case 'judging':
                setSubmitting(true);
                break;
            case 'your_results':
                setSubmitting(false);
                setPvpMyResults(data);
                break;
            case 'opponent_progress':
                setOpponentProgress(data);
                break;
            case 'battle_end':
                setPvpStatus('ended');
                setPvpBattleEnd(data);
                clearInterval(timerRef.current);
                setMode('pvp_result');
                break;
            case 'opponent_left':
                setPvpBattleEnd({ winner: null, reason: 'opponent_left', p1_score: null, p2_score: null, points_awarded: 0 });
                setPvpStatus('ended');
                clearInterval(timerRef.current);
                setMode('pvp_result');
                break;
            case 'error':
                console.error('WS error:', data.message);
                break;
        }
    };

    const pvpSubmitCode = () => {
        if (!wsRef.current || !code.trim()) return;
        setSubmitting(true);
        setPvpMyResults(null);
        wsRef.current.send(JSON.stringify({
            type: 'submit_code',
            source_code: code,
            language_id: langId,
            language_name: LANG_MAP[langId]?.name || 'Python',
        }));
    };

    const findMatch = () => {
        setMode('pvp_lobby');
        setPvpStatus('idle');
        setPvpBattleEnd(null);
        setPvpMyResults(null);
        setOpponentProgress(null);
        connectWebSocket();
    };

    const cancelSearch = () => {
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setPvpStatus('idle');
        setMode('menu');
        setWsConnected(false);
    };

    /* ── filtered challenges ───────────────────────────────── */
    const filtered = filterDiff === 'all' ? challenges : challenges.filter(c => c.difficulty === filterDiff);

    /* ════════════════════════════════════════════════════════ */
    /*  RENDER — Main Menu                                     */
    /* ════════════════════════════════════════════════════════ */
    if (mode === 'menu') {
        return (
            <div className="battle-page">
                <div className="battle-header">
                    <div className="battle-header-left">
                        <Swords size={28} />
                        <h1>Code Battle</h1>
                    </div>
                </div>

                <div className="battle-mode-selector">
                    <div className="battle-mode-card" onClick={() => setMode('solo_browser')}>
                        <div className="bmc-icon solo"><User size={32} /></div>
                        <h3>Solo Practice</h3>
                        <p>Solve coding challenges at your own pace. Earn points for each challenge you complete.</p>
                        <div className="bmc-footer">
                            <span><Code2 size={14} /> {challenges.length} Challenges</span>
                            <span><Award size={14} /> Earn Points</span>
                        </div>
                    </div>

                    <div className="battle-mode-card pvp" onClick={findMatch}>
                        <div className="bmc-icon pvp"><Swords size={32} /></div>
                        <h3>PvP Battle</h3>
                        <p>Fight a real opponent in real-time! Same challenge, race to solve it first. Winner takes 1.5× points.</p>
                        <div className="bmc-footer">
                            <span><Users size={14} /> 1v1 Match</span>
                            <span><Zap size={14} /> Real-time</span>
                        </div>
                    </div>
                </div>

                {/* Difficulty selector for PvP */}
                <div className="pvp-diff-selector">
                    <h3>PvP Difficulty</h3>
                    <div className="pvp-diff-btns">
                        {['easy', 'medium', 'hard'].map(d => {
                            const dc = DIFF_CONFIG[d];
                            return (
                                <button
                                    key={d}
                                    className={`pvp-diff-btn ${pvpDifficulty === d ? 'active' : ''}`}
                                    onClick={() => setPvpDifficulty(d)}
                                    style={pvpDifficulty === d ? { background: dc.color, color: '#fff', borderColor: dc.color } : {}}
                                >
                                    {dc.emoji} {dc.label} ({Math.round(dc.pts * 1.5)} pts)
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Quick history */}
                <div className="battle-quick-history">
                    <button className="battle-btn-ghost" onClick={() => { setMode('solo_browser'); setShowHistory(true); }}>
                        <Trophy size={18} /> View Battle History
                    </button>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════ */
    /*  RENDER — PvP Lobby (searching / matched / countdown)   */
    /* ════════════════════════════════════════════════════════ */
    if (mode === 'pvp_lobby') {
        const dc = DIFF_CONFIG[pvpDifficulty];
        return (
            <div className="battle-page">
                <div className="battle-header">
                    <div className="battle-header-left">
                        <Swords size={28} />
                        <h1>PvP Battle</h1>
                    </div>
                    <button className="battle-btn-ghost" onClick={cancelSearch}><ChevronLeft size={18} /> Cancel</button>
                </div>

                <div className="pvp-lobby">
                    <div className="pvp-lobby-card">
                        {pvpStatus === 'searching' && (
                            <>
                                <div className="pvp-searching">
                                    <Loader className="spin" size={48} />
                                    <div className="pvp-pulse"></div>
                                </div>
                                <h2>Finding Opponent...</h2>
                                <p>Searching for a <span className="pvp-diff-tag" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span> opponent</p>
                                {myElo && <div className="pvp-elo-badge">{myElo.icon} {myElo.tier} — {myElo.elo} ELO</div>}
                                <span className="pvp-ws-status">{wsConnected ? <><Wifi size={14} /> Connected</> : <><WifiOff size={14} /> Connecting...</>}</span>
                            </>
                        )}
                        {pvpStatus === 'matched' && (
                            <>
                                <div className="pvp-matched-anim">
                                    <div className="pvp-player you">
                                        <User size={28} /><span>You</span>
                                        {myElo && <span className="pvp-player-elo">{myElo.icon} {myElo.elo}</span>}
                                    </div>
                                    <Swords size={32} className="pvp-vs" />
                                    <div className="pvp-player opponent">
                                        <User size={28} /><span>{pvpOpponent}</span>
                                        {opponentElo && <span className="pvp-player-elo">{opponentElo.icon} {opponentElo.elo}</span>}
                                    </div>
                                </div>
                                <h2>Match Found!</h2>
                                <p>Get ready to battle...</p>
                            </>
                        )}
                        {pvpStatus === 'countdown' && (
                            <>
                                <div className="pvp-countdown-num">{pvpCountdown}</div>
                                <h2>{pvpCountdown === 1 ? 'GO!' : 'Get Ready...'}</h2>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════ */
    /*  RENDER — PvP Result                                    */
    /* ════════════════════════════════════════════════════════ */
    if (mode === 'pvp_result') {
        const endData = pvpBattleEnd;
        const myUsername = myElo ? undefined : undefined; // derive from scores
        const isWinner = endData?.winner && endData?.winner === (playerNumber === 1 ? endData?.p1_score?.username : endData?.p2_score?.username);
        const isDraw = !endData?.winner;
        const myScore = playerNumber === 1 ? endData?.p1_score : endData?.p2_score;
        const oppScore = playerNumber === 1 ? endData?.p2_score : endData?.p1_score;
        const myEloChange = endData?.elo_changes?.[myScore?.username];
        const oppEloChange = endData?.elo_changes?.[oppScore?.username];

        return (
            <div className="battle-page">
                <div className="pvp-result-screen">
                    <div className={`pvp-result-banner ${isWinner ? 'win' : isDraw ? 'draw' : 'lose'}`}>
                        <div className="pvp-result-icon">
                            {isWinner ? '🏆' : isDraw ? '🤝' : '💀'}
                        </div>
                        <h1>{isWinner ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat'}</h1>
                        {endData?.reason === 'opponent_left' && <p>Your opponent disconnected</p>}
                        {endData?.reason === 'timeout' && <p>Time ran out!</p>}
                        {endData?.reason === 'forfeit' && <p>Opponent forfeited</p>}
                    </div>

                    {endData?.points_awarded > 0 && (
                        <div className="pvp-points-earned">
                            <Award size={24} />
                            <span>+{endData.points_awarded} Rank Points!</span>
                        </div>
                    )}

                    {myEloChange && (
                        <div className={`pvp-elo-change ${myEloChange.change >= 0 ? 'positive' : 'negative'}`}>
                            <span>{myEloChange.icon} {myEloChange.tier}</span>
                            <span className="pvp-elo-delta">{myEloChange.change >= 0 ? '+' : ''}{myEloChange.change} ELO</span>
                            <span className="pvp-elo-new">→ {myEloChange.new_elo}</span>
                        </div>
                    )}

                    <div className="pvp-score-comparison">
                        <div className={`pvp-score-card ${isWinner ? 'winner' : ''}`}>
                            <h3><User size={16} /> You</h3>
                            {myScore && <div className="pvp-score-tests">{myScore.passed}/{myScore.total} tests passed</div>}
                            {myEloChange && <div className="pvp-score-elo">{myEloChange.icon} {myEloChange.new_elo}</div>}
                        </div>
                        <div className="pvp-score-vs">VS</div>
                        <div className={`pvp-score-card ${!isWinner && !isDraw ? 'winner' : ''}`}>
                            <h3><User size={16} /> {oppScore?.username || pvpOpponent}</h3>
                            {oppScore && <div className="pvp-score-tests">{oppScore.passed}/{oppScore.total} tests passed</div>}
                            {oppEloChange && <div className="pvp-score-elo">{oppEloChange.icon} {oppEloChange.new_elo}</div>}
                        </div>
                    </div>

                    <div className="pvp-result-actions">
                        <button className="arena-submit-btn" onClick={findMatch}>
                            <Swords size={18} /> Play Again
                        </button>
                        {pvpBattleEnd?.battle_id && (
                            <button className="battle-btn-ghost" onClick={() => loadReplay(pvpBattleEnd.battle_id)} disabled={loadingReplay}>
                                {loadingReplay ? <Loader size={14} className="spin" /> : <Eye size={18} />} View Opponent's Code
                            </button>
                        )}
                        <button className="battle-btn-ghost" onClick={backToMenu}>
                            <ChevronLeft size={18} /> Back to Menu
                        </button>
                    </div>

                    {showReplay && replayData && (
                        <div className="replay-container">
                            {[replayData.player1_code, replayData.player2_code].map((sub, i) => (
                                <div key={i} className="replay-panel">
                                    <h3>{i === 0 ? replayData.battle.player1 : replayData.battle.player2}</h3>
                                    <div className="replay-meta">
                                        {sub ? `${sub.language_name} · ${sub.passed_tests}/${sub.total_tests} tests` : 'No submission'}
                                    </div>
                                    <pre>{sub?.source_code || '// No code submitted'}</pre>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════ */
    /*  RENDER — Solo Challenge Browser                        */
    /* ════════════════════════════════════════════════════════ */
    if (mode === 'solo_browser') {
        return (
            <div className="battle-page">
                <div className="battle-header">
                    <div className="battle-header-left">
                        <Code2 size={28} />
                        <h1>Solo Practice</h1>
                    </div>
                    <div className="battle-header-right">
                        <button className={`battle-btn-ghost ${communityTab ? '' : 'active'}`} onClick={() => { setCommunityTab(false); setShowHistory(false); }}>
                            Challenges
                        </button>
                        <button className={`battle-btn-ghost ${communityTab ? 'active' : ''}`} onClick={() => { setCommunityTab(true); setShowHistory(false); loadCommunity(); }}>
                            🌐 Community
                        </button>
                        <button className="battle-btn-ghost" onClick={() => setShowHistory(!showHistory)}>
                            <Trophy size={18} /><span>{showHistory ? 'Challenges' : 'My Battles'}</span>
                        </button>
                        <button className="battle-btn-ghost" onClick={backToMenu}>
                            <ChevronLeft size={18} /> Menu
                        </button>
                    </div>
                </div>

                {showHistory ? (
                    <div className="battle-history">
                        <h2>Battle History</h2>
                        {history.length === 0 ? (
                            <div className="battle-empty"><Swords size={48} /><p>No battles yet.</p></div>
                        ) : (
                            <div className="battle-history-list">
                                {history.map(h => {
                                    const dc = DIFF_CONFIG[h.challenge_difficulty] || DIFF_CONFIG.easy;
                                    return (
                                        <div key={h.id} className={`battle-history-card ${h.status}`}>
                                            <div className="bhc-top">
                                                <span className="bhc-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                                                <span className={`bhc-status ${h.status}`}>
                                                    {h.status === 'completed' ? '✅ Solved' : '⏳ In Progress'}
                                                </span>
                                            </div>
                                            <h3>{h.challenge_title}</h3>
                                            <div className="bhc-meta">
                                                <span>Attempts: {h.attempts_count}</span>
                                                {h.points_earned > 0 && <span className="bhc-pts">+{h.points_earned} pts</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="battle-filters">
                            <Filter size={16} />
                            {['all', 'easy', 'medium', 'hard'].map(d => (
                                <button key={d} className={`battle-filter-btn ${filterDiff === d ? 'active' : ''}`}
                                    onClick={() => setFilterDiff(d)}
                                    style={filterDiff === d && d !== 'all' ? { background: DIFF_CONFIG[d]?.color, color: '#fff' } : {}}>
                                    {d === 'all' ? 'All' : DIFF_CONFIG[d].emoji + ' ' + DIFF_CONFIG[d].label}
                                </button>
                            ))}
                        </div>
                        {loading ? (
                            <div className="battle-loading"><Loader className="spin" size={32} /><span>Loading...</span></div>
                        ) : (
                            <div className="battle-grid">
                                {filtered.map(c => {
                                    const dc = DIFF_CONFIG[c.difficulty] || DIFF_CONFIG.easy;
                                    return (
                                        <div key={c.id} className={`battle-card ${c.is_solved ? 'solved' : ''}`} onClick={() => selectChallenge(c.slug)}>
                                            <div className="bc-top">
                                                <span className="bc-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                                                {c.is_solved && <CheckCircle2 size={20} className="bc-solved-icon" />}
                                            </div>
                                            <h3 className="bc-title">{c.title}</h3>
                                            <div className="bc-meta">
                                                <span className="bc-pts"><Award size={14} /> {c.points} pts</span>
                                                <span className="bc-tests"><Terminal size={14} /> {c.test_count} tests</span>
                                                <span className="bc-time"><Clock size={14} /> {c.time_limit_minutes}m</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Community Challenges */}
                {communityTab && !showHistory && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>🌐 Community Challenges</h2>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                                <Plus size={14} /> Create Challenge
                            </button>
                        </div>
                        {communityChallenges.length === 0 ? (
                            <div className="battle-empty"><Code2 size={48} /><p>No community challenges yet. Be the first!</p></div>
                        ) : (
                            <div className="battle-grid">
                                {communityChallenges.map(c => {
                                    const dc = DIFF_CONFIG[c.difficulty] || DIFF_CONFIG.easy;
                                    return (
                                        <div key={c.id} className="battle-card" onClick={() => selectChallenge(c.slug)}>
                                            <div className="bc-top">
                                                <span className="bc-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                                                <span className="community-badge">Community</span>
                                            </div>
                                            <h3 className="bc-title">{c.title}</h3>
                                            <div className="bc-meta">
                                                <span className="bc-pts"><Award size={14} /> {c.points} pts</span>
                                                <span className="bc-tests">{c.test_count} tests</span>
                                                <span style={{ fontSize: '0.75rem', color: '#888' }}>by {c.created_by}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Create Challenge Modal */}
                {showCreateModal && (
                    <div className="cc-modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="cc-modal" onClick={e => e.stopPropagation()}>
                            <h2><Plus size={20} /> Create Challenge</h2>
                            <div className="form-group">
                                <label>Title</label>
                                <input value={ccForm.title} onChange={e => setCcForm({ ...ccForm, title: e.target.value })} placeholder="Challenge title" />
                            </div>
                            <div className="form-group">
                                <label>Description (Markdown)</label>
                                <textarea rows={5} value={ccForm.description} onChange={e => setCcForm({ ...ccForm, description: e.target.value })} placeholder="Describe the problem..." />
                            </div>
                            <div className="form-group">
                                <label>Difficulty</label>
                                <select value={ccForm.difficulty} onChange={e => setCcForm({ ...ccForm, difficulty: e.target.value })}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hint (optional)</label>
                                <input value={ccForm.hint} onChange={e => setCcForm({ ...ccForm, hint: e.target.value })} placeholder="Optional hint" />
                            </div>
                            <div className="form-group">
                                <label>Test Cases</label>
                                {ccForm.test_cases.map((tc, i) => (
                                    <div key={i} className="cc-tc-row">
                                        <textarea placeholder="Input (stdin)" value={tc.input}
                                            onChange={e => {
                                                const tcs = [...ccForm.test_cases];
                                                tcs[i] = { ...tcs[i], input: e.target.value };
                                                setCcForm({ ...ccForm, test_cases: tcs });
                                            }} />
                                        <textarea placeholder="Expected output" value={tc.expected_output}
                                            onChange={e => {
                                                const tcs = [...ccForm.test_cases];
                                                tcs[i] = { ...tcs[i], expected_output: e.target.value };
                                                setCcForm({ ...ccForm, test_cases: tcs });
                                            }} />
                                        {ccForm.test_cases.length > 1 && (
                                            <button className="btn btn-sm btn-outline" onClick={() => {
                                                setCcForm({ ...ccForm, test_cases: ccForm.test_cases.filter((_, j) => j !== i) });
                                            }}><Trash2 size={14} /></button>
                                        )}
                                    </div>
                                ))}
                                <button className="btn btn-sm btn-outline" onClick={() => {
                                    setCcForm({ ...ccForm, test_cases: [...ccForm.test_cases, { input: '', expected_output: '', is_sample: false }] });
                                }}><Plus size={14} /> Add Test Case</button>
                            </div>
                            <div className="cc-modal-actions">
                                <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={createCommunityChallenge} disabled={ccSubmitting}>
                                    {ccSubmitting ? <Loader size={14} className="spin" /> : <Plus size={14} />} Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );

    }

    /* ════════════════════════════════════════════════════════ */
    /*  RENDER — Battle Arena (Solo + PvP)                     */
    /* ════════════════════════════════════════════════════════ */
    const isPvp = mode === 'pvp_arena';
    const ch = isPvp ? pvpChallenge : challenge;
    const dc = DIFF_CONFIG[ch?.difficulty] || DIFF_CONFIG.easy;
    const isCompleted = !isPvp && (session?.status === 'completed' || results?.session_status === 'completed');
    const activeResults = isPvp ? pvpMyResults : results;

    return (
        <div className="battle-page arena">
            {/* ── Top Bar ────────────────────────────────────────── */}
            <div className="arena-topbar">
                <button className="battle-btn-ghost" onClick={backToMenu}><ChevronLeft size={18} /> Back</button>
                <div className="arena-title">
                    <span className="arena-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                    <h2>{ch?.title}</h2>
                    {isPvp && <span className="arena-pvp-badge">⚔️ PvP</span>}
                </div>
                <div className="arena-meta">
                    <span className="arena-timer"><Clock size={16} /> {formatTime(timer)}</span>
                    <span className="arena-pts"><Award size={16} /> {isPvp ? Math.round(ch?.points * 1.5) : ch?.points} pts</span>
                    <button className="theme-toggle-btn" onClick={() => setDarkTheme(!darkTheme)}>
                        {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>

            {/* ── Opponent bar (PvP only) ────────────────────────── */}
            {isPvp && (
                <div className="pvp-opponent-bar">
                    <div className="pvp-ob-you"><User size={16} /> You</div>
                    <div className="pvp-ob-vs">VS</div>
                    <div className="pvp-ob-opponent">
                        <User size={16} /> {pvpOpponent}
                        {opponentProgress && (
                            <span className="pvp-ob-progress">
                                ({opponentProgress.passed}/{opponentProgress.total} passed)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── Main layout ────────────────────────────────────── */}
            <div className="arena-body">
                {/* Problem */}
                <div className="arena-problem">
                    <div className="arena-desc" dangerouslySetInnerHTML={{
                        __html: ch?.description?.replace(/\n/g, '<br>')
                            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                            .replace(/## (.*?)(<br>)/g, '<h3>$1</h3>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }} />

                    {ch?.sample_tests?.length > 0 && (
                        <div className="arena-samples">
                            <h3><Eye size={16} /> Sample Test Cases</h3>
                            {ch.sample_tests.map((t, i) => (
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

                    {ch?.hint && (
                        <div className="arena-hint">
                            <button className="battle-btn-ghost" onClick={() => setShowHint(!showHint)}>
                                <Lightbulb size={16} /> {showHint ? 'Hide Hint' : 'Show Hint'}
                            </button>
                            {showHint && <div className="hint-text">{ch.hint}</div>}
                        </div>
                    )}
                </div>

                {/* Editor + Results */}
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
                                setCode(ch?.[li?.starterKey] || '');
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
                            className={`arena-submit-btn ${isCompleted ? 'completed' : ''}`}
                            onClick={isPvp ? pvpSubmitCode : submitSolution}
                            disabled={submitting || isCompleted || (isPvp && pvpStatus === 'ended')}
                        >
                            {submitting ? <><Loader className="spin" size={18} /> Running Tests...</>
                                : isCompleted ? <><CheckCircle2 size={18} /> Completed!</>
                                    : <><Play size={18} /> Submit Solution</>}
                        </button>
                    </div>

                    {/* Results */}
                    {activeResults && (
                        <div className={`arena-results ${(isPvp ? activeResults.all_passed : activeResults.submission?.all_passed) ? 'all-passed' : 'some-failed'
                            }`}>
                            <div className="ar-header">
                                <h3>
                                    {(isPvp ? activeResults.all_passed : activeResults.submission?.all_passed) ? (
                                        <><CheckCircle2 size={20} /> All Tests Passed!</>
                                    ) : (
                                        <><XCircle size={20} /> {isPvp ? activeResults.passed : activeResults.submission?.passed_tests}/{isPvp ? activeResults.total : activeResults.submission?.total_tests} Tests Passed</>
                                    )}
                                </h3>
                                {!isPvp && activeResults.points_earned > 0 && (
                                    <span className="ar-points">+{activeResults.points_earned} pts 🎉</span>
                                )}
                            </div>
                            <div className="ar-tests">
                                {(isPvp ? activeResults.test_results : activeResults.submission?.test_results)?.map((tr, i) => (
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
