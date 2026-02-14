// Grade calculation utilities and templates for Philippine college grading system

// Tolerance for floating-point weight comparisons
const WEIGHT_TOLERANCE = 0.01;
function weightsEqual100(total) {
    return Math.abs(total - 100) <= WEIGHT_TOLERANCE;
}

// Philippine grading scale (1.0 - 5.0)
export const PH_GRADE_SCALE = [
    { min: 97, max: 100, grade: 1.00, label: 'Excellent' },
    { min: 94, max: 96.99, grade: 1.25, label: 'Excellent' },
    { min: 91, max: 93.99, grade: 1.50, label: 'Very Good' },
    { min: 88, max: 90.99, grade: 1.75, label: 'Very Good' },
    { min: 85, max: 87.99, grade: 2.00, label: 'Good' },
    { min: 82, max: 84.99, grade: 2.25, label: 'Good' },
    { min: 79, max: 81.99, grade: 2.50, label: 'Satisfactory' },
    { min: 76, max: 78.99, grade: 2.75, label: 'Satisfactory' },
    { min: 75, max: 75.99, grade: 3.00, label: 'Passing' },
    { min: 0, max: 74.99, grade: 5.00, label: 'Failed' },
];

// Convert percentage (0-100) to numerical grade (1.0-5.0)
export function percentageToGrade(percentage) {
    if (percentage == null || isNaN(percentage)) return null;
    const pct = parseFloat(percentage);
    for (const scale of PH_GRADE_SCALE) {
        if (pct >= scale.min && pct <= scale.max) {
            return scale.grade;
        }
    }
    return 5.00; // Failed
}

// Get grade info (grade + label) from percentage
export function getGradeInfo(percentage) {
    if (percentage == null || isNaN(percentage)) return null;
    const pct = parseFloat(percentage);
    for (const scale of PH_GRADE_SCALE) {
        if (pct >= scale.min && pct <= scale.max) {
            return { grade: scale.grade, label: scale.label, percentage: pct };
        }
    }
    return { grade: 5.00, label: 'Failed', percentage: pct };
}

// Calculate average percentage from raw scores: [{earned, total}, ...]
export function calculateScoreAverage(scores) {
    if (!scores || scores.length === 0) return null;
    
    const validScores = scores.filter(s => 
        s.earned != null && s.total != null && 
        !isNaN(s.earned) && !isNaN(s.total) && 
        s.total > 0
    );
    
    if (validScores.length === 0) return null;
    
    const percentages = validScores.map(s => (parseFloat(s.earned) / parseFloat(s.total)) * 100);
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    return average;
}

// Calculate category grade (average of scores × weight)
export function calculateCategoryGrade(category) {
    // Support direct percentage mode
    if (category && category.useDirectPercentage) {
        const pct = parseFloat(category.directPercentage);
        if (isNaN(pct)) return { average: null, weighted: 0 };
        const weight = parseFloat(category.weight) || 0;
        return { average: pct, weighted: pct * weight / 100 };
    }

    if (!category || !category.scores || category.scores.length === 0) {
        return { average: null, weighted: 0 };
    }
    
    const average = calculateScoreAverage(category.scores);
    const weight = parseFloat(category.weight) || 0;
    const weighted = average != null ? (average * weight / 100) : 0;
    
    return { average, weighted };
}

// Calculate period grade from categories
export function calculatePeriodGrade(categories) {
    if (!categories || categories.length === 0) return null;
    
    let totalWeighted = 0;
    let totalWeight = 0;
    
    for (const cat of categories) {
        const { weighted } = calculateCategoryGrade(cat);
        totalWeighted += weighted;
        totalWeight += parseFloat(cat.weight) || 0;
    }
    
    // If weights don't add up to 100, return null (incomplete)
    if (!weightsEqual100(totalWeight)) return null;
    
    return totalWeighted;
}

// Calculate final subject grade from periods
export function calculateSubjectFinalGrade(periods, periodWeights) {
    const { prelim, midterm, prefinal, final } = periods;
    const weights = periodWeights || { prelim: 20, midterm: 20, prefinal: 20, final: 40 };
    
    const prelimGrade = calculatePeriodGrade(prelim?.categories || []);
    const midtermGrade = calculatePeriodGrade(midterm?.categories || []);
    const prefinalGrade = calculatePeriodGrade(prefinal?.categories || []);
    const finalGrade = calculatePeriodGrade(final?.categories || []);
    
    // All periods must have grades
    if (prelimGrade == null || midtermGrade == null || prefinalGrade == null || finalGrade == null) {
        return null;
    }
    
    const totalWeight = weights.prelim + weights.midterm + weights.prefinal + weights.final;
    if (!weightsEqual100(totalWeight)) return null;
    
    const finalPercentage = (
        (prelimGrade * weights.prelim / 100) +
        (midtermGrade * weights.midterm / 100) +
        (prefinalGrade * weights.prefinal / 100) +
        (finalGrade * weights.final / 100)
    );
    
    return finalPercentage;
}

// Calculate GWA from subjects (weighted by units)
export function calculateGWA(subjects) {
    if (!subjects || subjects.length === 0) return null;
    
    let totalGradePoints = 0;
    let totalUnits = 0;
    
    for (const subject of subjects) {
        const finalPercentage = calculateSubjectFinalGrade(subject.periods, subject.periodWeights);
        if (finalPercentage == null) continue; // Skip incomplete subjects
        
        const numericalGrade = percentageToGrade(finalPercentage);
        const units = parseFloat(subject.units) || 0;
        
        if (units > 0) {
            totalGradePoints += numericalGrade * units;
            totalUnits += units;
        }
    }
    
    if (totalUnits === 0) return null;
    
    return totalGradePoints / totalUnits;
}

// Grade calculation summary for a subject
export function getSubjectSummary(subject) {
    const finalPercentage = calculateSubjectFinalGrade(subject.periods, subject.periodWeights);
    if (finalPercentage == null) {
        return { complete: false };
    }
    
    const gradeInfo = getGradeInfo(finalPercentage);
    return {
        complete: true,
        percentage: finalPercentage,
        numericalGrade: gradeInfo.grade,
        label: gradeInfo.label,
        units: parseFloat(subject.units) || 0,
    };
}

// Preset templates
export const GRADE_TEMPLATES = {
    standard: {
        id: 'standard',
        name: 'Standard PH College',
        description: 'Common structure: Quizzes, Activities, Attendance, Exam',
        categories: [
            { name: 'Quizzes', weight: 30 },
            { name: 'Activities', weight: 20 },
            { name: 'Attendance', weight: 10 },
            { name: 'Exam', weight: 40 },
        ],
    },
    labBased: {
        id: 'labBased',
        name: 'Laboratory-Based',
        description: 'For lab subjects with practicals',
        categories: [
            { name: 'Quizzes', weight: 20 },
            { name: 'Laboratory Work', weight: 30 },
            { name: 'Practicals', weight: 20 },
            { name: 'Final Exam', weight: 30 },
        ],
    },
    majorSubject: {
        id: 'majorSubject',
        name: 'Major Subject',
        description: 'Heavy emphasis on exams and projects',
        categories: [
            { name: 'Quizzes', weight: 20 },
            { name: 'Projects', weight: 25 },
            { name: 'Recitation', weight: 10 },
            { name: 'Midterm Exam', weight: 20 },
            { name: 'Final Exam', weight: 25 },
        ],
    },
    simple: {
        id: 'simple',
        name: 'Simple (2 Components)',
        description: 'Class standing + exam',
        categories: [
            { name: 'Class Standing', weight: 60 },
            { name: 'Exam', weight: 40 },
        ],
    },
};

// Get template by ID
export function getTemplate(templateId) {
    return GRADE_TEMPLATES[templateId] || GRADE_TEMPLATES.standard;
}

// Default period weights
export const DEFAULT_PERIOD_WEIGHTS = {
    prelim: 20,
    midterm: 20,
    prefinal: 20,
    final: 40,
};

// Generate unique ID
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create empty category
export function createCategory(name = '', weight = 0) {
    return {
        id: generateId(),
        name,
        weight,
        scores: [],
    };
}

// Create empty score entry
export function createScore(name = '', earned = '', total = '') {
    return {
        id: generateId(),
        name,
        earned,
        total,
    };
}

// Create empty period
export function createPeriod(templateId = 'standard') {
    const template = getTemplate(templateId);
    return {
        categories: template.categories.map(cat => ({
            ...createCategory(cat.name, cat.weight),
            scores: [createScore()], // Start with one empty score
        })),
    };
}

// Create empty subject
export function createSubject(name = '', units = 3, templateId = 'standard') {
    return {
        id: generateId(),
        name,
        units,
        periodWeights: { ...DEFAULT_PERIOD_WEIGHTS },
        periods: {
            prelim: createPeriod(templateId),
            midterm: createPeriod(templateId),
            prefinal: createPeriod(templateId),
            final: createPeriod(templateId),
        },
    };
}

// Validate category weights sum to 100
export function validateCategoryWeights(categories) {
    const total = categories.reduce((sum, cat) => sum + (parseFloat(cat.weight) || 0), 0);
    return { valid: weightsEqual100(total), total };
}

// Validate period weights sum to 100
export function validatePeriodWeights(periodWeights) {
    const total = Object.values(periodWeights).reduce((sum, w) => sum + (parseFloat(w) || 0), 0);
    return { valid: weightsEqual100(total), total };
}
