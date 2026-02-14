import { useState, useEffect } from 'react';
import { quizAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Bot, Lock, FileText, BookOpen, Zap, Hash, Loader, Sparkles, CheckCircle } from 'lucide-react';

export default function AIQuizGeneratorPage() {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [topic, setTopic] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [difficulty, setDifficulty] = useState('beginner');
    const [numQuestions, setNumQuestions] = useState(5);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        quizAPI.getSubjects()
            .then((res) => setSubjects(res.data))
            .catch((err) => console.error('Failed to load subjects:', err));
    }, []);

    const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim() || !subjectId) return;

        setGenerating(true);
        setError('');
        setResult(null);

        try {
            const res = await quizAPI.aiGenerate({
                topic: topic.trim(),
                subject_id: parseInt(subjectId),
                difficulty,
                num_questions: numQuestions,
            });
            setResult(res.data);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to generate questions. Try again.';
            setError(msg);
        } finally {
            setGenerating(false);
        }
    };

    if (!isTeacherOrAdmin) {
        return (
            <div className="ai-gen-page">
                <h1><Bot size={28} /> AI Quiz Generator</h1>
                <div className="empty-state">
                    <p><Lock size={16} /> Only teachers and admins can generate quiz questions.</p>
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '0.5rem' }}>
                        Ask your teacher or admin to generate new questions for you!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-gen-page">
            <h1><Bot size={28} /> AI Quiz Generator</h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                Use Gemini AI to generate quiz questions from any topic. Questions are saved automatically!
            </p>

            <div className="ai-gen-card">
                <form onSubmit={handleGenerate}>
                    <div className="form-group">
                        <label><FileText size={14} /> Topic</label>
                        <input
                            type="text"
                            placeholder="e.g., Python loops, OSI model, HTML forms, Binary trees..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label><BookOpen size={14} /> Subject</label>
                            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
                                <option value="">Select subject...</option>
                                {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label><Zap size={14} /> Difficulty</label>
                            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label><Hash size={14} /> Questions</label>
                            <select value={numQuestions} onChange={(e) => setNumQuestions(parseInt(e.target.value))}>
                                {[3, 5, 7, 10].map((n) => (
                                    <option key={n} value={n}>{n} questions</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button type="submit" className="btn btn-primary btn-large" disabled={generating}>
                        {generating ? (
                            <span><Loader size={16} className="spin-icon" /> Generating with Gemini AI...</span>
                        ) : (
                            <span><Sparkles size={16} /> Generate Questions</span>
                        )}
                    </button>
                </form>
            </div>

            {/* Results */}
            {result && (
                <div className="ai-gen-results">
                    <div className="ai-gen-success">
                        <h2><CheckCircle size={20} /> {result.message}</h2>
                        <p>Subject: <strong>{result.subject}</strong> | Difficulty: <strong>{result.difficulty}</strong></p>
                    </div>

                    <div className="ai-gen-questions">
                        {result.questions.map((q, i) => (
                            <div key={q.id} className="ai-gen-question">
                                <h3>Q{i + 1}. {q.text}</h3>
                                <div className="ai-gen-choices">
                                    {['A', 'B', 'C', 'D'].map((letter) => (
                                        <div
                                            key={letter}
                                            className={`ai-choice ${letter === q.correct_answer ? 'correct' : ''}`}
                                        >
                                            <span className="choice-letter">{letter}</span>
                                            {q[`choice_${letter.toLowerCase()}`]}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn btn-primary btn-large"
                        onClick={() => { setResult(null); setTopic(''); }}
                        style={{ marginTop: '1rem' }}
                    >
                        <Sparkles size={16} /> Generate More
                    </button>
                </div>
            )}
        </div>
    );
}
