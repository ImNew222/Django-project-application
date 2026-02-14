import { useState, useEffect, useRef, useCallback } from 'react';
import { typingAPI } from '../api/client';
import {
    Keyboard, Rocket, Trophy, Medal, BarChart3,
    Clock, XCircle, Target, Zap, PartyPopper,
    RefreshCw, ArrowLeft
} from 'lucide-react';

export default function TypingContestPage() {
    const [view, setView] = useState('lobby'); // lobby | playing | results
    const [difficulty, setDifficulty] = useState('easy');
    const [text, setText] = useState(null);
    const [loading, setLoading] = useState(false);

    // Playing state
    const [typed, setTyped] = useState('');
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [errors, setErrors] = useState(0);
    const inputRef = useRef(null);
    const timerRef = useRef(null);

    // Results state
    const [result, setResult] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [history, setHistory] = useState([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Start a new game
    const startGame = async () => {
        setLoading(true);
        try {
            const res = await typingAPI.getRandom(difficulty);
            setText(res.data);
            setTyped('');
            setErrors(0);
            setStartTime(null);
            setElapsed(0);
            setResult(null);
            setView('playing');
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err) {
            console.error('Failed to get text:', err);
        } finally {
            setLoading(false);
        }
    };

    // Timer
    useEffect(() => {
        if (startTime && view === 'playing') {
            timerRef.current = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [startTime, view]);

    // Handle typing
    const handleInput = useCallback((e) => {
        const value = e.target.value;

        // Start timer on first keystroke
        if (!startTime) {
            setStartTime(Date.now());
        }

        // Count errors (characters that don't match)
        if (value.length > typed.length) {
            const newChar = value[value.length - 1];
            const expectedChar = text.content[value.length - 1];
            if (newChar !== expectedChar) {
                setErrors((prev) => prev + 1);
            }
        }

        setTyped(value);

        // Check if completed
        if (value === text.content) {
            clearInterval(timerRef.current);
            const timeTaken = (Date.now() - startTime) / 1000;
            submitResult(timeTaken);
        }
    }, [startTime, typed, text]);

    const submitResult = async (timeTaken) => {
        const words = text.content.split(' ').length;
        const minutes = timeTaken / 60;
        const wpm = Math.round((words / minutes) * 10) / 10;
        const totalChars = text.content.length;
        const accuracy = Math.round(((totalChars - errors) / totalChars) * 1000) / 10;

        try {
            const res = await typingAPI.submitResult({
                text_id: text.id,
                wpm: wpm,
                accuracy: Math.max(0, accuracy),
                time_taken: Math.round(timeTaken * 10) / 10,
                errors: errors,
            });
            setResult(res.data);
            setView('results');
        } catch (err) {
            console.error('Failed to submit result:', err);
        }
    };

    // Load leaderboard
    const loadLeaderboard = async () => {
        try {
            const [lb, hist] = await Promise.all([
                typingAPI.getLeaderboard(),
                typingAPI.getHistory(),
            ]);
            setLeaderboard(lb.data);
            setHistory(hist.data);
            setShowLeaderboard(true);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        }
    };

    // Get character status for display
    const getCharClass = (index) => {
        if (index >= typed.length) return 'char-pending';
        return typed[index] === text.content[index] ? 'char-correct' : 'char-wrong';
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // LOBBY VIEW
    if (view === 'lobby') {
        return (
            <div className="typing-page">
                <h1><Keyboard size={28} /> Typing Contest</h1>
                <p style={{ color: '#666', marginBottom: '2rem' }}>Test your typing speed and accuracy. Compete for the top spot!</p>

                <div className="section">
                    <h2>Select Difficulty</h2>
                    <div className="difficulty-grid">
                        {['easy', 'medium', 'hard'].map((d) => (
                            <button
                                key={d}
                                className={`difficulty-btn ${difficulty === d ? 'selected' : ''}`}
                                onClick={() => setDifficulty(d)}
                            >
                                <span className="diff-emoji">{d === 'easy' ? <span className="diff-dot beginner" /> : d === 'medium' ? <span className="diff-dot intermediate" /> : <span className="diff-dot hard" />}</span>
                                <span className="diff-text">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                                <span className="diff-multiplier">
                                    {d === 'easy' ? 'Short texts' : d === 'medium' ? 'IT topics' : 'Advanced CS'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn btn-primary btn-large" onClick={startGame} disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Loading...' : <><Rocket size={16} /> Start Typing Test</>}
                    </button>
                    <button className="btn btn-secondary btn-large" onClick={loadLeaderboard} style={{ flex: 1 }}>
                        <Trophy size={16} /> Leaderboard
                    </button>
                </div>

                {/* Leaderboard Modal */}
                {showLeaderboard && (
                    <div className="section" style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2><Trophy size={20} /> Typing Speed Leaderboard</h2>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowLeaderboard(false)}>Close</button>
                        </div>
                        {leaderboard.length > 0 ? (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Player</th>
                                        <th>WPM</th>
                                        <th>Accuracy</th>
                                        <th>Text</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.map((entry, i) => (
                                        <tr key={entry.id}>
                                            <td>{i < 3 ? <Medal size={18} color={['#FFD700', '#C0C0C0', '#CD7F32'][i]} /> : i + 1}</td>
                                            <td>{entry.username}</td>
                                            <td className="points-cell">{entry.wpm}</td>
                                            <td>{entry.accuracy}%</td>
                                            <td>{entry.text_title}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state"><p>No results yet. Be the first!</p></div>
                        )}

                        {history.length > 0 && (
                            <>
                                <h2 style={{ marginTop: '2rem' }}><BarChart3 size={20} /> Your History</h2>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Text</th>
                                            <th>WPM</th>
                                            <th>Accuracy</th>
                                            <th>Errors</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((entry) => (
                                            <tr key={entry.id}>
                                                <td>{entry.text_title}</td>
                                                <td className="points-cell">{entry.wpm}</td>
                                                <td>{entry.accuracy}%</td>
                                                <td>{entry.errors}</td>
                                                <td>{entry.time_taken}s</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // PLAYING VIEW
    if (view === 'playing') {
        const progress = text ? (typed.length / text.content.length) * 100 : 0;
        const currentWPM = startTime && elapsed > 0
            ? Math.round((typed.split(' ').length / (elapsed / 60)) * 10) / 10
            : 0;

        return (
            <div className="typing-page">
                {/* Stats bar */}
                <div className="typing-stats-bar">
                    <div className="typing-stat">
                        <span className="typing-stat-label"><Clock size={14} /> Time</span>
                        <span className="typing-stat-value">{formatTime(elapsed)}</span>
                    </div>
                    <div className="typing-stat">
                        <span className="typing-stat-label"><Keyboard size={14} /> WPM</span>
                        <span className="typing-stat-value">{currentWPM}</span>
                    </div>
                    <div className="typing-stat">
                        <span className="typing-stat-label"><XCircle size={14} /> Errors</span>
                        <span className="typing-stat-value">{errors}</span>
                    </div>
                    <div className="typing-stat">
                        <span className="typing-stat-label"><BarChart3 size={14} /> Progress</span>
                        <span className="typing-stat-value">{Math.round(progress)}%</span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="typing-progress">
                    <div className="typing-progress-bar" style={{ width: `${progress}%` }} />
                </div>

                {/* Text display */}
                <div className="typing-text-display">
                    {text.content.split('').map((char, i) => (
                        <span key={i} className={getCharClass(i)}>
                            {char}
                        </span>
                    ))}
                </div>

                {/* Input */}
                <textarea
                    ref={inputRef}
                    className="typing-input"
                    value={typed}
                    onChange={handleInput}
                    placeholder={!startTime ? 'Start typing here...' : ''}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                />

                <button className="btn btn-secondary" onClick={() => setView('lobby')} style={{ marginTop: '1rem' }}>
                    <ArrowLeft size={14} /> Back to Lobby
                </button>
            </div>
        );
    }

    // RESULTS VIEW
    if (view === 'results' && result) {
        return (
            <div className="typing-page">
                <div className={`result-header ${result.result.accuracy >= 90 ? 'pass' : 'fail'}`}>
                    <div className="result-emoji">{result.is_new_record ? <Trophy size={48} /> : result.result.accuracy >= 90 ? <Target size={48} /> : <Zap size={48} />}</div>
                    <div className="result-score">{result.result.wpm} WPM</div>
                    <div className="result-percentage">
                        {result.result.accuracy}% Accuracy
                        {result.is_new_record && <span style={{ display: 'block', color: '#f90', fontWeight: 700 }}><PartyPopper size={16} /> New Personal Record!</span>}
                    </div>
                </div>

                <div className="result-stats">
                    <div className="result-stat">
                        <span className="stat-label"><Keyboard size={14} /> Speed</span>
                        <span className="stat-value">{result.result.wpm} WPM</span>
                    </div>
                    <div className="result-stat">
                        <span className="stat-label"><Target size={14} /> Accuracy</span>
                        <span className="stat-value">{result.result.accuracy}%</span>
                    </div>
                    <div className="result-stat">
                        <span className="stat-label"><Clock size={14} /> Time</span>
                        <span className="stat-value">{result.result.time_taken}s</span>
                    </div>
                    <div className="result-stat">
                        <span className="stat-label"><XCircle size={14} /> Errors</span>
                        <span className="stat-value">{result.result.errors}</span>
                    </div>
                    <div className="result-stat">
                        <span className="stat-label"><Trophy size={14} /> Best WPM</span>
                        <span className="stat-value">{result.personal_best_wpm}</span>
                    </div>
                </div>

                <div className="result-actions">
                    <button className="btn btn-primary" onClick={startGame}><RefreshCw size={14} /> Try Again</button>
                    <button className="btn btn-secondary" onClick={() => { setView('lobby'); loadLeaderboard(); }}><Trophy size={14} /> Leaderboard</button>
                    <button className="btn btn-secondary" onClick={() => setView('lobby')}><ArrowLeft size={14} /> Back</button>
                </div>
            </div>
        );
    }

    return null;
}
