import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../api/client';
import { Swords, ShieldAlert, Clock, Ban, Eye, Shuffle } from 'lucide-react';

export default function QuizLobbyPage() {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [difficulty, setDifficulty] = useState('beginner');
    const [numQuestions, setNumQuestions] = useState(10);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        quizAPI.getSubjects()
            .then((res) => setSubjects(res.data))
            .catch((err) => console.error('Failed to load subjects:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleStartQuiz = async () => {
        if (!selectedSubject) {
            setError('Please select a subject.');
            return;
        }
        setError('');
        setStarting(true);

        try {
            const res = await quizAPI.startQuiz({
                subject_id: selectedSubject.id,
                difficulty,
                num_questions: numQuestions,
            });
            // Navigate to quiz play page with the session data
            navigate('/quiz/play', { state: res.data });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to start quiz.');
        } finally {
            setStarting(false);
        }
    };

    if (loading) return <div className="loading">Loading subjects...</div>;

    return (
        <div className="quiz-lobby-page">
            <h1><Swords size={28} /> Quiz Battle Arena</h1>
            <p>Choose your subject and difficulty, then battle!</p>

            {error && <div className="error-msg">{error}</div>}

            {/* Subject Selection */}
            <div className="section">
                <h2>Select Subject</h2>
                <div className="subject-grid">
                    {subjects.map((subject) => (
                        <div
                            key={subject.id}
                            className={`subject-card ${selectedSubject?.id === subject.id ? 'selected' : ''}`}
                            onClick={() => setSelectedSubject(subject)}
                        >
                            <div className="subject-icon">{subject.icon}</div>
                            <div className="subject-name">{subject.name}</div>
                            <div className="subject-count">{subject.question_count} questions</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Difficulty Selection */}
            <div className="section">
                <h2>Select Difficulty</h2>
                <div className="difficulty-grid">
                    {['beginner', 'intermediate', 'hard'].map((diff) => (
                        <button
                            key={diff}
                            className={`difficulty-btn ${difficulty === diff ? 'selected' : ''} diff-${diff}`}
                            onClick={() => setDifficulty(diff)}
                        >
                            <span className="diff-emoji">
                                {diff === 'beginner' ? <span className="diff-dot beginner" /> : diff === 'intermediate' ? <span className="diff-dot intermediate" /> : <span className="diff-dot hard" />}
                            </span>
                            <span className="diff-text">{diff.charAt(0).toUpperCase() + diff.slice(1)}</span>
                            <span className="diff-multiplier">
                                {diff === 'beginner' ? '1x' : diff === 'intermediate' ? '1.5x' : '2x'} points
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Number of Questions */}
            <div className="section">
                <h2>Number of Questions</h2>
                <div className="num-questions">
                    {[5, 10, 15, 20].map((num) => (
                        <button
                            key={num}
                            className={`num-btn ${numQuestions === num ? 'selected' : ''}`}
                            onClick={() => setNumQuestions(num)}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            {/* Anti-Cheat Notice */}
            <div className="anticheat-notice">
                <h3><ShieldAlert size={18} /> Anti-Cheat Active</h3>
                <ul>
                    <li><Clock size={14} /> Each question has a 30-second timer</li>
                    <li><Ban size={14} /> Copy/paste is disabled during the quiz</li>
                    <li><Eye size={14} /> Tab switches are tracked and recorded</li>
                    <li><Shuffle size={14} /> Questions and answers are randomized</li>
                </ul>
            </div>

            {/* Start Button */}
            <button
                className="btn btn-primary btn-large"
                onClick={handleStartQuiz}
                disabled={starting || !selectedSubject}
            >
                {starting ? 'Starting...' : 'Start Battle!'}
            </button>
        </div>
    );
}
