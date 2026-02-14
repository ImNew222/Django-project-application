import { useState, useEffect } from 'react';
import { pairingAPI, authAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    Users, Search, Inbox, Send, CheckCircle, XCircle,
    UserPlus, CircleDot, Filter, User, Heart
} from 'lucide-react';

export default function StudyBuddyPage() {
    const { user } = useAuth();
    const [view, setView] = useState('browse');
    const [students, setStudents] = useState([]);
    const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
    const [genderFilter, setGenderFilter] = useState('');
    const [interestsFilter, setInterestsFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAvailable, setIsAvailable] = useState(user?.is_available_for_pairing || false);
    const [myInterests, setMyInterests] = useState(user?.interests || '');
    const [message, setMessage] = useState('');

    const loadStudents = async () => {
        setLoading(true);
        try {
            const params = {};
            if (genderFilter) params.gender = genderFilter;
            if (interestsFilter) params.interests = interestsFilter;
            const res = await pairingAPI.getAvailable(params);
            setStudents(res.data);
        } catch (err) {
            console.error('Failed to load students:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadRequests = async () => {
        try {
            const res = await pairingAPI.getMyRequests();
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to load requests:', err);
        }
    };

    useEffect(() => {
        loadStudents();
        loadRequests();
    }, [genderFilter, interestsFilter]);

    const toggleAvailability = async () => {
        try {
            await authAPI.updateProfile({
                is_available_for_pairing: !isAvailable,
                interests: myInterests,
            });
            setIsAvailable(!isAvailable);
        } catch (err) {
            console.error('Failed to update profile:', err);
        }
    };

    const updateInterests = async () => {
        try {
            await authAPI.updateProfile({ interests: myInterests });
            setMessage('Interests updated!');
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            console.error('Failed to update interests:', err);
        }
    };

    const sendRequest = async (toUserId) => {
        try {
            const res = await pairingAPI.sendRequest({ to_user_id: toUserId });
            setMessage(res.data.message);
            setTimeout(() => setMessage(''), 3000);
            loadRequests();
            loadStudents();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to send request.';
            setMessage(msg);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const respondToRequest = async (requestId, action) => {
        try {
            const res = await pairingAPI.respond(requestId, action);
            setMessage(res.data.message);
            setTimeout(() => setMessage(''), 3000);
            loadRequests();
        } catch (err) {
            console.error('Failed to respond:', err);
        }
    };

    return (
        <div className="buddy-page">
            <h1><Users size={28} /> Find a Study Buddy</h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                Connect with other students to study together. Find your perfect study partner!
            </p>

            {message && <div className="success-msg">{message}</div>}

            <div className="buddy-profile-card">
                <h3>Your Study Profile</h3>
                <div className="buddy-profile-controls">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label><Filter size={14} /> My Interests</label>
                        <input
                            type="text"
                            placeholder="e.g., Python, Web Dev, Networking, Math..."
                            value={myInterests}
                            onChange={(e) => setMyInterests(e.target.value)}
                            onBlur={updateInterests}
                        />
                    </div>
                    <button
                        className={`btn ${isAvailable ? 'btn-danger' : 'btn-primary'}`}
                        onClick={toggleAvailability}
                    >
                        <CircleDot size={14} /> {isAvailable ? 'Go Offline' : 'Go Available'}
                    </button>
                </div>
                <p className="buddy-status">
                    Status: {isAvailable
                        ? <span style={{ color: '#0a0', fontWeight: 700 }}><CheckCircle size={14} /> Available for pairing</span>
                        : <span style={{ color: '#999' }}>Not available</span>
                    }
                </p>
            </div>

            <div className="buddy-tabs">
                <button
                    className={`tab-btn ${view === 'browse' ? 'active' : ''}`}
                    onClick={() => setView('browse')}
                >
                    <Search size={14} /> Browse Students
                </button>
                <button
                    className={`tab-btn ${view === 'requests' ? 'active' : ''}`}
                    onClick={() => { setView('requests'); loadRequests(); }}
                >
                    <Inbox size={14} /> Requests {requests.incoming.length > 0 && `(${requests.incoming.length})`}
                </button>
            </div>

            {view === 'browse' && (
                <>
                    <div className="buddy-filters">
                        <div className="filter-group">
                            <button className={`filter-btn ${genderFilter === '' ? 'active' : ''}`} onClick={() => setGenderFilter('')}>All</button>
                            <button className={`filter-btn ${genderFilter === 'male' ? 'active' : ''}`} onClick={() => setGenderFilter('male')}>Male</button>
                            <button className={`filter-btn ${genderFilter === 'female' ? 'active' : ''}`} onClick={() => setGenderFilter('female')}>Female</button>
                        </div>
                        <input
                            type="text"
                            placeholder="Filter by interest..."
                            value={interestsFilter}
                            onChange={(e) => setInterestsFilter(e.target.value)}
                            className="buddy-search-input"
                        />
                    </div>

                    <div className="buddy-grid">
                        {loading ? (
                            <div className="empty-state"><p>Loading...</p></div>
                        ) : students.length === 0 ? (
                            <div className="empty-state"><p>No students available right now. Check back later!</p></div>
                        ) : students.map(student => (
                            <div key={student.id} className="buddy-card">
                                <div className="buddy-card-avatar">
                                    {student.username[0].toUpperCase()}
                                </div>
                                <div className="buddy-card-info">
                                    <h3>{student.first_name || student.username}</h3>
                                    <span className="buddy-gender">
                                        <User size={12} /> {student.gender || 'Not specified'}
                                    </span>
                                    {student.interests && (
                                        <div className="buddy-interests">
                                            {student.interests.split(',').map((i, idx) => (
                                                <span key={idx} className="interest-tag">{i.trim()}</span>
                                            ))}
                                        </div>
                                    )}
                                    {student.bio && <p className="buddy-bio">{student.bio}</p>}
                                </div>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => sendRequest(student.id)}
                                >
                                    <UserPlus size={14} /> Send Request
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {view === 'requests' && (
                <div className="buddy-requests">
                    <h2><Inbox size={20} /> Incoming Requests</h2>
                    {requests.incoming.length === 0 ? (
                        <div className="empty-state"><p>No incoming requests</p></div>
                    ) : requests.incoming.map(req => (
                        <div key={req.id} className="buddy-request-card">
                            <div className="buddy-request-info">
                                <strong>{req.from_username}</strong>
                                <span><User size={12} /> {req.from_gender || 'Not specified'}</span>
                                {req.message && <p>{req.message}</p>}
                            </div>
                            <div className="buddy-request-actions">
                                <button className="btn btn-primary btn-sm" onClick={() => respondToRequest(req.id, 'accept')}>
                                    <CheckCircle size={14} /> Accept
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => respondToRequest(req.id, 'decline')}>
                                    <XCircle size={14} /> Decline
                                </button>
                            </div>
                        </div>
                    ))}

                    <h2 style={{ marginTop: '2rem' }}><Send size={20} /> Sent Requests</h2>
                    {requests.outgoing.length === 0 ? (
                        <div className="empty-state"><p>No sent requests</p></div>
                    ) : requests.outgoing.map(req => (
                        <div key={req.id} className="buddy-request-card outgoing">
                            <div className="buddy-request-info">
                                <strong>To: {req.to_username}</strong>
                                <span className={`buddy-status-badge ${req.status}`}>{req.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
