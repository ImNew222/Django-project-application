import { useState } from 'react';
import { compilerAPI } from '../api/client';
import { Bot, Sparkles, Clock, MemoryStick, Lightbulb, ChevronDown, ChevronUp, Loader } from 'lucide-react';

export default function AIExplanation({ challengeId, userCode, passed, language = 'Python' }) {
    const [explanation, setExplanation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(true);

    const fetchExplanation = async () => {
        if (loading) return;
        setLoading(true);
        setError('');

        try {
            const res = await compilerAPI.getExplanation({
                challenge_id: challengeId,
                user_code: userCode,
                passed,
                language,
            });
            setExplanation(res.data.explanation);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to get explanation. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!explanation && !loading) {
        return (
            <button className="ai-explain-trigger" onClick={fetchExplanation} disabled={loading}>
                <Bot size={16} />
                <span>🤖 Get AI Explanation</span>
                <Sparkles size={14} />
            </button>
        );
    }

    if (loading) {
        return (
            <div className="ai-explain-loading">
                <Loader size={20} className="spin" />
                <span>AI is analyzing your code...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-explain-error">
                <span>{error}</span>
                <button onClick={fetchExplanation}>Retry</button>
            </div>
        );
    }

    return (
        <div className="ai-explain-panel">
            <div className="ai-explain-header" onClick={() => setExpanded(!expanded)}>
                <h4><Bot size={18} /> AI Explanation</h4>
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {expanded && explanation && (
                <div className="ai-explain-body">
                    {/* Approach */}
                    <div className="ai-section">
                        <h5><Lightbulb size={14} /> Approach</h5>
                        <p>{explanation.approach}</p>
                    </div>

                    {/* Complexity */}
                    {explanation.complexity && (
                        <div className="ai-section">
                            <h5><Clock size={14} /> Complexity</h5>
                            <div className="ai-complexity">
                                <span><strong>Time:</strong> {explanation.complexity.time}</span>
                                <span><strong>Space:</strong> {explanation.complexity.space}</span>
                            </div>
                        </div>
                    )}

                    {/* Student Feedback */}
                    <div className="ai-section">
                        <h5>📝 Feedback</h5>
                        <p>{explanation.student_feedback}</p>
                    </div>

                    {/* Optimal Solution */}
                    {explanation.optimal_solution && (
                        <div className="ai-section">
                            <h5>✨ Optimal Solution</h5>
                            <pre className="ai-code-block">
                                <code>{explanation.optimal_solution}</code>
                            </pre>
                        </div>
                    )}

                    {/* Tips */}
                    {explanation.tips && explanation.tips.length > 0 && (
                        <div className="ai-section">
                            <h5>💡 Tips</h5>
                            <ul className="ai-tips">
                                {explanation.tips.map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
