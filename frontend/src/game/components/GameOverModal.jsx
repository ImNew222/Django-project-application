/**
 * Game Over / Victory Modal — white theme version.
 */
import { useState } from 'react';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { compilerAPI } from '../../api/client';

export default function GameOverModal({ gameState, onRestart }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isVictory = gameState.wave >= gameState.totalWaves && gameState.hp > 0;

    const handleSubmit = async () => {
        if (submitted || submitting || !user) return;
        setSubmitting(true);
        try {
            await compilerAPI.submitTDScore({
                score: gameState.score,
                waves_survived: gameState.wave,
                enemies_killed: gameState.totalEnemiesKilled,
            });
            setSubmitted(true);
        } catch (e) {
            console.error('Failed to submit score:', e);
        }
        setSubmitting(false);
    };

    return (
        <div className="td-gameover-overlay-v2">
            <div className="td-gameover-card-v2">
                <div className="td-gameover-icon-v2">
                    {isVictory ? '🏆' : '💀'}
                </div>

                <h2 className="td-gameover-title-v2">
                    {isVictory ? '> SYSTEM SECURED' : '> SERVER CRASHED'}
                </h2>

                <p className="td-gameover-subtitle-v2">
                    {isVictory
                        ? 'All threats neutralized. Your code held strong!'
                        : 'The bugs overwhelmed your defenses...'}
                </p>

                <div className="td-gameover-stats-v2">
                    <div className="td-gameover-stat-v2">
                        <span>SCORE</span>
                        <strong>{gameState.score}</strong>
                    </div>
                    <div className="td-gameover-stat-v2">
                        <span>WAVES</span>
                        <strong>{gameState.wave}</strong>
                    </div>
                    <div className="td-gameover-stat-v2">
                        <span>KILLED</span>
                        <strong>{gameState.totalEnemiesKilled}</strong>
                    </div>
                </div>

                <div className="td-gameover-actions-v2">
                    {user && !submitted && (
                        <button
                            className="td-gameover-btn-v2 submit"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            <Trophy size={16} />
                            {submitting ? 'SUBMITTING...' : 'SUBMIT SCORE'}
                        </button>
                    )}
                    {submitted && (
                        <div className="td-gameover-submitted-v2">
                            ✓ Score submitted!
                        </div>
                    )}
                    <button className="td-gameover-btn-v2 restart" onClick={onRestart}>
                        <RotateCcw size={16} />
                        PLAY AGAIN
                    </button>
                    <button className="td-gameover-btn-v2 home" onClick={() => navigate('/')}>
                        <Home size={16} />
                        BACK TO HOME
                    </button>
                </div>
            </div>
        </div>
    );
}
