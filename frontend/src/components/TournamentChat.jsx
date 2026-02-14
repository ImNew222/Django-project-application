import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Send, X, ChevronUp } from 'lucide-react';

export default function TournamentChat({ tournamentId }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [open, setOpen] = useState(false);
    const [connected, setConnected] = useState(false);
    const [unread, setUnread] = useState(0);
    const wsRef = useRef(null);
    const listRef = useRef(null);
    const openRef = useRef(open);

    useEffect(() => { openRef.current = open; }, [open]);

    useEffect(() => {
        if (!tournamentId) return;

        const token = localStorage.getItem('access');
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname;
        const port = '8000';
        const url = `${protocol}://${host}:${port}/ws/tournament-chat/${tournamentId}/?token=${token}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);

            if (data.type === 'chat_message') {
                setMessages(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    username: data.username,
                    message: data.message,
                    timestamp: data.timestamp,
                    isSystem: false,
                }]);
                if (!openRef.current) {
                    setUnread(prev => prev + 1);
                }
            } else if (data.type === 'system_message') {
                setMessages(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    message: data.message,
                    timestamp: data.timestamp,
                    isSystem: true,
                }]);
            }
        };

        return () => ws.close();
    }, [tournamentId]);

    // Auto-scroll
    useEffect(() => {
        if (listRef.current && open) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, open]);

    const sendMessage = () => {
        const text = input.trim();
        if (!text || !wsRef.current || wsRef.current.readyState !== 1) return;
        wsRef.current.send(JSON.stringify({
            type: 'send_message',
            message: text,
        }));
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleOpen = () => {
        setOpen(!open);
        if (!open) setUnread(0);
    };

    return (
        <div className={`tchat-wrapper ${open ? 'open' : 'closed'}`}>
            {/* Toggle Button */}
            <button className="tchat-toggle" onClick={toggleOpen}>
                {open ? <ChevronUp size={16} /> : <MessageCircle size={16} />}
                <span>Chat</span>
                {!open && unread > 0 && (
                    <span className="tchat-badge">{unread}</span>
                )}
            </button>

            {/* Chat Panel */}
            {open && (
                <div className="tchat-panel">
                    <div className="tchat-header">
                        <h4><MessageCircle size={14} /> Tournament Chat</h4>
                        <div className="tchat-status">
                            <span className={`tchat-dot ${connected ? 'online' : 'offline'}`} />
                            {connected ? 'Connected' : 'Disconnected'}
                        </div>
                    </div>

                    <div className="tchat-messages" ref={listRef}>
                        {messages.length === 0 && (
                            <div className="tchat-empty">
                                No messages yet. Say hello! 👋
                            </div>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={`tchat-msg ${msg.isSystem ? 'system' : ''} ${msg.username === user?.username ? 'mine' : ''}`}>
                                {msg.isSystem ? (
                                    <span className="tchat-system-text">{msg.message}</span>
                                ) : (
                                    <>
                                        <span className="tchat-sender">{msg.username}</span>
                                        <span className="tchat-text">{msg.message}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="tchat-input-bar">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            maxLength={500}
                            disabled={!connected}
                        />
                        <button onClick={sendMessage} disabled={!input.trim() || !connected}>
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
