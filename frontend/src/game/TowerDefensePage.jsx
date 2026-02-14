/**
 * Tower Defense Page — main entry point.
 * 
 * PERFORMANCE: Game state lives in a ref (gameRef). The game loop runs inside
 * Three.js's useFrame, not a separate rAF. React only re-renders for UI
 * updates (HP, gold, score, phase) at ~4 Hz instead of 60 Hz.
 *
 * Tutorial state machine:
 *   step 0: "Buy if/else tower" — shop highlights, user clicks if/else
 *   step 1: "Place it here" — grid tile pulses green, user clicks tile
 *   step 2: "Start wave" — start button glows, user clicks start
 *   step 3: "Done!" — brief congrats, auto-dismiss
 *   null: tutorial inactive
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GameCanvas from './components/GameCanvas';
import GameUI from './components/GameUI';
import Tutorial from './components/Tutorial';
import GameOverModal from './components/GameOverModal';
import {
    createGameState,
    startWave,
    tick,
    placeTower,
    doUpgradeTower,
    sellTower,
    resetGame,
} from './engine/gameState';
import { Play, ArrowLeft } from 'lucide-react';

const TUTORIAL_TILE = { x: 4, z: 3 };

export default function TowerDefensePage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // ── UI state (React renders) ─────────────────────────
    const [uiState, setUiState] = useState({
        hp: 20, maxHp: 20, gold: 100, score: 0,
        wave: 0, totalWaves: 15, phase: 'menu', speed: 1,
        enemyCount: 0, towerCount: 0,
    });
    const [selectedTower, setSelectedTower] = useState(null);
    const [placingTower, setPlacingTower] = useState(null);
    const [tutorialStep, setTutorialStep] = useState(null);

    // ── Game state (ref — no React re-renders) ───────────
    const gameRef = useRef(createGameState());

    // Sync UI from ref at low frequency (called by GameCanvas)
    const syncUI = useCallback(() => {
        const s = gameRef.current;
        setUiState(prev => {
            if (
                prev.hp === s.hp && prev.gold === s.gold && prev.score === s.score &&
                prev.wave === s.wave && prev.phase === s.phase && prev.speed === s.speed &&
                prev.enemyCount === s.enemies.length && prev.towerCount === s.towers.length
            ) return prev; // No change — skip re-render
            return {
                hp: s.hp, maxHp: s.maxHp, gold: s.gold, score: s.score,
                wave: s.wave, totalWaves: s.totalWaves, phase: s.phase, speed: s.speed,
                enemyCount: s.enemies.length, towerCount: s.towers.length,
            };
        });
    }, []);

    // ── Tutorial logic ──────────────────────────────────
    const advanceTutorial = useCallback((fromStep) => {
        if (fromStep === 3) {
            localStorage.setItem('td_tutorial_done', 'true');
            setTutorialStep(null);
        } else {
            setTutorialStep(fromStep + 1);
        }
    }, []);

    const skipTutorial = useCallback(() => {
        localStorage.setItem('td_tutorial_done', 'true');
        setTutorialStep(null);
        setPlacingTower(null);
    }, []);

    // ── Handlers ────────────────────────────────────────
    const handleBuyTower = useCallback((typeId) => {
        if (tutorialStep === 0) {
            if (typeId === 'if_else') {
                setPlacingTower('if_else');
                advanceTutorial(0);
            }
            return;
        }
        if (placingTower === typeId) {
            setPlacingTower(null);
        } else {
            setPlacingTower(typeId);
            setSelectedTower(null);
        }
    }, [placingTower, tutorialStep, advanceTutorial]);

    const handleGridClick = useCallback((gridX, gridZ) => {
        if (tutorialStep === 1) {
            if (gridX === TUTORIAL_TILE.x && gridZ === TUTORIAL_TILE.z) {
                const result = placeTower(gameRef.current, 'if_else', gridX, gridZ);
                if (result.success) {
                    setPlacingTower(null);
                    advanceTutorial(1);
                    syncUI();
                }
            }
            return;
        }

        if (placingTower) {
            const result = placeTower(gameRef.current, placingTower, gridX, gridZ);
            if (result.success) {
                syncUI();
            }
        }
    }, [placingTower, tutorialStep, advanceTutorial, syncUI]);

    const handleTowerClick = useCallback((tower) => {
        if (placingTower || tutorialStep !== null) return;
        setSelectedTower(tower);
    }, [placingTower, tutorialStep]);

    const handleStartWave = useCallback(() => {
        if (tutorialStep === 2) {
            advanceTutorial(2);
        }
        startWave(gameRef.current);
        syncUI();
    }, [tutorialStep, advanceTutorial, syncUI]);

    const handleUpgrade = useCallback((towerId) => {
        const result = doUpgradeTower(gameRef.current, towerId);
        if (result.success) {
            const tower = gameRef.current.towers.find(t => t.id === towerId);
            setSelectedTower(tower ? { ...tower } : null);
            syncUI();
        }
    }, [syncUI]);

    const handleSell = useCallback((towerId) => {
        sellTower(gameRef.current, towerId);
        setSelectedTower(null);
        syncUI();
    }, [syncUI]);

    const handleToggleSpeed = useCallback(() => {
        gameRef.current.speed = gameRef.current.speed === 1 ? 2 : 1;
        syncUI();
    }, [syncUI]);

    const handleRestart = useCallback(() => {
        gameRef.current = resetGame();
        gameRef.current.phase = 'prep';
        setSelectedTower(null);
        setPlacingTower(null);
        setTutorialStep(null);
        syncUI();
    }, [syncUI]);

    const handleRightClick = useCallback((e) => {
        e.preventDefault();
        if (tutorialStep === null) setPlacingTower(null);
    }, [tutorialStep]);

    // ── Menu screen ─────────────────────────────────────
    if (uiState.phase === 'menu') {
        return (
            <div className="td-menu-v2">
                <div className="td-menu-content-v2">
                    <div className="td-menu-logo-v2">&lt;/&gt;</div>
                    <h1 className="td-menu-title-v2">&gt; CODE_DEFENSE</h1>
                    <p className="td-menu-subtitle-v2">
                        Protect your server from code bugs.<br />
                        Deploy code towers. Survive 15 waves.
                    </p>

                    <div className="td-menu-enemy-preview-v2">
                        <span className="td-preview-enemy-v2">0101</span>
                        <span className="td-preview-enemy-v2">{'for(;;){}'}</span>
                        <span className="td-preview-enemy-v2">null</span>
                        <span className="td-preview-enemy-v2">{"'; DROP--"}</span>
                        <span className="td-preview-enemy-v2">{'<script>'}</span>
                    </div>

                    <button
                        className="td-menu-play-v2"
                        onClick={() => {
                            gameRef.current.phase = 'prep';
                            syncUI();
                            if (!localStorage.getItem('td_tutorial_done')) {
                                setTutorialStep(0);
                            }
                        }}
                    >
                        <Play size={20} />
                        INITIALIZE DEFENSE
                    </button>

                    <button className="td-menu-back-v2" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} />
                        BACK TO HOME
                    </button>
                </div>

                <div className="td-code-rain-v2" aria-hidden="true">
                    {Array.from({ length: 20 }, (_, i) => (
                        <div
                            key={i}
                            className="td-rain-col-v2"
                            style={{
                                left: `${i * 5}%`,
                                animationDuration: `${3 + Math.random() * 4}s`,
                                animationDelay: `${Math.random() * 2}s`,
                            }}
                        >
                            {['0', '1', '{', '}', '(', ')', ';', '=', '<', '>', '/'][Math.floor(Math.random() * 11)]}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ── Main game ───────────────────────────────────────
    return (
        <div className="td-game-v2" onContextMenu={handleRightClick}>
            <GameCanvas
                gameRef={gameRef}
                syncUI={syncUI}
                selectedTower={selectedTower}
                placingTower={placingTower}
                onGridClick={handleGridClick}
                onTowerClick={handleTowerClick}
                tutorialTile={tutorialStep === 1 ? TUTORIAL_TILE : null}
            />

            <GameUI
                gameState={uiState}
                selectedTower={selectedTower}
                placingTower={placingTower}
                onBuyTower={handleBuyTower}
                onStartWave={handleStartWave}
                onUpgrade={handleUpgrade}
                onSell={handleSell}
                onToggleSpeed={handleToggleSpeed}
                onShowTutorial={() => setTutorialStep(0)}
                onDeselectTower={() => setSelectedTower(null)}
                tutorialStep={tutorialStep}
            />

            {tutorialStep !== null && (
                <Tutorial step={tutorialStep} onSkip={skipTutorial} />
            )}

            {uiState.phase === 'gameover' && (
                <GameOverModal
                    gameState={uiState}
                    onRestart={handleRestart}
                />
            )}
        </div>
    );
}
