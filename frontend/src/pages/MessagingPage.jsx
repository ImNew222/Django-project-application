import { useState, useEffect, useRef, useCallback } from 'react';
import { messagingAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Send, Plus, X, Search, ArrowLeft } from 'lucide-react';

export default function MessagingPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);

    const loadConversations = useCallback(async () => {
        try {
            const res = await messagingAPI.getConversations();
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const loadMessages = useCallback(async () => {
        if (!activeConvo) return;
        try {
            const res = await messagingAPI.getMessages(activeConvo.id);
            setMessages(res.data);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    }, [activeConvo]);

    useEffect(() => {
        loadMessages();
        if (activeConvo) {
            pollRef.current = setInterval(loadMessages, 3000);
        }
        return () => clearInterval(pollRef.current);
    }, [activeConvo, loadMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConvo) return;
        try {
            await messagingAPI.sendMessage(activeConvo.id, newMessage.trim());
            setNewMessage('');
            loadMessages();
            loadConversations();
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await messagingAPI.searchUsers(searchQuery);
                setSearchResults(res.data);
            } catch (err) {
                console.error('Search failed:', err);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const startConversation = async (userId) => {
        try {
            const res = await messagingAPI.createConversation({
                participant_ids: [userId],
                is_group: false,
            });
            setShowNewChat(false);
            setSearchQuery('');
            setActiveConvo(res.data);
            loadConversations();
        } catch (err) {
            console.error('Failed to create conversation:', err);
        }
    };

    const getConvoName = (convo) => {
        if (convo.title) return convo.title;
        const other = convo.participants_info?.find(p => p.id !== user?.id);
        return other?.username || 'Chat';
    };

    const timeAgo = (dateStr) => {
        const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
        if (diff < 60) return 'now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    };

    return (
        <div className="messaging-page">
            {/* Sidebar */}
            <div className={`msg-sidebar ${activeConvo ? 'hide-mobile' : ''}`}>
                <div className="msg-sidebar-header">
                    <h2><MessageCircle size={20} /> Chats</h2>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(!showNewChat)}>
                        {showNewChat ? <X size={16} /> : <Plus size={16} />}
                    </button>
                </div>

                {showNewChat && (
                    <div className="msg-new-chat">
                        <div className="msg-search-wrap">
                            <Search size={14} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {searchResults.map(u => (
                            <div key={u.id} className="msg-search-result" onClick={() => startConversation(u.id)}>
                                <span className="msg-avatar">{u.username[0].toUpperCase()}</span>
                                <span>{u.username}</span>
                                <span className="msg-role-badge">{u.role}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="msg-convo-list">
                    {loading ? (
                        <div className="empty-state"><p>Loading...</p></div>
                    ) : conversations.length === 0 ? (
                        <div className="empty-state"><p>No conversations yet</p></div>
                    ) : conversations.map(convo => (
                        <div
                            key={convo.id}
                            className={`msg-convo-item ${activeConvo?.id === convo.id ? 'active' : ''}`}
                            onClick={() => setActiveConvo(convo)}
                        >
                            <div className="msg-convo-avatar">
                                {convo.is_group ? <MessageCircle size={18} /> : getConvoName(convo)[0]?.toUpperCase()}
                            </div>
                            <div className="msg-convo-info">
                                <div className="msg-convo-name">{getConvoName(convo)}</div>
                                <div className="msg-convo-preview">
                                    {convo.last_message
                                        ? `${convo.last_message.sender_name}: ${convo.last_message.content}`
                                        : 'No messages yet'}
                                </div>
                            </div>
                            <div className="msg-convo-meta">
                                {convo.last_message && (
                                    <span className="msg-time">{timeAgo(convo.last_message.created_at)}</span>
                                )}
                                {convo.unread_count > 0 && (
                                    <span className="msg-unread">{convo.unread_count}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat area */}
            <div className={`msg-chat-area ${!activeConvo ? 'hide-mobile' : ''}`}>
                {!activeConvo ? (
                    <div className="msg-empty-chat">
                        <MessageCircle size={64} strokeWidth={1} />
                        <h3>Select a conversation</h3>
                        <p>Or start a new chat with the + button</p>
                    </div>
                ) : (
                    <>
                        <div className="msg-chat-header">
                            <button className="msg-back-btn" onClick={() => setActiveConvo(null)}>
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h3>{getConvoName(activeConvo)}</h3>
                                <span className="msg-chat-participants">
                                    {activeConvo.participants_info?.map(p => p.username).join(', ')}
                                </span>
                            </div>
                        </div>

                        <div className="msg-messages">
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`msg-bubble ${msg.sender === user?.id ? 'sent' : 'received'}`}
                                >
                                    {msg.sender !== user?.id && (
                                        <span className="msg-sender">{msg.sender_name}</span>
                                    )}
                                    <p>{msg.content}</p>
                                    <span className="msg-timestamp">{timeAgo(msg.created_at)}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="msg-input-area" onSubmit={handleSend}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                                <Send size={16} />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
