import { useLocation, useNavigate, Link } from 'react-router-dom';
import { PartyPopper, Frown, Flame, HeartCrack, AlertTriangle, CheckCircle, XCircle, Swords, Trophy, Home } from 'lucide-react';

export default function QuizResultsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const resultData = location.state;

    if (!resultData) {
        navigate('/quiz');
        return null;
    }

    const { session, points_earned, new_rank_points, streak } = resultData;
    const isPassing = session.percentage >= 70;

    return (
        <div className="quiz-results-page">
            {/* Result Header */}
            <div className={`result-header ${isPassing ? 'pass' : 'fail'}`}>
                <div className="result-emoji">{isPassing ? <PartyPopper size={48} /> : <Frown size={48} />}</div>
                <h1>{isPassing ? 'Great Job!' : 'Keep Trying!'}</h1>
                <p className="result-score">
                    {session.score} / {session.total_questions}
                </p>
                <p className="result-percentage">{session.percentage}%</p>
            </div>

            {/* Stats */}
            <div className="result-stats">
                <div className="result-stat">
                    <span className="stat-label">Points Earned</span>
                    <span className="stat-value">+{points_earned}</span>
                </div>
                <div className="result-stat">
                    <span className="stat-label">Total Rank Points</span>
                    <span className="stat-value">{new_rank_points}</span>
                </div>
                <div className="result-stat">
                    <span className="stat-label">Streak</span>
                    <span className="stat-value">{streak > 0 ? <><Flame size={16} /> {streak}</> : <><HeartCrack size={16} /> 0</>}</span>
                </div>
                <div className="result-stat">
                    <span className="stat-label">Difficulty</span>
                    <span className={`badge badge-${session.difficulty}`}>{session.difficulty}</span>
                </div>
                {session.tab_switches > 0 && (
                    <div className="result-stat warning">
                        <span className="stat-label"><AlertTriangle size={14} /> Tab Switches</span>
                        <span className="stat-value">{session.tab_switches}</span>
                    </div>
                )}
            </div>

            {/* Answer Review */}
            {session.answers && session.answers.length > 0 && (
                <div className="section">
                    <h2>Answer Review</h2>
                    <div className="answer-review">
                        {session.answers.map((answer, index) => (
                            <div
                                key={index}
                                className={`review-item ${answer.is_correct ? 'correct' : 'wrong'}`}
                            >
                                <div className="review-number">{index + 1}</div>
                                <div className="review-content">
                                    <p className="review-question">{answer.question.text}</p>
                                    <p className="review-answer">
                                        Your answer: <strong>{answer.selected_answer || '(no answer)'}</strong>
                                        {!answer.is_correct && (
                                            <span className="correct-label">
                                                {' '}| Correct: <strong>{answer.question.correct_answer}</strong>
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="review-icon">
                                    {answer.is_correct ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="result-actions">
                <Link to="/quiz" className="btn btn-primary"><Swords size={16} /> Play Again</Link>
                <Link to="/leaderboard" className="btn btn-secondary"><Trophy size={16} /> Leaderboard</Link>
                <Link to="/" className="btn btn-secondary"><Home size={16} /> Dashboard</Link>
            </div>
        </div>
    );
}
