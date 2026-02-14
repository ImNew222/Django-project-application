import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { quizAPI } from '../api/client';
import { AlertTriangle, CheckCircle, XCircle, Flag, ArrowRight } from 'lucide-react';

export default function QuizPlayPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const quizData = location.state;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);
    const [isAnswered, setIsAnswered] = useState(false);
    const [answerResult, setAnswerResult] = useState(null);
    const [score, setScore] = useState(0);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const tabSwitchRef = useRef(0);
    const questionStartTime = useRef(Date.now());

    // Redirect if no quiz data
    useEffect(() => {
        if (!quizData) {
            navigate('/quiz');
        }
    }, [quizData, navigate]);

    const questions = quizData?.questions || [];
    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;

    // === ANTI-CHEAT: Tab switch detection ===
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabSwitchRef.current += 1;
                setTabSwitches(tabSwitchRef.current);
                // Report to server
                quizAPI.reportTabSwitch(quizData?.session_id).catch(() => { });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [quizData?.session_id]);

    // === ANTI-CHEAT: Disable copy/paste ===
    useEffect(() => {
        const preventCopyPaste = (e) => {
            e.preventDefault();
            return false;
        };

        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);

        // Disable right-click
        const preventContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', preventContextMenu);

        return () => {
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
            document.removeEventListener('contextmenu', preventContextMenu);
        };
    }, []);

    // === Timer countdown ===
    const handleSubmitAnswer = useCallback(async (answer) => {
        if (isAnswered || submitting) return;
        setSubmitting(true);
        setIsAnswered(true);

        const timeSpent = (Date.now() - questionStartTime.current) / 1000;

        try {
            const res = await quizAPI.submitAnswer({
                session_id: quizData.session_id,
                question_id: currentQuestion.id,
                selected_answer: answer || '',
                time_spent: Math.min(timeSpent, 30),
            });

            setAnswerResult(res.data);
            setScore(res.data.current_score);
        } catch (err) {
            console.error('Error submitting answer:', err);
        } finally {
            setSubmitting(false);
        }
    }, [isAnswered, submitting, quizData?.session_id, currentQuestion?.id]);

    useEffect(() => {
        if (isAnswered) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmitAnswer(''); // Time's up — auto-submit empty
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentIndex, isAnswered, handleSubmitAnswer]);

    // === Handle answer selection ===
    const handleSelectAnswer = (key) => {
        if (isAnswered) return;
        setSelectedAnswer(key);
        handleSubmitAnswer(key);
    };

    // === Move to next question or finish ===
    const handleNext = async () => {
        if (isLastQuestion) {
            // Complete the quiz
            try {
                const res = await quizAPI.completeQuiz(quizData.session_id, {
                    tab_switches: tabSwitchRef.current,
                });
                navigate('/quiz/results', { state: res.data });
            } catch (err) {
                console.error('Error completing quiz:', err);
            }
        } else {
            // Next question
            setCurrentIndex((prev) => prev + 1);
            setSelectedAnswer('');
            setIsAnswered(false);
            setAnswerResult(null);
            setTimeLeft(30);
            questionStartTime.current = Date.now();
        }
    };

    if (!quizData || !currentQuestion) {
        return <div className="loading">Loading quiz...</div>;
    }

    const timerClass = timeLeft <= 5 ? 'timer-critical' : timeLeft <= 10 ? 'timer-warning' : '';

    return (
        <div className="quiz-play-page" onCopy={(e) => e.preventDefault()}>
            {/* Quiz Header */}
            <div className="quiz-header">
                <div className="quiz-info">
                    <span className="quiz-subject">{quizData.subject}</span>
                    <span className={`badge badge-${quizData.difficulty}`}>{quizData.difficulty}</span>
                </div>
                <div className="quiz-progress">
                    Question {currentIndex + 1} / {questions.length}
                </div>
                <div className="quiz-score">Score: {score}</div>
            </div>

            {/* Timer */}
            <div className={`timer ${timerClass}`}>
                <div className="timer-bar" style={{ width: `${(timeLeft / 30) * 100}%` }}></div>
                <span className="timer-text">{timeLeft}s</span>
            </div>

            {/* Tab Switch Warning */}
            {tabSwitches > 0 && (
                <div className="tab-warning">
                    <AlertTriangle size={16} /> Tab switches detected: {tabSwitches}
                </div>
            )}

            {/* Question */}
            <div className="question-card">
                <h2 className="question-text">{currentQuestion.text}</h2>

                <div className="choices-grid">
                    {currentQuestion.choices.map((choice) => {
                        let choiceClass = 'choice-btn';

                        if (isAnswered) {
                            if (choice.key === answerResult?.correct_answer) {
                                choiceClass += ' correct';
                            } else if (choice.key === selectedAnswer && !answerResult?.is_correct) {
                                choiceClass += ' wrong';
                            }
                        } else if (choice.key === selectedAnswer) {
                            choiceClass += ' selected';
                        }

                        return (
                            <button
                                key={choice.key}
                                className={choiceClass}
                                onClick={() => handleSelectAnswer(choice.key)}
                                disabled={isAnswered}
                            >
                                <span className="choice-key">{choice.key}</span>
                                <span className="choice-text">{choice.text}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Answer Feedback */}
            {isAnswered && (
                <div className={`answer-feedback ${answerResult?.is_correct ? 'correct' : 'wrong'}`}>
                    {answerResult?.is_correct ? <><CheckCircle size={16} /> Correct!</> : <><XCircle size={16} /> Wrong! The answer was {answerResult?.correct_answer}</>}
                </div>
            )}

            {/* Next Button */}
            {isAnswered && (
                <button className="btn btn-primary btn-large" onClick={handleNext}>
                    {isLastQuestion ? <><Flag size={16} /> See Results</> : <>Next Question <ArrowRight size={16} /></>}
                </button>
            )}
        </div>
    );
}
