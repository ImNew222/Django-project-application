/**
 * Interactive Tutorial — hands-on guided steps.
 * Step 1: highlights a tower in the shop → user clicks it
 * Step 2: highlights a tile on the grid → user clicks to place
 * Step 3: highlights the Start Wave button → user clicks it
 * Step 4: done! short congratulation
 *
 * The tutorial communicates with TowerDefensePage via callbacks.
 */
import { ChevronRight, X } from 'lucide-react';

const STEPS = [
    {
        id: 'buy_tower',
        title: 'Step 1: Buy a Tower',
        text: 'Click the "if/else" tower in the shop below to select it.',
        arrow: 'down',
        highlightTarget: 'shop',
    },
    {
        id: 'place_tower',
        title: 'Step 2: Place Your Tower',
        text: 'Now click the GREEN highlighted tile on the grid to place it next to the path.',
        arrow: 'center',
        highlightTarget: 'grid',
    },
    {
        id: 'start_wave',
        title: 'Step 3: Start the Wave!',
        text: 'Hit the START button to send the first wave of bugs!',
        arrow: 'down',
        highlightTarget: 'start',
    },
    {
        id: 'done',
        title: 'You\'re Ready! 🎉',
        text: 'Your tower will auto-fire at bugs. Buy more towers, upgrade them by clicking, and survive 15 waves. Bosses appear every 5th wave!',
        arrow: 'none',
        highlightTarget: null,
    },
];

export default function Tutorial({ step, onSkip }) {
    const current = STEPS[step] || STEPS[0];
    const isDone = step >= STEPS.length - 1;

    // Position tooltip based on what we're highlighting
    let tooltipPosition = {};
    if (current.arrow === 'down') {
        tooltipPosition = { bottom: '160px', left: '50%', transform: 'translateX(-50%)' };
    } else if (current.arrow === 'center') {
        tooltipPosition = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    } else {
        tooltipPosition = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    return (
        <div className="td-tutorial-overlay-v2">
            <div className="td-tutorial-tooltip" style={tooltipPosition}>
                <div className="td-tutorial-step-badge">
                    {isDone ? '✓' : `${step + 1}/${STEPS.length}`}
                </div>
                <h3 className="td-tutorial-title-v2">{current.title}</h3>
                <p className="td-tutorial-text-v2">{current.text}</p>

                {/* Progress dots */}
                <div className="td-tutorial-dots-v2">
                    {STEPS.map((_, i) => (
                        <span
                            key={i}
                            className={`td-tutorial-dot-v2 ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                        />
                    ))}
                </div>

                {isDone && (
                    <button className="td-tutorial-done-btn" onClick={onSkip}>
                        LET'S GO! <ChevronRight size={16} />
                    </button>
                )}

                <button className="td-tutorial-skip-v2" onClick={onSkip}>
                    {isDone ? '' : 'Skip tutorial'}
                </button>
            </div>

            {/* Pointer arrow for shop */}
            {current.arrow === 'down' && (
                <div className="td-tutorial-arrow-down" />
            )}
        </div>
    );
}
