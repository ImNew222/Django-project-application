import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classroomAPI, quizAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    BookOpen, Users, MessageSquare, ClipboardList, ChevronLeft,
    Trophy, Send, Clock, CheckCircle2, AlertCircle,
    Copy, Check, Calendar
} from 'lucide-react';

export default function SectionPage() {
    const { sectionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [section, setSection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('chat');
    const [error, setError] = useState('');

    // Chat state
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef(null);
    const chatEndRef = useRef(null);

    // Copy join code
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadSection();
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [sectionId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSection = async () => {
        try {
            const res = await classroomAPI.getSection(sectionId);
            setSection(res.data);
            connectChat();
        } catch (err) {
            setError('Section not found or access denied.');
        } finally {
            setLoading(false);
        }
    };

    const connectChat = () => {
        const token = localStorage.getItem('access_token');
        const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsHost = import.meta.env.VITE_WS_URL || 'localhost:8000';
        const ws = new WebSocket(`${wsProto}://${wsHost}/ws/section-chat/${sectionId}/?token=${token}`);

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => setWsConnected(false);
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'chat_message') {
                setMessages(prev => [...prev, {
                    type: 'message',
                    username: data.username,
                    message: data.message,
                    timestamp: data.timestamp,
                    isMine: data.username === user?.username,
                }]);
            } else if (data.type === 'system_message') {
                setMessages(prev => [...prev, {
                    type: 'system',
                    message: data.message,
                    timestamp: data.timestamp,
                }]);
            }
        };

        wsRef.current = ws;
    };

    const sendMessage = () => {
        if (!chatInput.trim() || !wsRef.current) return;
        wsRef.current.send(JSON.stringify({
            type: 'send_message',
            message: chatInput.trim(),
        }));
        setChatInput('');
    };

    const copyCode = () => {
        if (section?.join_code) {
            navigator.clipboard.writeText(section.join_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) return <div className="loading">Loading section...</div>;
    if (error) return <div className="page-container"><div className="error-msg">{error}</div></div>;
    if (!section) return null;

    const isTeacher = section.is_teacher;

    return (
        <div className="section-page">
            {/* Header */}
            <div className="section-header">
                <button className="btn btn-ghost" onClick={() => navigate(-1)}>
                    <ChevronLeft size={18} /> Back
                </button>
                <div className="section-title-block">
                    <h1><BookOpen size={24} /> {section.display_name}</h1>
                    <div className="section-meta">
                        <span><Users size={14} /> {section.member_count} members</span>
                        <span>Teacher: {section.teacher}</span>
                        {isTeacher && section.join_code && (
                            <button className="section-code-btn" onClick={copyCode}>
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied!' : section.join_code}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="section-tabs">
                {[
                    { key: 'chat', icon: <MessageSquare size={16} />, label: 'Chat' },
                    { key: 'assignments', icon: <ClipboardList size={16} />, label: 'Assignments' },
                    { key: 'members', icon: <Users size={16} />, label: 'Members' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`section-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="section-content">
                {/* ── Chat Tab ──────────────────────────── */}
                {activeTab === 'chat' && (
                    <div className="section-chat-area">
                        <div className="section-chat-header">
                            <h3><MessageSquare size={18} /> Section Chat</h3>
                            <span className={`section-ws-status ${wsConnected ? 'online' : 'offline'}`}>
                                ● {wsConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <div className="section-chat-messages">
                            {messages.length === 0 && (
                                <div className="section-chat-empty">
                                    Start chatting with your section! 💬
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`section-msg ${msg.type} ${msg.isMine ? 'mine' : ''}`}>
                                    {msg.type === 'system' ? (
                                        <span className="section-msg-system">{msg.message}</span>
                                    ) : (
                                        <>
                                            {!msg.isMine && (
                                                <span className="section-msg-sender">{msg.username}</span>
                                            )}
                                            <span className="section-msg-text">{msg.message}</span>
                                        </>
                                    )}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="section-chat-input">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                disabled={!wsConnected}
                            />
                            <button onClick={sendMessage} disabled={!wsConnected || !chatInput.trim()}>
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Assignments Tab ───────────────────── */}
                {activeTab === 'assignments' && (
                    <div className="section-assignments">
                        <div className="section-assignments-header">
                            <h3><ClipboardList size={18} /> Assignments</h3>
                        </div>
                        {section.assignments?.length === 0 ? (
                            <div className="section-empty">No assignments yet.</div>
                        ) : (
                            <div className="section-assignment-list">
                                {section.assignments?.map(a => (
                                    <div key={a.id} className="section-assignment-card">
                                        <div className="assignment-type-badge" data-type={a.type}>
                                            {a.type === 'quiz' ? '📝' : a.type === 'tournament' ? '⚔️' : '💻'} {a.type}
                                        </div>
                                        <h4>{a.title}</h4>
                                        {a.description && <p>{a.description}</p>}
                                        <div className="assignment-meta">
                                            {a.subject && <span>Subject: {a.subject}</span>}
                                            {a.difficulty && <span>Difficulty: {a.difficulty}</span>}
                                            {a.due_date && (
                                                <span className="assignment-due">
                                                    <Calendar size={12} />
                                                    Due: {new Date(a.due_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        {a.type === 'quiz' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => navigate('/quiz')}
                                            >
                                                Take Quiz
                                            </button>
                                        )}
                                        {a.type === 'tournament' && a.tournament_id && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => navigate('/tournaments')}
                                            >
                                                Go to Tournament
                                            </button>
                                        )}
                                        {a.type === 'challenge' && a.challenge_id && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => navigate('/battle')}
                                            >
                                                Solve Challenge
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Members Tab ───────────────────────── */}
                {activeTab === 'members' && (
                    <div className="section-members">
                        <h3><Users size={18} /> Members ({section.members?.length || 0})</h3>
                        <div className="section-member-list">
                            {/* Teacher */}
                            <div className="section-member-card teacher-card">
                                <div className="member-avatar">👨‍🏫</div>
                                <div className="member-info">
                                    <strong>{section.teacher}</strong>
                                    <span className="member-role teacher">Teacher</span>
                                </div>
                            </div>
                            {/* Students */}
                            {section.members?.map(m => (
                                <div key={m.id} className="section-member-card">
                                    <div className="member-avatar">🎓</div>
                                    <div className="member-info">
                                        <strong>{m.username}</strong>
                                        {m.first_name && (
                                            <span className="member-name">{m.first_name} {m.last_name}</span>
                                        )}
                                    </div>
                                    <span className="member-joined">
                                        Joined {new Date(m.joined_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
