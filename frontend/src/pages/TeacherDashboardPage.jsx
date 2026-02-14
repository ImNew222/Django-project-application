import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, classroomAPI, quizAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    GraduationCap, Users, ClipboardList, TrendingUp,
    Award, Flame, Search, Eye, Lock, X, User, BarChart3,
    Plus, Copy, Check, BookOpen, Trash2, Calendar
} from 'lucide-react';

export default function TeacherDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    // Section state
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionStudents, setSectionStudents] = useState(null);
    const [sectionsLoading, setSectionsLoading] = useState(true);

    // Student state (for teacher view)
    const [students, setStudents] = useState([]);
    const [studentDetail, setStudentDetail] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Create section
    const [showCreate, setShowCreate] = useState(false);
    const [newSection, setNewSection] = useState({
        program: 'BSIT', year_level: 1, section_num: 1, description: ''
    });

    // Join section (for students)
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');

    // Assign modal
    const [showAssign, setShowAssign] = useState(null);
    const [assignData, setAssignData] = useState({
        assignment_type: 'quiz', title: '', description: '', difficulty: 'beginner',
        num_questions: 10, due_date: '',
    });

    // Tab for teacher
    const [activeTab, setActiveTab] = useState('sections');

    // Copy join code
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        loadSections();
        if (isTeacher) loadStudents();
    }, []);

    const loadSections = async () => {
        try {
            const res = await classroomAPI.getSections();
            setSections(res.data);
        } catch (err) {
            console.error('Failed to load sections:', err);
        } finally {
            setSectionsLoading(false);
        }
    };

    const loadStudents = async () => {
        try {
            const res = await authAPI.getStudents();
            setStudents(res.data.students);
        } catch (err) {
            console.error('Failed to load students:', err);
        } finally {
            setLoading(false);
        }
    };

    const createSection = async () => {
        try {
            await classroomAPI.createSection(newSection);
            setShowCreate(false);
            setNewSection({ program: 'BSIT', year_level: 1, section_num: 1, description: '' });
            loadSections();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create section');
        }
    };

    const joinSection = async () => {
        setJoinError('');
        try {
            await classroomAPI.joinSection(joinCode);
            setJoinCode('');
            loadSections();
        } catch (err) {
            setJoinError(err.response?.data?.error || 'Invalid code');
        }
    };

    const viewSectionStudents = async (sectionId) => {
        try {
            const res = await classroomAPI.getSectionStudents(sectionId);
            setSectionStudents(res.data);
            setSelectedSection(sectionId);
        } catch (err) {
            console.error('Failed:', err);
        }
    };

    const viewStudent = async (studentId) => {
        try {
            const res = await authAPI.getStudentDetail(studentId);
            setStudentDetail(res.data);
        } catch (err) {
            console.error('Failed to load student detail:', err);
        }
    };

    const createAssignment = async (sectionId) => {
        try {
            await classroomAPI.createAssignment(sectionId, assignData);
            setShowAssign(null);
            setAssignData({
                assignment_type: 'quiz', title: '', description: '', difficulty: 'beginner',
                num_questions: 10, due_date: '',
            });
            loadSections();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    };

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // ── Student View (My Sections) ──────────────────────────
    if (!isTeacher) {
        return (
            <div className="teacher-page">
                <h1><BookOpen size={28} /> My Sections</h1>

                {/* Join Section */}
                <div className="section-join-bar">
                    <input
                        type="text"
                        placeholder="Enter 6-digit join code..."
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="section-join-input"
                    />
                    <button className="btn btn-primary" onClick={joinSection} disabled={joinCode.length !== 6}>
                        Join Section
                    </button>
                </div>
                {joinError && <div className="error-msg" style={{ marginTop: '0.5rem' }}>{joinError}</div>}

                {/* Section List */}
                {sectionsLoading ? (
                    <div className="empty-state"><p>Loading...</p></div>
                ) : sections.length === 0 ? (
                    <div className="empty-state">
                        <p>No sections yet. Ask your teacher for a join code!</p>
                    </div>
                ) : (
                    <div className="section-grid">
                        {sections.map(s => (
                            <div key={s.id} className="section-card" onClick={() => navigate(`/section/${s.id}`)}>
                                <div className="section-card-header">
                                    <h3>{s.display_name}</h3>
                                    <span className="section-member-count">
                                        <Users size={14} /> {s.member_count}
                                    </span>
                                </div>
                                <p className="section-card-teacher">Teacher: {s.teacher}</p>
                                {s.description && <p className="section-card-desc">{s.description}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Teacher View ────────────────────────────────────────
    const filteredStudents = students.filter(s =>
        s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalXP = students.reduce((sum, s) => sum + s.xp, 0);
    const totalQuizzes = students.reduce((sum, s) => sum + s.total_quizzes, 0);
    const avgScore = students.length > 0
        ? (students.reduce((sum, s) => sum + s.avg_score, 0) / students.length).toFixed(1)
        : 0;

    return (
        <div className="teacher-page">
            <h1><GraduationCap size={28} /> Teacher Dashboard</h1>

            {/* Stats */}
            <div className="teacher-stats-grid">
                <div className="teacher-stat-card">
                    <BookOpen size={28} strokeWidth={1.5} />
                    <div className="teacher-stat-number">{sections.length}</div>
                    <div className="teacher-stat-label">Sections</div>
                </div>
                <div className="teacher-stat-card">
                    <Users size={28} strokeWidth={1.5} />
                    <div className="teacher-stat-number">{students.length}</div>
                    <div className="teacher-stat-label">Total Students</div>
                </div>
                <div className="teacher-stat-card">
                    <ClipboardList size={28} strokeWidth={1.5} />
                    <div className="teacher-stat-number">{totalQuizzes}</div>
                    <div className="teacher-stat-label">Quizzes Taken</div>
                </div>
                <div className="teacher-stat-card">
                    <TrendingUp size={28} strokeWidth={1.5} />
                    <div className="teacher-stat-number">{avgScore}%</div>
                    <div className="teacher-stat-label">Avg Score</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="teacher-tabs">
                <button
                    className={`teacher-tab ${activeTab === 'sections' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sections')}
                >
                    <BookOpen size={16} /> Sections
                </button>
                <button
                    className={`teacher-tab ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                >
                    <Users size={16} /> All Students
                </button>
            </div>

            {/* ── Sections Tab ──────────────────────────── */}
            {activeTab === 'sections' && (
                <div className="teacher-section">
                    <div className="teacher-section-header">
                        <h2><BookOpen size={20} /> My Sections</h2>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                            <Plus size={14} /> Create Section
                        </button>
                    </div>

                    {sections.length === 0 ? (
                        <div className="empty-state">
                            <p>No sections created yet. Create your first section!</p>
                        </div>
                    ) : (
                        <div className="section-grid">
                            {sections.map(s => (
                                <div key={s.id} className="section-card teacher-owned">
                                    <div className="section-card-header">
                                        <h3>{s.display_name}</h3>
                                        <span className="section-member-count">
                                            <Users size={14} /> {s.member_count}
                                        </span>
                                    </div>
                                    {s.description && <p className="section-card-desc">{s.description}</p>}
                                    <div className="section-card-actions">
                                        <button
                                            className="section-code-btn"
                                            onClick={(e) => { e.stopPropagation(); copyCode(s.join_code, s.id); }}
                                        >
                                            {copiedId === s.id ? <Check size={12} /> : <Copy size={12} />}
                                            {copiedId === s.id ? 'Copied!' : s.join_code}
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => navigate(`/section/${s.id}`)}
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            onClick={() => viewSectionStudents(s.id)}
                                        >
                                            <Users size={14} /> Students
                                        </button>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setShowAssign(s.id)}
                                        >
                                            <ClipboardList size={14} /> Assign
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Students Tab ──────────────────────────── */}
            {activeTab === 'students' && (
                <div className="teacher-section">
                    <div className="teacher-section-header">
                        <h2><ClipboardList size={20} /> Student Activity</h2>
                        <div className="teacher-search-wrap">
                            <Search size={14} />
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="teacher-search"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty-state"><p>Loading...</p></div>
                    ) : (
                        <>
                            <div className="teacher-table-wrap teacher-desktop">
                                <table className="teacher-table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Gender</th>
                                            <th>Quizzes</th>
                                            <th>Avg Score</th>
                                            <th>XP</th>
                                            <th>Rank</th>
                                            <th>Streak</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map(student => (
                                            <tr key={student.id}>
                                                <td>
                                                    <strong>{student.username}</strong>
                                                    {student.first_name && (
                                                        <span className="teacher-name-sub"> ({student.first_name} {student.last_name})</span>
                                                    )}
                                                </td>
                                                <td>{student.gender || '—'}</td>
                                                <td>{student.total_quizzes}</td>
                                                <td>{student.avg_score}%</td>
                                                <td>{student.xp}</td>
                                                <td><span className="rank-badge">{student.rank}</span></td>
                                                <td><Flame size={14} /> {student.streak}</td>
                                                <td>
                                                    <button className="btn btn-primary btn-sm" onClick={() => viewStudent(student.id)}>
                                                        <Eye size={14} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="teacher-mobile">
                                {filteredStudents.map(student => (
                                    <div key={student.id} className="teacher-mobile-card" onClick={() => viewStudent(student.id)}>
                                        <div className="teacher-mobile-card-header">
                                            <strong>{student.username}</strong>
                                            <span className="rank-badge">{student.rank}</span>
                                        </div>
                                        <div className="teacher-mobile-card-stats">
                                            <span><ClipboardList size={12} /> {student.total_quizzes} quizzes</span>
                                            <span><TrendingUp size={12} /> {student.avg_score}%</span>
                                            <span><Award size={12} /> {student.xp} XP</span>
                                            <span><Flame size={12} /> {student.streak}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Create Section Modal ─────────────────── */}
            {showCreate && (
                <div className="teacher-modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="teacher-modal-close" onClick={() => setShowCreate(false)}>
                            <X size={20} />
                        </button>
                        <h2><Plus size={22} /> Create Section</h2>

                        <div className="form-group">
                            <label>Program</label>
                            <select value={newSection.program} onChange={(e) => setNewSection({ ...newSection, program: e.target.value })}>
                                <option value="BSIT">BSIT</option>
                                <option value="BSCS">BSCS</option>
                                <option value="BSIS">BSIS</option>
                                <option value="ACT">ACT</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Year Level</label>
                            <select value={newSection.year_level} onChange={(e) => setNewSection({ ...newSection, year_level: parseInt(e.target.value) })}>
                                {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}st Year</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Section Number</label>
                            <input
                                type="number" min="1" max="20"
                                value={newSection.section_num}
                                onChange={(e) => setNewSection({ ...newSection, section_num: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Description (optional)</label>
                            <textarea
                                value={newSection.description}
                                onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                                placeholder="e.g. Mon/Wed 9AM - Data Structures"
                            />
                        </div>
                        <button className="btn btn-primary" onClick={createSection}>Create Section</button>
                    </div>
                </div>
            )}

            {/* ── Assign Modal ─────────────────────────── */}
            {showAssign && (
                <div className="teacher-modal-overlay" onClick={() => setShowAssign(null)}>
                    <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="teacher-modal-close" onClick={() => setShowAssign(null)}>
                            <X size={20} />
                        </button>
                        <h2><ClipboardList size={22} /> Create Assignment</h2>

                        <div className="form-group">
                            <label>Type</label>
                            <select value={assignData.assignment_type} onChange={(e) => setAssignData({ ...assignData, assignment_type: e.target.value })}>
                                <option value="quiz">Quiz</option>
                                <option value="challenge">Code Challenge</option>
                                <option value="tournament">Tournament</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                value={assignData.title}
                                onChange={(e) => setAssignData({ ...assignData, title: e.target.value })}
                                placeholder="e.g. Week 3 Quiz - Arrays"
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={assignData.description}
                                onChange={(e) => setAssignData({ ...assignData, description: e.target.value })}
                                placeholder="Instructions for students..."
                            />
                        </div>
                        {assignData.assignment_type === 'quiz' && (
                            <>
                                <div className="form-group">
                                    <label>Difficulty</label>
                                    <select value={assignData.difficulty} onChange={(e) => setAssignData({ ...assignData, difficulty: e.target.value })}>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Number of Questions</label>
                                    <input
                                        type="number" min="5" max="30"
                                        value={assignData.num_questions}
                                        onChange={(e) => setAssignData({ ...assignData, num_questions: parseInt(e.target.value) })}
                                    />
                                </div>
                            </>
                        )}
                        <div className="form-group">
                            <label>Due Date (optional)</label>
                            <input
                                type="datetime-local"
                                value={assignData.due_date}
                                onChange={(e) => setAssignData({ ...assignData, due_date: e.target.value })}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={() => createAssignment(showAssign)}>
                            Create Assignment
                        </button>
                    </div>
                </div>
            )}

            {/* ── Section Students Modal ───────────────── */}
            {sectionStudents && (
                <div className="teacher-modal-overlay" onClick={() => setSectionStudents(null)}>
                    <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="teacher-modal-close" onClick={() => setSectionStudents(null)}>
                            <X size={20} />
                        </button>
                        <h2><Users size={22} /> {sectionStudents.section?.display_name} — Students</h2>

                        {sectionStudents.students?.length === 0 ? (
                            <p style={{ color: '#999' }}>No students have joined yet.</p>
                        ) : (
                            <table className="teacher-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Quizzes</th>
                                        <th>Avg Score</th>
                                        <th>XP</th>
                                        <th>Streak</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectionStudents.students?.map(s => (
                                        <tr key={s.id}>
                                            <td>
                                                <strong>{s.username}</strong>
                                                {s.first_name && <span className="teacher-name-sub"> ({s.first_name} {s.last_name})</span>}
                                            </td>
                                            <td>{s.total_quizzes}</td>
                                            <td>{s.avg_score}%</td>
                                            <td>{s.xp}</td>
                                            <td><Flame size={14} /> {s.streak}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ── Student Detail Modal ─────────────────── */}
            {studentDetail && (
                <div className="teacher-modal-overlay" onClick={() => setStudentDetail(null)}>
                    <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="teacher-modal-close" onClick={() => setStudentDetail(null)}>
                            <X size={20} />
                        </button>
                        <h2><BarChart3 size={22} /> {studentDetail.student.username}'s Profile</h2>

                        <div className="teacher-detail-grid">
                            <div className="teacher-detail-section">
                                <h3>Profile</h3>
                                <p><strong>Name:</strong> {studentDetail.student.first_name} {studentDetail.student.last_name}</p>
                                <p><strong>Email:</strong> {studentDetail.student.email}</p>
                                <p><strong>Gender:</strong> {studentDetail.student.gender || 'Not set'}</p>
                                <p><strong>Interests:</strong> {studentDetail.student.interests || 'None'}</p>
                                <p><strong>Joined:</strong> {new Date(studentDetail.student.date_joined).toLocaleDateString()}</p>
                            </div>

                            {studentDetail.stats && Object.keys(studentDetail.stats).length > 0 && (
                                <div className="teacher-detail-section">
                                    <h3>Stats</h3>
                                    <p><strong>XP:</strong> {studentDetail.stats.xp}</p>
                                    <p><strong>Rank:</strong> {studentDetail.stats.rank_title}</p>
                                    <p><strong>Streak:</strong> <Flame size={14} /> {studentDetail.stats.streak}</p>
                                    <p><strong>Quizzes:</strong> {studentDetail.stats.quizzes_completed}</p>
                                    <p><strong>Accuracy:</strong> {studentDetail.stats.total_answered > 0
                                        ? ((studentDetail.stats.total_correct / studentDetail.stats.total_answered) * 100).toFixed(1)
                                        : 0}%
                                    </p>
                                </div>
                            )}
                        </div>

                        <h3>Recent Quiz Sessions</h3>
                        {studentDetail.recent_quizzes.length === 0 ? (
                            <p style={{ color: '#999' }}>No quiz sessions yet.</p>
                        ) : (
                            <table className="teacher-table">
                                <thead>
                                    <tr><th>Subject</th><th>Difficulty</th><th>Score</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {studentDetail.recent_quizzes.map(q => (
                                        <tr key={q.id}>
                                            <td>{q.subject}</td>
                                            <td>{q.difficulty}</td>
                                            <td>{q.score}/{q.total_questions}</td>
                                            <td>{new Date(q.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
