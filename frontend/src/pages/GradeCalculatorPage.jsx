import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Plus, X, ChevronDown, ChevronUp, Award, Camera, Info, Copy, Trash2, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import OCRScoreUploader from '../components/OCRScoreUploader';
import {
    PH_GRADE_SCALE,
    GRADE_TEMPLATES,
    calculateCategoryGrade,
    calculatePeriodGrade,
    calculateGWA,
    getSubjectSummary,
    createSubject,
    createCategory,
    createScore,
    validateCategoryWeights,
    validatePeriodWeights,
} from '../utils/gradeCalculator';

const STORAGE_KEY = 'gradeCalcSubjects';

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function loadSavedSubjects() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* ignore corrupt data */ }
    return null;
}

export default function GradeCalculatorPage() {
    const [subjects, setSubjects] = useState(() => {
        return loadSavedSubjects() || [createSubject('', 3, 'standard')];
    });
    const [expandedSubjects, setExpandedSubjects] = useState([0]);
    const [activePeriods, setActivePeriods] = useState({});
    const [showTemplateModal, setShowTemplateModal] = useState(null);
    const [showGradeScale, setShowGradeScale] = useState(false);
    const [ocrTarget, setOcrTarget] = useState(null);

    // Auto-save to localStorage on every change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
        } catch { /* quota exceeded, ignore */ }
    }, [subjects]);

    const toggleSubject = (index) => {
        setExpandedSubjects(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const addSubject = () => {
        setSubjects([...subjects, createSubject('', 3, 'standard')]);
        setExpandedSubjects([...expandedSubjects, subjects.length]);
    };

    const removeSubject = (index) => {
        setSubjects(subjects.filter((_, i) => i !== index));
        setExpandedSubjects(expandedSubjects.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    };

    const clearAllData = () => {
        if (window.confirm('Clear all subjects and scores? This cannot be undone.')) {
            const fresh = [createSubject('', 3, 'standard')];
            setSubjects(fresh);
            setExpandedSubjects([0]);
            setActivePeriods({});
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const updateSubject = (index, field, value) => {
        const updated = deepClone(subjects);
        updated[index][field] = value;
        setSubjects(updated);
    };

    const updatePeriodWeight = (subjectIndex, period, value) => {
        const updated = deepClone(subjects);
        updated[subjectIndex].periodWeights[period] = parseFloat(value) || 0;
        setSubjects(updated);
    };

    const addCategory = (subjectIndex, periodName) => {
        const updated = deepClone(subjects);
        const period = updated[subjectIndex].periods[periodName];
        period.categories.push(createCategory('', 0));
        setSubjects(updated);
    };

    const removeCategory = (subjectIndex, periodName, categoryIndex) => {
        const updated = deepClone(subjects);
        const period = updated[subjectIndex].periods[periodName];
        period.categories = period.categories.filter((_, i) => i !== categoryIndex);
        setSubjects(updated);
    };

    const updateCategory = (subjectIndex, periodName, categoryIndex, field, value) => {
        const updated = deepClone(subjects);
        const category = updated[subjectIndex].periods[periodName].categories[categoryIndex];
        category[field] = field === 'weight' ? (parseFloat(value) || 0) : value;
        setSubjects(updated);
    };

    const toggleDirectPercentage = (subjectIndex, periodName, categoryIndex) => {
        const updated = deepClone(subjects);
        const category = updated[subjectIndex].periods[periodName].categories[categoryIndex];
        category.useDirectPercentage = !category.useDirectPercentage;
        if (!category.directPercentage) category.directPercentage = '';
        setSubjects(updated);
    };

    const updateDirectPercentage = (subjectIndex, periodName, categoryIndex, value) => {
        const updated = deepClone(subjects);
        const category = updated[subjectIndex].periods[periodName].categories[categoryIndex];
        category.directPercentage = value;
        setSubjects(updated);
    };

    const addScore = (subjectIndex, periodName, categoryIndex) => {
        const updated = deepClone(subjects);
        const category = updated[subjectIndex].periods[periodName].categories[categoryIndex];
        category.scores.push(createScore());
        setSubjects(updated);
    };

    const removeScore = (subjectIndex, periodName, categoryIndex, scoreIndex) => {
        const updated = deepClone(subjects);
        const category = updated[subjectIndex].periods[periodName].categories[categoryIndex];
        category.scores = category.scores.filter((_, i) => i !== scoreIndex);
        setSubjects(updated);
    };

    const updateScore = (subjectIndex, periodName, categoryIndex, scoreIndex, field, value) => {
        const updated = deepClone(subjects);
        const cat = updated[subjectIndex]?.periods?.[periodName]?.categories?.[categoryIndex];
        if (!cat || !cat.scores?.[scoreIndex]) return;
        cat.scores[scoreIndex][field] = value;
        setSubjects(updated);
    };

    const applyTemplate = (subjectIndex, periodName, templateId) => {
        const template = GRADE_TEMPLATES[templateId];
        if (!template) return;

        const updated = deepClone(subjects);
        const period = updated[subjectIndex].periods[periodName];
        period.categories = template.categories.map(cat => ({
            ...createCategory(cat.name, cat.weight),
            scores: [createScore()],
        }));
        setSubjects(updated);
        setShowTemplateModal(null);
    };

    const getActivePeriod = (subjectIndex) => {
        return activePeriods[subjectIndex] || 'prelim';
    };

    const setActivePeriod = (subjectIndex, period) => {
        setActivePeriods({ ...activePeriods, [subjectIndex]: period });
    };

    // Safe OCR handler — validates indices before applying
    const handleOcrScoreDetected = useCallback((detectedScore) => {
        if (!ocrTarget) return;
        const { subjectIdx, period, categoryIdx, scoreIdx } = ocrTarget;

        // Bounds check
        const subject = subjects[subjectIdx];
        if (!subject) { setOcrTarget(null); return; }
        const periodData = subject.periods?.[period];
        if (!periodData) { setOcrTarget(null); return; }
        const category = periodData.categories?.[categoryIdx];
        if (!category) { setOcrTarget(null); return; }
        if (!category.scores?.[scoreIdx]) { setOcrTarget(null); return; }

        const [earned, total] = String(detectedScore).includes('/')
            ? String(detectedScore).split('/').map(n => n.trim())
            : [detectedScore, '100'];

        const updated = deepClone(subjects);
        updated[subjectIdx].periods[period].categories[categoryIdx].scores[scoreIdx].earned = earned;
        updated[subjectIdx].periods[period].categories[categoryIdx].scores[scoreIdx].total = total;
        setSubjects(updated);
        setOcrTarget(null);
    }, [ocrTarget, subjects]);

    const gwa = calculateGWA(subjects);
    const completeSubjects = subjects.filter(s => getSubjectSummary(s).complete);

    return (
        <div className="grade-page">
            <h1><BarChart3 size={28} /> Grade Calculator</h1>
            <p className="grade-subtitle">Philippine College Grading System (1.0 - 5.0 scale)</p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowGradeScale(!showGradeScale)}>
                    <Info size={14} /> {showGradeScale ? 'Hide' : 'Show'} Grading Scale
                </button>
                <button className="btn btn-secondary btn-sm" onClick={clearAllData} style={{ color: '#c62828' }}>
                    <Trash2 size={14} /> Clear All Data
                </button>
            </div>

            {showGradeScale && (
                <div className="grade-scale-table" style={{ marginBottom: '1.5rem' }}>
                    <table className="teacher-table">
                        <thead>
                            <tr>
                                <th>Percentage</th>
                                <th>Grade</th>
                                <th>Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PH_GRADE_SCALE.map((s, i) => (
                                <tr key={i}>
                                    <td>{s.min}% – {s.max.toFixed(2)}%</td>
                                    <td><strong style={{ color: s.grade <= 1.25 ? '#0a7e07' : s.grade <= 1.75 ? '#2e7d32' : s.grade <= 2.25 ? '#1565c0' : s.grade <= 2.75 ? '#e65100' : s.grade <= 3.0 ? '#f57f17' : '#c62828' }}>{s.grade.toFixed(2)}</strong></td>
                                    <td>{s.label}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="advanced-grade-subjects">
                {subjects.map((subject, subjectIdx) => {
                    const isExpanded = expandedSubjects.includes(subjectIdx);
                    const activePeriod = getActivePeriod(subjectIdx);
                    const period = subject.periods[activePeriod];
                    const summary = getSubjectSummary(subject);
                    const categoryWeights = validateCategoryWeights(period.categories);
                    const periodWeights = validatePeriodWeights(subject.periodWeights);

                    return (
                        <div key={subject.id} className="advanced-grade-card">
                            <div className="advanced-grade-header" onClick={() => toggleSubject(subjectIdx)}>
                                <div className="advanced-grade-title">
                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); toggleSubject(subjectIdx); }}>
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="Subject name (e.g., Math 101)"
                                        value={subject.name}
                                        onChange={(e) => { e.stopPropagation(); updateSubject(subjectIdx, 'name', e.target.value); }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="subject-name-input"
                                    />
                                    <div className="subject-units">
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.5"
                                            value={subject.units}
                                            onChange={(e) => { e.stopPropagation(); updateSubject(subjectIdx, 'units', e.target.value); }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span>units</span>
                                    </div>
                                </div>
                                <div className="advanced-grade-summary">
                                    {summary.complete ? (
                                        <>
                                            <span className="grade-badge" style={{ background: summary.numericalGrade <= 1.75 ? '#0a7e07' : summary.numericalGrade <= 2.5 ? '#1565c0' : summary.numericalGrade <= 3.0 ? '#f57f17' : '#c62828' }}>
                                                {summary.numericalGrade.toFixed(2)}
                                            </span>
                                            <span className="grade-percentage">{summary.percentage.toFixed(1)}%</span>
                                        </>
                                    ) : (
                                        <span className="grade-incomplete">Incomplete</span>
                                    )}
                                    {subjects.length > 1 && (
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); removeSubject(subjectIdx); }} title="Remove subject">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="advanced-grade-body">
                                    <div className="period-tabs">
                                        {['prelim', 'midterm', 'prefinal', 'final'].map(p => {
                                            const pGrade = calculatePeriodGrade(subject.periods[p].categories);
                                            return (
                                                <button
                                                    key={p}
                                                    className={`period-tab ${activePeriod === p ? 'active' : ''}`}
                                                    onClick={() => setActivePeriod(subjectIdx, p)}
                                                >
                                                    <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                                    {pGrade != null && <span className="period-grade">{pGrade.toFixed(1)}%</span>}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="period-settings">
                                        <div className="period-weight-grid">
                                            <label>Period Weights:</label>
                                            {['prelim', 'midterm', 'prefinal', 'final'].map(p => (
                                                <div key={p} className="period-weight-field">
                                                    <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={subject.periodWeights[p]}
                                                        onChange={(e) => updatePeriodWeight(subjectIdx, p, e.target.value)}
                                                    />
                                                    <span>%</span>
                                                </div>
                                            ))}
                                            <div className="period-weight-total">
                                                Total: <strong style={{ color: periodWeights.valid ? '#0a0' : '#c00' }}>{periodWeights.total}%</strong>
                                                {!periodWeights.valid && <span className="weight-warn">Must be 100%</span>}
                                            </div>
                                        </div>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplateModal({ subjectIdx, periodName: activePeriod })}>
                                            <Copy size={14} /> Load Template
                                        </button>
                                    </div>

                                    <div className="categories-section">
                                        <div className="categories-header">
                                            <h4>Components ({categoryWeights.total}% total)</h4>
                                            <button className="btn btn-primary btn-sm" onClick={() => addCategory(subjectIdx, activePeriod)}>
                                                <Plus size={14} /> Add Component
                                            </button>
                                        </div>

                                        {period.categories.map((category, catIdx) => {
                                            const { average, weighted } = calculateCategoryGrade(category);
                                            const isDirectPct = category.useDirectPercentage;
                                            return (
                                                <div key={category.id} className="category-card">
                                                    <div className="category-header">
                                                        <input
                                                            type="text"
                                                            placeholder="Component name (e.g., Quizzes)"
                                                            value={category.name}
                                                            onChange={(e) => updateCategory(subjectIdx, activePeriod, catIdx, 'name', e.target.value)}
                                                            className="category-name-input"
                                                        />
                                                        <div className="category-weight">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={category.weight}
                                                                onChange={(e) => updateCategory(subjectIdx, activePeriod, catIdx, 'weight', e.target.value)}
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                        {average != null && (
                                                            <div className="category-result">
                                                                {average.toFixed(1)}% × {category.weight}% = <strong>{weighted.toFixed(2)}</strong>
                                                            </div>
                                                        )}
                                                        <button
                                                            className="btn-icon"
                                                            onClick={() => toggleDirectPercentage(subjectIdx, activePeriod, catIdx)}
                                                            title={isDirectPct ? 'Switch to individual scores' : 'Switch to direct percentage'}
                                                            style={{ color: isDirectPct ? '#1565c0' : undefined }}
                                                        >
                                                            {isDirectPct ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                        </button>
                                                        {period.categories.length > 1 && (
                                                            <button className="btn-icon" onClick={() => removeCategory(subjectIdx, activePeriod, catIdx)} title="Remove component">
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {isDirectPct ? (
                                                        <div className="direct-pct-input" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <label style={{ fontSize: '0.85rem', opacity: 0.7 }}>Enter percentage directly:</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                                placeholder="e.g. 85"
                                                                value={category.directPercentage || ''}
                                                                onChange={(e) => updateDirectPercentage(subjectIdx, activePeriod, catIdx, e.target.value)}
                                                                style={{ width: '100px' }}
                                                            />
                                                            <span style={{ fontSize: '0.85rem' }}>%</span>
                                                        </div>
                                                    ) : (
                                                        <div className="scores-table">
                                                            <div className="scores-header">
                                                                <span>Activity</span>
                                                                <span>Score</span>
                                                                <span>%</span>
                                                                <span></span>
                                                            </div>
                                                            {category.scores.map((score, scoreIdx) => {
                                                                const pct = score.total > 0 ? ((parseFloat(score.earned) || 0) / (parseFloat(score.total) || 1)) * 100 : null;
                                                                return (
                                                                    <div key={score.id} className="score-row">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Activity name"
                                                                            value={score.name}
                                                                            onChange={(e) => updateScore(subjectIdx, activePeriod, catIdx, scoreIdx, 'name', e.target.value)}
                                                                        />
                                                                        <div className="score-input-group">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                placeholder="0"
                                                                                value={score.earned}
                                                                                onChange={(e) => updateScore(subjectIdx, activePeriod, catIdx, scoreIdx, 'earned', e.target.value)}
                                                                            />
                                                                            <span>/</span>
                                                                            <input
                                                                                type="number"
                                                                                min="1"
                                                                                placeholder="100"
                                                                                value={score.total}
                                                                                onChange={(e) => updateScore(subjectIdx, activePeriod, catIdx, scoreIdx, 'total', e.target.value)}
                                                                            />
                                                                            <button
                                                                                className="btn-icon ocr-trigger"
                                                                                title="Scan score from image"
                                                                                onClick={() => setOcrTarget({ subjectIdx, period: activePeriod, categoryIdx: catIdx, scoreIdx })}
                                                                            >
                                                                                <Camera size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <span className="score-percentage">
                                                                            {pct != null ? `${pct.toFixed(1)}%` : '—'}
                                                                        </span>
                                                                        <button className="btn-icon" onClick={() => removeScore(subjectIdx, activePeriod, catIdx, scoreIdx)} title="Remove score">
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                            <button className="btn btn-secondary btn-sm" onClick={() => addScore(subjectIdx, activePeriod, catIdx)} style={{ marginTop: '0.5rem' }}>
                                                                <Plus size={12} /> Add Score
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {!categoryWeights.valid && (
                                            <div className="weight-warning">
                                                ⚠️ Component weights must total 100% (currently {categoryWeights.total}%)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <button className="btn btn-primary" onClick={addSubject} style={{ marginTop: '1rem' }}>
                    <Plus size={16} /> Add Subject
                </button>
            </div>

            {gwa != null && (
                <div className="grade-gwa-card">
                    <h2><Award size={24} /> General Weighted Average (GWA)</h2>
                    <div className="gwa-display">
                        <span className="gwa-number" style={{ color: gwa <= 1.25 ? '#0a7e07' : gwa <= 1.75 ? '#2e7d32' : gwa <= 2.25 ? '#1565c0' : gwa <= 2.75 ? '#e65100' : gwa <= 3.0 ? '#f57f17' : '#c62828' }}>
                            {gwa.toFixed(2)}
                        </span>
                        <span className="gwa-remark">
                            {gwa <= 1.25 ? "Dean's Lister!" : gwa <= 1.75 ? 'Excellent!' : gwa <= 2.25 ? 'Very Good' : gwa <= 2.75 ? 'Good' : gwa <= 3.0 ? 'Passing' : 'Needs Improvement'}
                        </span>
                    </div>
                    <p className="gwa-info">Based on {completeSubjects.length} complete subject{completeSubjects.length > 1 ? 's' : ''}</p>
                    {gwa <= 1.75 && (
                        <div className="gwa-alert">
                            <Award size={16} /> Congratulations! You may qualify for the Dean's List!
                        </div>
                    )}
                </div>
            )}

            {showTemplateModal && (
                <div className="ocr-overlay" onClick={() => setShowTemplateModal(null)}>
                    <div className="template-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="template-modal-header">
                            <h3>Choose Template</h3>
                            <button className="btn-icon" onClick={() => setShowTemplateModal(null)}><X size={20} /></button>
                        </div>
                        <div className="template-modal-body">
                            {Object.values(GRADE_TEMPLATES).map(template => (
                                <div
                                    key={template.id}
                                    className="template-card"
                                    onClick={() => applyTemplate(showTemplateModal.subjectIdx, showTemplateModal.periodName, template.id)}
                                >
                                    <h4>{template.name}</h4>
                                    <p>{template.description}</p>
                                    <div className="template-categories">
                                        {template.categories.map((cat, i) => (
                                            <span key={i} className="template-category-chip">{cat.name} ({cat.weight}%)</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {ocrTarget && (
                <OCRScoreUploader
                    subjectName={`${subjects[ocrTarget.subjectIdx]?.name || 'Subject'} — ${ocrTarget.period.charAt(0).toUpperCase() + ocrTarget.period.slice(1)}`}
                    onScoreDetected={handleOcrScoreDetected}
                    onClose={() => setOcrTarget(null)}
                />
            )}
        </div>
    );
}
