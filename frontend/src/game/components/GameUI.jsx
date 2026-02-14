/**
 * Game UI Overlay — white theme HUD, tower shop, and upgrade panel.
 */
import { TOWER_TYPES, getTowerStats } from '../engine/towers';
import { Shield, Zap, DollarSign, Play, FastForward, Crosshair, ArrowUp, Trash2, HelpCircle } from 'lucide-react';

export default function GameUI({
    gameState,
    selectedTower,
    placingTower,
    onBuyTower,
    onStartWave,
    onUpgrade,
    onSell,
    onToggleSpeed,
    onShowTutorial,
    onDeselectTower,
    tutorialStep,
}) {
    const towerTypes = Object.values(TOWER_TYPES);
    const isPrepPhase = gameState.phase === 'prep';
    const isWavePhase = gameState.phase === 'wave';

    // Tutorial highlight classes
    const isHighlightShop = tutorialStep === 0;
    const isHighlightStart = tutorialStep === 2;

    return (
        <div className="td-hud-v2">
            {/* ── Top bar ──────────────────────────────── */}
            <div className="td-topbar-v2">
                <div className="td-stat-v2">
                    <Shield size={14} />
                    <span>HP: {gameState.hp}/{gameState.maxHp}</span>
                </div>
                <div className="td-stat-v2">
                    <DollarSign size={14} />
                    <span>GOLD: {gameState.gold}</span>
                </div>
                <div className="td-stat-v2">
                    <Zap size={14} />
                    <span>SCORE: {gameState.score}</span>
                </div>
                <div className="td-stat-v2">
                    <Crosshair size={14} />
                    <span>WAVE: {gameState.wave}/{gameState.totalWaves}</span>
                </div>

                <div className="td-topbar-right-v2">
                    <button className="td-ctrl-btn" onClick={onToggleSpeed} title="Toggle speed">
                        {gameState.speed === 1 ? <Play size={14} /> : <FastForward size={14} />}
                        {gameState.speed}x
                    </button>
                    <button className="td-ctrl-btn" onClick={onShowTutorial} title="Tutorial">
                        <HelpCircle size={14} />
                    </button>
                </div>
            </div>

            {/* ── HP bar ───────────────────────────────── */}
            <div className="td-hp-bar-v2">
                <div
                    className="td-hp-fill-v2"
                    style={{ width: `${(gameState.hp / gameState.maxHp) * 100}%` }}
                />
            </div>

            {/* ── Tower shop (bottom) ──────────────────── */}
            <div className={`td-shop-v2 ${isHighlightShop ? 'td-highlight-pulse' : ''}`}>
                <div className="td-shop-label-v2">&gt; TOWER_SHOP</div>
                <div className="td-tower-list-v2">
                    {towerTypes.map(tower => {
                        const isFirst = tower.id === 'if_else';
                        const shouldHighlight = isHighlightShop && isFirst;

                        return (
                            <button
                                key={tower.id}
                                className={`td-tower-btn-v2 ${placingTower === tower.id ? 'active' : ''} ${gameState.gold < tower.cost ? 'disabled' : ''} ${shouldHighlight ? 'td-glow-highlight' : ''}`}
                                onClick={() => onBuyTower(tower.id)}
                                disabled={gameState.gold < tower.cost}
                                title={tower.description}
                            >
                                <span className="td-tower-name-v2">{tower.name}</span>
                                <span className="td-tower-code-v2">{tower.code}</span>
                                <span className="td-tower-cost-v2">${tower.cost}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Start wave button */}
                {isPrepPhase && (
                    <button
                        className={`td-start-btn-v2 ${isHighlightStart ? 'td-glow-highlight' : ''}`}
                        onClick={onStartWave}
                    >
                        <Play size={16} />
                        {gameState.wave === 0 ? '> START WAVE 1' : `> START WAVE ${gameState.wave + 1}`}
                    </button>
                )}

                {isWavePhase && (
                    <div className="td-wave-active-v2">
                        &gt; WAVE {gameState.wave} IN PROGRESS... [{gameState.enemies.filter(e => e.alive).length} bugs remaining]
                    </div>
                )}
            </div>

            {/* ── Selected tower panel ─────────────────── */}
            {selectedTower && (
                <div className="td-selected-panel-v2">
                    <div className="td-selected-header-v2">
                        <span className="td-selected-name-v2">&gt; {selectedTower.name}</span>
                        <span className="td-selected-level-v2">LVL {selectedTower.level}</span>
                    </div>
                    <div className="td-selected-code-v2">{selectedTower.code}</div>
                    <div className="td-selected-stats-v2">
                        <span>DMG: {selectedTower.damage}</span>
                        <span>RNG: {selectedTower.range.toFixed(1)}</span>
                        <span>SPD: {selectedTower.fireRate.toFixed(1)}s</span>
                    </div>
                    <div className="td-selected-actions-v2">
                        {selectedTower.level < 3 && (
                            <button
                                className="td-upgrade-btn-v2"
                                onClick={() => onUpgrade(selectedTower.id)}
                                disabled={gameState.gold < (getTowerStats(selectedTower.typeId, selectedTower.level + 1)?.upgradeCost || Infinity)}
                            >
                                <ArrowUp size={14} />
                                UPGRADE (${getTowerStats(selectedTower.typeId, selectedTower.level + 1)?.upgradeCost})
                            </button>
                        )}
                        <button className="td-sell-btn-v2" onClick={() => onSell(selectedTower.id)}>
                            <Trash2 size={14} />
                            SELL (${getTowerStats(selectedTower.typeId, selectedTower.level)?.sellValue})
                        </button>
                        <button className="td-deselect-btn-v2" onClick={onDeselectTower}>
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* ── Placing hint ─────────────────────────── */}
            {placingTower && tutorialStep === null && (
                <div className="td-placing-hint-v2">
                    &gt; Click a grid tile to place {TOWER_TYPES[placingTower]?.name} | Right-click to cancel
                </div>
            )}
        </div>
    );
}
