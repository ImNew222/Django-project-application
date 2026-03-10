import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
    Crown, Play, RotateCcw, Trophy, Clock, CheckCircle2, XCircle,
    ChevronLeft, Loader, Code2, Eye, Award, Users, Zap, User, Wifi, WifiOff,
    Swords, Timer, Trash2, ArrowRight, AlertCircle
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

function getChessWsUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.VITE_WS_URL || 'localhost:8000';
    return `${proto}://${host}/ws/chess-battle/`;
}

export default function ChessBattlePage() {
    /* ── state ──────────────────────────────────────────────── */
    const [mode, setMode] = useState('menu');  // menu | lobby | arena | result
    const [difficulty, setDifficulty] = useState('easy');
    const [langId, setLangId] = useState(71);

    // WebSocket
    const [wsConnected, setWsConnected] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | searching | matched | countdown | battle | ended

    // Match info
    const [opponent, setOpponent] = useState('');
    const [playerNumber, setPlayerNumber] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [myElo, setMyElo] = useState(null);
    const [opponentElo, setOpponentElo] = useState(null);

    // Battle state
    const [challenge, setChallenge] = useState(null);
    const [sharedCode, setSharedCode] = useState('');
    const [currentTurn, setCurrentTurn] = useState(1);
    const [p1Time, setP1Time] = useState(300);
    const [p2Time, setP2Time] = useState(300);
    const [lineInput, setLineInput] = useState('');
    const [moveHistory, setMoveHistory] = useState([]);
    const [testResults, setTestResults] = useState(null);
    const [submittingLine, setSubmittingLine] = useState(false);

    // End state
    const [battleEnd, setBattleEnd] = useState(null);

    // History
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    const wsRef = useRef(null);
    const lineInputRef = useRef(null);
    const moveListRef = useRef(null);

    const isMyTurn = playerNumber === currentTurn;

    /* ── load history ─────────────────────────────────────── */
    useEffect(() => {
        loadHistory();
        return () => { if (wsRef.current) wsRef.current.close(); };
    }, []);

    const loadHistory = async () => {
        try {
            const res = await compilerAPI.chessBattleHistory();
            setHistory(res.data);
        } catch { /* ignore */ }
    };

    /* ── auto-scroll move history ────────────────────────── */
    useEffect(() => {
        if (moveListRef.current) {
            moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
        }
    }, [moveHistory]);

    /* ── auto-focus input on my turn ─────────────────────── */
    useEffect(() => {
        if (isMyTurn && lineInputRef.current && mode === 'arena') {
            lineInputRef.current.focus();
        }
    }, [isMyTurn, mode]);

    /* ── format time ─────────────────────────────────────── */
    const formatTime = (s) => {
        const mins = Math.floor(Math.max(0, s) / 60);
        const secs = Math.floor(Math.max(0, s) % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    /* ── WebSocket ────────────────────────────────────────── */
    const connectWebSocket = () => {
        const token = localStorage.getItem('access_token');
        if (!token) { alert('Please log in first'); return; }

        const ws = new WebSocket(`${getChessWsUrl()}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsConnected(true);
            setStatus('searching');
            ws.send(JSON.stringify({
                type: 'find_match',
                difficulty,
                language_id: langId,
            }));
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            handleWsMessage(data);
        };

        ws.onclose = () => {
            setWsConnected(false);
            if (status === 'searching') setStatus('idle');
        };

        ws.onerror = () => setWsConnected(false);
    };

    const handleWsMessage = (data) => {
        switch (data.type) {
            case 'connected':
                if (data.elo) setMyElo(data.elo);
                break;
            case 'waiting':
                setStatus('searching');
                break;
            case 'matched':
                setStatus('matched');
                setOpponent(data.opponent);
                setPlayerNumber(data.player_number);
                if (data.opponent_elo) setOpponentElo(data.opponent_elo);
                break;
            case 'countdown':
                setStatus('countdown');
                setCountdown(data.seconds);
                break;
            case 'battle_start':
                setStatus('battle');
                setChallenge(data.challenge);
                setSharedCode('');
                setCurrentTurn(data.current_turn || 1);
                setP1Time(data.challenge?.initial_time || 300);
                setP2Time(data.challenge?.initial_time || 300);
                setMoveHistory([]);
                setTestResults(null);
                setLineInput('');
                setMode('arena');
                break;
            case 'code_updated':
                setSharedCode(data.shared_code);
                setCurrentTurn(data.current_turn);
                setP1Time(data.p1_time);
                setP2Time(data.p2_time);
                setMoveHistory(prev => [...prev, {
                    moveNumber: data.move_number,
                    player: data.player,
                    username: data.username,
                    line: data.line,
                }]);
                setSubmittingLine(false);
                setLineInput('');
                break;
            case 'test_results':
                setTestResults(data);
                break;
            case 'clock_tick':
                setP1Time(data.p1_time);
                setP2Time(data.p2_time);
                setCurrentTurn(data.current_turn);
                break;
            case 'battle_end':
                setStatus('ended');
                setBattleEnd(data);
                setMode('result');
                break;
            case 'opponent_left':
                setBattleEnd({
                    winner: null,
                    reason: 'opponent_left',
                    p1_score: null,
                    p2_score: null,
                    points_awarded: 0,
                });
                setStatus('ended');
                setMode('result');
                break;
            case 'error':
                console.error('WS error:', data.message);
                setSubmittingLine(false);
                break;
        }
    };

    const submitLine = () => {
        if (!wsRef.current || !lineInput.trim() || !isMyTurn || submittingLine) return;
        setSubmittingLine(true);
        wsRef.current.send(JSON.stringify({
            type: 'submit_line',
            line: lineInput,
            language_id: langId,
        }));
    };

    const deleteLine = (lineNumber) => {
        if (!wsRef.current || !isMyTurn) return;
        wsRef.current.send(JSON.stringify({
            type: 'delete_line',
            line_number: lineNumber,
        }));
    };

    const forfeit = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'forfeit' }));
        }
    };

    const findMatch = () => {
        setMode('lobby');
        setStatus('idle');
        setBattleEnd(null);
        setMoveHistory([]);
        setTestResults(null);
        setSharedCode('');
        connectWebSocket();
    };

    const cancelSearch = () => {
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setStatus('idle');
        setMode('menu');
        setWsConnected(false);
    };

    const backToMenu = () => {
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        setMode('menu');
        setStatus('idle');
        setBattleEnd(null);
        setChallenge(null);
        setSharedCode('');
        setMoveHistory([]);
        setTestResults(null);
        setWsConnected(false);
        loadHistory();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitLine();
        }
    };

    /* ════════════════════════════════════════════════════════════ */
    /*  RENDER — Menu                                              */
    /* ════════════════════════════════════════════════════════════ */
    if (mode === 'menu') {
        const dc = DIFF_CONFIG[difficulty];
        return (
            <div className="chess-page">
                <div className="chess-header">
                    <div className="chess-header-left">
                        <Crown size={28} />
                        <h1>Code Chess</h1>
                        <span className="chess-subtitle">Turn-based 1v1 coding duel</span>
                    </div>
                </div>

                <div className="chess-intro">
                    <div className="chess-intro-card">
                        <h2>♟️ How It Works</h2>
                        <div className="chess-rules">
                            <div className="chess-rule"><span className="chess-rule-num">1</span><p>You and your opponent share the <strong>same code editor</strong></p></div>
                            <div className="chess-rule"><span className="chess-rule-num">2</span><p>Take turns writing <strong>one line of code</strong> at a time</p></div>
                            <div className="chess-rule"><span className="chess-rule-num">3</span><p>Your <strong>chess clock</strong> ticks only on your turn (5 min each)</p></div>
                            <div className="chess-rule"><span className="chess-rule-num">4</span><p>Code is <strong>auto-tested</strong> after every move</p></div>
                            <div className="chess-rule"><span className="chess-rule-num">5</span><p>Write the line that <strong>passes all tests</strong> to win! 🏆</p></div>
                        </div>
                    </div>
                </div>

                <div className="chess-config">
                    <div className="chess-config-section">
                        <h3>Difficulty</h3>
                        <div className="chess-diff-btns">
                            {['easy', 'medium', 'hard'].map(d => {
                                const dconf = DIFF_CONFIG[d];
                                return (
                                    <button
                                        key={d}
                                        className={`chess-diff-btn ${difficulty === d ? 'active' : ''}`}
                                        onClick={() => setDifficulty(d)}
                                        style={difficulty === d ? { background: dconf.color, color: '#fff', borderColor: dconf.color } : {}}
                                    >
                                        {dconf.emoji} {dconf.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="chess-config-section">
                        <h3>Language</h3>
                        <div className="chess-diff-btns">
                            {Object.entries(LANG_MAP).map(([id, lang]) => (
                                <button
                                    key={id}
                                    className={`chess-diff-btn ${langId === Number(id) ? 'active' : ''}`}
                                    onClick={() => setLangId(Number(id))}
                                    style={langId === Number(id) ? { background: '#6366f1', color: '#fff', borderColor: '#6366f1' } : {}}
                                >
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="chess-actions">
                    <button className="chess-find-btn" onClick={findMatch}>
                        <Swords size={20} /> Find Chess Match
                        <span className="chess-find-pts">{dc.emoji} {Math.round(dc.pts * 1.5)} pts</span>
                    </button>
                </div>

                {/* History */}
                <div className="chess-history-section">
                    <button className="chess-history-toggle" onClick={() => setShowHistory(!showHistory)}>
                        <Trophy size={18} /> {showHistory ? 'Hide' : 'Show'} Match History ({history.length})
                    </button>
                    {showHistory && history.length > 0 && (
                        <div className="chess-history-list">
                            {history.map(h => (
                                <div key={h.id} className="chess-history-card">
                                    <div className="chc-top">
                                        <span className="chc-diff" style={{ background: DIFF_CONFIG[h.difficulty]?.color || '#666' }}>
                                            {DIFF_CONFIG[h.difficulty]?.emoji} {h.difficulty}
                                        </span>
                                        <span className={`chc-result ${h.winner === h.player1 || h.winner === h.player2 ? '' : 'draw'}`}>
                                            {h.winner || 'Draw'}
                                        </span>
                                    </div>
                                    <h4>{h.challenge_title}</h4>
                                    <div className="chc-meta">
                                        <span>{h.player1} vs {h.player2}</span>
                                        <span>{h.move_count} moves</span>
                                        {h.points_awarded > 0 && <span className="chc-pts">+{h.points_awarded} pts</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════════ */
    /*  RENDER — Lobby                                             */
    /* ════════════════════════════════════════════════════════════ */
    if (mode === 'lobby') {
        const dc = DIFF_CONFIG[difficulty];
        return (
            <div className="chess-page">
                <div className="chess-header">
                    <div className="chess-header-left">
                        <Crown size={28} />
                        <h1>Code Chess</h1>
                    </div>
                    <button className="chess-btn-ghost" onClick={cancelSearch}><ChevronLeft size={18} /> Cancel</button>
                </div>

                <div className="chess-lobby">
                    <div className="chess-lobby-card">
                        {status === 'searching' && (
                            <>
                                <div className="chess-searching">
                                    <Loader className="spin" size={48} />
                                    <div className="chess-pulse"></div>
                                </div>
                                <h2>Finding Opponent...</h2>
                                <p>Looking for a <span style={{ background: dc.color, padding: '2px 10px', borderRadius: 12, color: '#fff', fontWeight: 600 }}>{dc.emoji} {dc.label}</span> chess opponent</p>
                                {myElo && <div className="chess-elo-badge">{myElo.icon} {myElo.tier} — {myElo.elo} ELO</div>}
                                <span className="chess-ws-status">{wsConnected ? <><Wifi size={14} /> Connected</> : <><WifiOff size={14} /> Connecting...</>}</span>
                            </>
                        )}
                        {status === 'matched' && (
                            <>
                                <div className="chess-matched-anim">
                                    <div className="chess-player you"><User size={28} /><span>You</span>
                                        {myElo && <span className="chess-player-elo">{myElo.icon} {myElo.elo}</span>}
                                    </div>
                                    <Swords size={32} className="chess-vs-icon" />
                                    <div className="chess-player opp"><User size={28} /><span>{opponent}</span>
                                        {opponentElo && <span className="chess-player-elo">{opponentElo.icon} {opponentElo.elo}</span>}
                                    </div>
                                </div>
                                <h2>Match Found!</h2>
                                <p>Get ready for chess battle...</p>
                            </>
                        )}
                        {status === 'countdown' && (
                            <>
                                <div className="chess-countdown-num">{countdown}</div>
                                <h2>{countdown === 1 ? 'GO!' : 'Get Ready...'}</h2>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════════ */
    /*  RENDER — Result                                            */
    /* ════════════════════════════════════════════════════════════ */
    if (mode === 'result') {
        const endData = battleEnd;
        const myScore = playerNumber === 1 ? endData?.p1_score : endData?.p2_score;
        const oppScore = playerNumber === 1 ? endData?.p2_score : endData?.p1_score;
        const isWinner = endData?.winner && endData?.winner === myScore?.username;
        const isDraw = !endData?.winner;
        const myEloChange = endData?.elo_changes?.[myScore?.username];

        return (
            <div className="chess-page">
                <div className="chess-result-screen">
                    <div className={`chess-result-banner ${isWinner ? 'win' : isDraw ? 'draw' : 'lose'}`}>
                        <div className="chess-result-icon">{isWinner ? '♛' : isDraw ? '🤝' : '♟'}</div>
                        <h1>{isWinner ? 'Checkmate! You Win!' : isDraw ? 'Stalemate!' : 'Defeat'}</h1>
                        {endData?.reason === 'opponent_left' && <p>Your opponent disconnected</p>}
                        {endData?.reason === 'timeout' && <p>Time ran out!</p>}
                        {endData?.reason === 'forfeit' && <p>Opponent forfeited</p>}
                        {endData?.reason === 'solved' && <p>All tests passed!</p>}
                    </div>

                    {endData?.points_awarded > 0 && (
                        <div className="chess-points-earned">
                            <Award size={24} />
                            <span>+{endData.points_awarded} Rank Points!</span>
                        </div>
                    )}

                    {myEloChange && (
                        <div className={`chess-elo-change ${myEloChange.change >= 0 ? 'positive' : 'negative'}`}>
                            <span>{myEloChange.icon} {myEloChange.tier}</span>
                            <span className="chess-elo-delta">{myEloChange.change >= 0 ? '+' : ''}{myEloChange.change} ELO</span>
                            <span>→ {myEloChange.new_elo}</span>
                        </div>
                    )}

                    <div className="chess-result-stats">
                        <div className="chess-result-stat">
                            <h4>Total Moves</h4>
                            <span>{endData?.total_moves || 0}</span>
                        </div>
                        <div className="chess-result-stat">
                            <h4>Your Lines</h4>
                            <span>{myScore?.lines_written || 0}</span>
                        </div>
                        <div className="chess-result-stat">
                            <h4>Time Left</h4>
                            <span>{formatTime(myScore?.time_remaining || 0)}</span>
                        </div>
                    </div>

                    {endData?.shared_code && (
                        <div className="chess-result-code">
                            <h3>Final Code</h3>
                            <pre>{endData.shared_code}</pre>
                        </div>
                    )}

                    <div className="chess-result-actions">
                        <button className="chess-find-btn" onClick={findMatch}>
                            <Swords size={18} /> Play Again
                        </button>
                        <button className="chess-btn-ghost" onClick={backToMenu}>
                            <ChevronLeft size={18} /> Back to Menu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════════ */
    /*  RENDER — Arena (the main chess battle UI)                   */
    /* ════════════════════════════════════════════════════════════ */
    const dc = DIFF_CONFIG[challenge?.difficulty] || DIFF_CONFIG.easy;
    const codeLines = sharedCode ? sharedCode.split('\n') : [];

    return (
        <div className="chess-page arena-mode">
            {/* Top Bar */}
            <div className="chess-arena-top">
                <button className="chess-btn-ghost" onClick={() => { if (confirm('Forfeit this match?')) forfeit(); }}>
                    <ChevronLeft size={18} /> Forfeit
                </button>
                <div className="chess-arena-title">
                    <span className="chess-arena-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                    <h2>{challenge?.title}</h2>
                    <span className="chess-arena-badge">♟️ Chess Mode</span>
                </div>
                <div className="chess-arena-pts">
                    <Award size={16} /> {Math.round((challenge?.points || 10) * 1.5)} pts
                </div>
            </div>

            {/* Chess Clocks */}
            <div className="chess-clocks">
                <div className={`chess-clock ${currentTurn === 1 ? 'active' : ''} ${playerNumber === 1 ? 'mine' : 'opp'} ${p1Time <= 30 ? 'urgent' : ''}`}>
                    <User size={16} />
                    <span className="chess-clock-name">{playerNumber === 1 ? 'You' : opponent} {currentTurn === 1 ? '◀' : ''}</span>
                    <span className="chess-clock-time">{formatTime(p1Time)}</span>
                </div>
                <div className="chess-clock-divider">
                    <Swords size={20} />
                    <span>Move #{moveHistory.length + 1}</span>
                </div>
                <div className={`chess-clock ${currentTurn === 2 ? 'active' : ''} ${playerNumber === 2 ? 'mine' : 'opp'} ${p2Time <= 30 ? 'urgent' : ''}`}>
                    <User size={16} />
                    <span className="chess-clock-name">{playerNumber === 2 ? 'You' : opponent} {currentTurn === 2 ? '◀' : ''}</span>
                    <span className="chess-clock-time">{formatTime(p2Time)}</span>
                </div>
            </div>

            {/* Main Body */}
            <div className="chess-arena-body">
                {/* Left: Problem */}
                <div className="chess-problem">
                    <h3>📋 Challenge</h3>
                    <div className="chess-problem-desc" dangerouslySetInnerHTML={{
                        __html: challenge?.description?.replace(/\n/g, '<br>')
                            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                            .replace(/## (.*?)(<br>)/g, '<h4>$1</h4>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }} />

                    {challenge?.sample_tests?.length > 0 && (
                        <div className="chess-samples">
                            <h4>Sample Tests</h4>
                            {challenge.sample_tests.map((t, i) => (
                                <div key={i} className="chess-sample-test">
                                    <div><span className="chess-st-label">Input:</span><pre>{t.input_data}</pre></div>
                                    <div><span className="chess-st-label">Expected:</span><pre>{t.expected_output}</pre></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Test Results */}
                    {testResults && (
                        <div className={`chess-test-results ${testResults.all_passed ? 'all-pass' : ''}`}>
                            <h4>{testResults.all_passed ? '✅ All Tests Passed!' : `Tests: ${testResults.passed}/${testResults.total}`}</h4>
                            <div className="chess-test-dots">
                                {testResults.test_results.map((r, i) => (
                                    <span key={i} className={`chess-test-dot ${r.passed ? 'pass' : 'fail'}`}>
                                        {r.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Center: Shared Code + Input */}
                <div className="chess-editor-panel">
                    <div className="chess-editor-header">
                        <Code2 size={16} />
                        <span>Shared Code</span>
                        <span className="chess-editor-lang">{LANG_MAP[langId]?.name}</span>
                        <span className="chess-line-count">{codeLines.length} lines</span>
                    </div>

                    {/* Read-only shared code view */}
                    <div className="chess-code-view">
                        {codeLines.length === 0 ? (
                            <div className="chess-code-empty">
                                <Code2 size={32} />
                                <p>No code yet. {isMyTurn ? "It's your turn — write the first line!" : "Waiting for opponent's first move..."}</p>
                            </div>
                        ) : (
                            <div className="chess-code-lines">
                                {codeLines.map((line, i) => {
                                    const move = moveHistory.find(m => m.moveNumber === i + 1);
                                    const isP1Line = move?.player === 1;
                                    return (
                                        <div key={i} className={`chess-code-line ${isP1Line ? 'p1' : 'p2'}`}>
                                            <span className="chess-ln">{i + 1}</span>
                                            <span className="chess-code-text">{line || ' '}</span>
                                            <span className="chess-code-by" title={move?.username}>
                                                {move?.player === playerNumber ? '👤' : '👾'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Line input */}
                    <div className={`chess-line-input ${isMyTurn ? 'active' : 'disabled'}`}>
                        {isMyTurn ? (
                            <>
                                <div className="chess-turn-indicator">
                                    <span className="chess-your-turn">♟ YOUR TURN</span>
                                    <span className="chess-turn-timer">{formatTime(playerNumber === 1 ? p1Time : p2Time)}</span>
                                </div>
                                <div className="chess-input-row">
                                    <span className="chess-ln-next">{codeLines.length + 1}</span>
                                    <input
                                        ref={lineInputRef}
                                        type="text"
                                        className="chess-line-text-input"
                                        placeholder="Type your line of code..."
                                        value={lineInput}
                                        onChange={e => setLineInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={submittingLine}
                                        autoFocus
                                    />
                                    <button
                                        className="chess-submit-line-btn"
                                        onClick={submitLine}
                                        disabled={!lineInput.trim() || submittingLine}
                                    >
                                        {submittingLine ? <Loader size={16} className="spin" /> : <ArrowRight size={16} />}
                                        Submit
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="chess-waiting-turn">
                                <Loader className="spin" size={18} />
                                <span>Waiting for {opponent}'s move...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Move History */}
                <div className="chess-moves-panel">
                    <h3>📜 Move History</h3>
                    <div className="chess-moves-list" ref={moveListRef}>
                        {moveHistory.length === 0 ? (
                            <div className="chess-moves-empty">No moves yet</div>
                        ) : (
                            moveHistory.map((m, i) => (
                                <div key={i} className={`chess-move-item ${m.player === playerNumber ? 'mine' : 'opp'}`}>
                                    <span className="chess-move-num">#{m.moveNumber}</span>
                                    <span className="chess-move-by">{m.player === playerNumber ? '👤' : '👾'}</span>
                                    <code className="chess-move-code">{m.line}</code>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
