import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
    Calendar, Play, RotateCcw, Trophy, Clock, CheckCircle2, XCircle,
    ChevronLeft, Loader, Code2, Eye, Lightbulb, Award,
    Terminal, Sun, Moon, Copy, Check, Flame, Zap, Star, TrendingUp
} from 'lucide-react';
import { compilerAPI } from '../api/client';

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

export default function DailyChallengePage() {
    const [loading, setLoading] = useState(true);
    const [daily, setDaily] = useState(null);
    const [challenge, setChallenge] = useState(null);
    const [streak, setStreak] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [mode, setMode] = useState('overview'); // 'overview' | 'solve' | 'completed'
    const [code, setCode] = useState('');
    const [langId, setLangId] = useState(71);
    const [darkTheme, setDarkTheme] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [timer, setTimer] = useState(0);
    const [copied, setCopied] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [showTab, setShowTab] = useState('challenge'); // 'challenge' | 'leaderboard'

    const editorRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        loadDaily();
        return () => clearInterval(timerRef.current);
    }, []);

    const loadDaily = async () => {
        setLoading(true);
        try {
            const [dailyRes, lbRes] = await Promise.all([
                compilerAPI.dailyChallenge(),
                compilerAPI.dailyLeaderboard(),
            ]);
            setDaily(dailyRes.data);
            setChallenge(dailyRes.data.challenge);
            setStreak(dailyRes.data.streak);
            setSubmission(dailyRes.data.submission);
            setLeaderboard(lbRes.data);

            if (dailyRes.data.submission?.solved) {
                setMode('completed');
            }

            const langInfo = LANG_MAP[71];
            setCode(dailyRes.data.challenge[langInfo?.starterKey] || '# Write your solution\n');
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        if (mode === 'solve') {
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [mode]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const changeLang = (newId) => {
        setLangId(newId);
        if (challenge) {
            const langInfo = LANG_MAP[newId];
            setCode(challenge[langInfo?.starterKey] || '');
        }
    };

    const startSolving = () => {
        setMode('solve');
        setTimer(0);
    };

    const submitSolution = async () => {
        if (!code.trim()) return;
        setSubmitting(true);
        setResults(null);
        try {
            const res = await compilerAPI.dailySubmit({
                source_code: code,
                language_id: langId,
            });
            setResults(res.data);
            if (res.data.all_passed) {
                clearInterval(timerRef.current);
                setMode('completed');
                setSubmission({ solved: true, attempts: res.data.attempts, solve_time: res.data.execution_time });
                setStreak(prev => ({
                    ...prev,
                    current: res.data.streak || (prev?.current || 0) + 1,
                }));
                loadDaily(); // Refresh leaderboard
            }
        } catch (e) {
            if (e.response?.data?.error) {
                alert(e.response.data.error);
            }
        }
        setSubmitting(false);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (loading) {
        return (
            <div className="daily-page">
                <div className="daily-loading">
                    <Loader className="spin" size={40} />
                    <span>Loading today's challenge...</span>
                </div>
            </div>
        );
    }

    if (!daily || !challenge) {
        return (
            <div className="daily-page">
                <div className="daily-empty">
                    <Calendar size={48} />
                    <h2>No Daily Challenge Available</h2>
                    <p>Check back tomorrow for a new challenge!</p>
                </div>
            </div>
        );
    }

    const dc = DIFF_CONFIG[daily.difficulty] || DIFF_CONFIG.easy;
    const multiplier = streak?.multiplier || 1;
    const basePoints = challenge.points;
    const totalPoints = Math.round(basePoints * multiplier);

    /* ════════════════════════════════════════════════════════ */
    /*  Overview / Completed                                    */
    /* ════════════════════════════════════════════════════════ */
    if (mode === 'overview' || mode === 'completed') {
        return (
            <div className="daily-page">
                <div className="daily-header">
                    <div className="daily-header-left">
                        <Calendar size={28} />
                        <h1>Daily Challenge</h1>
                        <span className="daily-date">{daily.date}</span>
                    </div>
                </div>

                {/* Streak Banner */}
                <div className="daily-streak-banner">
                    <div className="daily-streak-fire">
                        <Flame size={32} />
                        <div>
                            <span className="daily-streak-num">{streak?.current || 0}</span>
                            <span className="daily-streak-label">Day Streak</span>
                        </div>
                    </div>
                    <div className="daily-streak-info">
                        <div className="daily-streak-stat">
                            <Star size={14} />
                            <span>Best: {streak?.best || 0} days</span>
                        </div>
                        {multiplier > 1 && (
                            <div className="daily-streak-bonus">
                                <Zap size={14} />
                                <span>{multiplier}× Point Bonus!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Challenge Info Card */}
                <div className="daily-challenge-card">
                    <div className="dcc-top">
                        <span className="dcc-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                        <span className="dcc-pts"><Award size={16} /> {totalPoints} pts {multiplier > 1 && <span className="dcc-mult">({multiplier}×)</span>}</span>
                    </div>
                    <h2>{challenge.title}</h2>
                    <div className="dcc-meta">
                        <span><Clock size={14} /> {challenge.time_limit_minutes}m</span>
                        <span><Terminal size={14} /> {challenge.test_count} tests</span>
                    </div>

                    {mode === 'completed' ? (
                        <div className="daily-completed-badge">
                            <CheckCircle2 size={24} />
                            <span>Completed!</span>
                            {submission?.solve_time && <span className="dcb-time">{submission.solve_time.toFixed(3)}s</span>}
                            {submission?.attempts && <span className="dcb-attempts">{submission.attempts} attempt{submission.attempts > 1 ? 's' : ''}</span>}
                        </div>
                    ) : (
                        <button className="daily-start-btn" onClick={startSolving}>
                            <Play size={18} /> Start Solving
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="daily-tabs">
                    <button className={`daily-tab ${showTab === 'challenge' ? 'active' : ''}`} onClick={() => setShowTab('challenge')}>
                        <Code2 size={16} /> Description
                    </button>
                    <button className={`daily-tab ${showTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setShowTab('leaderboard')}>
                        <Trophy size={16} /> Today's Leaderboard
                    </button>
                </div>

                {showTab === 'challenge' ? (
                    <div className="daily-description">
                        <div className="arena-desc" dangerouslySetInnerHTML={{
                            __html: challenge.description?.replace(/\n/g, '<br>')
                                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                                .replace(/## (.*?)(<br>)/g, '<h3>$1</h3>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }} />
                    </div>
                ) : (
                    <div className="daily-leaderboard">
                        {leaderboard.length === 0 ? (
                            <div className="daily-lb-empty"><Trophy size={32} /><p>No solvers yet — be the first!</p></div>
                        ) : (
                            <div className="daily-lb-list">
                                {leaderboard.map((s, i) => (
                                    <div key={i} className={`daily-lb-row ${i < 3 ? `top-${i + 1}` : ''}`}>
                                        <span className="daily-lb-rank">
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                        <span className="daily-lb-user">{s.username}</span>
                                        <span className="daily-lb-time">{s.solve_time}s</span>
                                        <span className="daily-lb-attempts">{s.attempts} attempt{s.attempts > 1 ? 's' : ''}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    /* ════════════════════════════════════════════════════════ */
    /*  Solve Mode                                              */
    /* ════════════════════════════════════════════════════════ */
    return (
        <div className="battle-page arena">
            <div className="arena-topbar">
                <button className="battle-btn-ghost" onClick={() => setMode('overview')}><ChevronLeft size={18} /> Back</button>
                <div className="arena-title">
                    <span className="arena-diff" style={{ background: dc.color }}>{dc.emoji} {dc.label}</span>
                    <h2>{challenge.title}</h2>
                    <span className="arena-pvp-badge">📅 Daily</span>
                </div>
                <div className="arena-meta">
                    <span className="arena-timer"><Clock size={16} /> {formatTime(timer)}</span>
                    <span className="arena-pts"><Award size={16} /> {totalPoints} pts</span>
                    {streak?.current > 0 && <span className="arena-streak"><Flame size={16} /> {streak.current}🔥</span>}
                    <button className="theme-toggle-btn" onClick={() => setDarkTheme(!darkTheme)}>
                        {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>

            <div className="arena-body">
                <div className="arena-problem">
                    <div className="arena-desc" dangerouslySetInnerHTML={{
                        __html: challenge.description?.replace(/\n/g, '<br>')
                            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                            .replace(/## (.*?)(<br>)/g, '<h3>$1</h3>')
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }} />

                    {challenge.sample_tests?.length > 0 && (
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

                    {challenge.hint && (
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
                            className={`arena-submit-btn ${mode === 'completed' ? 'completed' : ''}`}
                            onClick={submitSolution}
                            disabled={submitting || mode === 'completed'}
                        >
                            {submitting ? <><Loader className="spin" size={18} /> Running Tests...</>
                                : mode === 'completed' ? <><CheckCircle2 size={18} /> Completed!</>
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
                                {results.points_earned > 0 && (
                                    <span className="ar-points">+{results.points_earned} pts 🎉</span>
                                )}
                            </div>
                            {results.all_passed && results.streak && (
                                <div className="daily-result-streak">
                                    <Flame size={20} /> {results.streak} Day Streak!
                                    {multiplier > 1 && <span className="daily-result-mult">{multiplier}× bonus applied</span>}
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
