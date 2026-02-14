import { useState, useRef, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Upload, X, Check, Loader, FileText, RotateCcw } from 'lucide-react';

/**
 * OCR Score Uploader Modal
 * Upload a photo of a graded paper → Tesseract.js extracts text → detect score → confirm
 *
 * Props:
 *   - onScoreDetected(score: number) — called when user confirms a score
 *   - onClose() — called to dismiss modal
 *   - subjectName — display name (e.g. "Math — Prelim")
 */
export default function OCRScoreUploader({ onScoreDetected, onClose, subjectName }) {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [extractedText, setExtractedText] = useState('');
    const [detectedScores, setDetectedScores] = useState([]);
    const [selectedScore, setSelectedScore] = useState(null);
    const [manualScore, setManualScore] = useState('');
    const [step, setStep] = useState('upload'); // upload | processing | results
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target.result);
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleFileInput = (e) => {
        handleFile(e.target.files[0]);
    };

    // Extract scores from OCR text using various patterns
    const extractScores = (text) => {
        const scores = [];
        const patterns = [
            // "85/100", "90/100"
            /(\d{1,3})\s*\/\s*100/gi,
            // "Score: 85", "Score = 92", "SCORE 88"
            /score\s*[:\-=]\s*(\d{1,3})/gi,
            // "Grade: 85", "GRADE = 92"
            /grade\s*[:\-=]\s*(\d{1,3})/gi,
            // "Total: 85", "TOTAL = 92"
            /total\s*[:\-=]\s*(\d{1,3})/gi,
            // "Rating: 85"
            /rating\s*[:\-=]\s*(\d{1,3})/gi,
            // "Result: 85"
            /result\s*[:\-=]\s*(\d{1,3})/gi,
            // "85%"
            /(\d{1,3})\s*%/gi,
            // "85 pts", "85 points"
            /(\d{1,3})\s*(?:pts|points)/gi,
            // standalone two or three-digit numbers (less confident)
            /\b([4-9]\d|100)\b/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const num = parseInt(match[1], 10);
                if (num >= 0 && num <= 100) {
                    const isHighConfidence = pattern.source.includes('score') ||
                        pattern.source.includes('grade') ||
                        pattern.source.includes('total') ||
                        pattern.source.includes('\\/');
                    // Avoid duplicates
                    if (!scores.find(s => s.value === num)) {
                        scores.push({
                            value: num,
                            context: match[0].trim(),
                            confidence: isHighConfidence ? 'high' : 'medium',
                        });
                    }
                }
            }
        }

        // Sort: high confidence first, then by value descending
        scores.sort((a, b) => {
            if (a.confidence !== b.confidence) {
                return a.confidence === 'high' ? -1 : 1;
            }
            return b.value - a.value;
        });

        return scores;
    };

    const runOCR = async () => {
        if (!image) return;
        setStep('processing');
        setProcessing(true);
        setProgress(0);

        try {
            const result = await Tesseract.recognize(image, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                    }
                },
            });

            const text = result.data.text;
            setExtractedText(text);

            const scores = extractScores(text);
            setDetectedScores(scores);

            if (scores.length > 0) {
                setSelectedScore(scores[0].value);
                setManualScore(String(scores[0].value));
            }

            setStep('results');
        } catch (err) {
            console.error('OCR error:', err);
            setExtractedText('Error processing image. Please try again.');
            setStep('results');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirm = () => {
        const score = parseFloat(manualScore);
        if (!isNaN(score) && score >= 0 && score <= 100) {
            onScoreDetected(score);
        }
    };

    const reset = () => {
        setImage(null);
        setImagePreview(null);
        setExtractedText('');
        setDetectedScores([]);
        setSelectedScore(null);
        setManualScore('');
        setStep('upload');
        setProgress(0);
    };

    return (
        <div className="ocr-overlay" onClick={onClose}>
            <div className="ocr-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="ocr-header">
                    <h3><Camera size={20} /> Scan Score</h3>
                    {subjectName && <span className="ocr-subject">{subjectName}</span>}
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Step: Upload */}
                {step === 'upload' && (
                    <div className="ocr-body">
                        <div
                            className={`ocr-dropzone ${dragOver ? 'drag-over' : ''} ${imagePreview ? 'has-image' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => !imagePreview && fileInputRef.current?.click()}
                        >
                            {imagePreview ? (
                                <div className="ocr-preview-wrap">
                                    <img src={imagePreview} alt="Preview" className="ocr-preview-img" />
                                    <button className="btn btn-secondary btn-sm ocr-change-btn" onClick={(e) => { e.stopPropagation(); reset(); }}>
                                        <RotateCcw size={14} /> Change Image
                                    </button>
                                </div>
                            ) : (
                                <div className="ocr-dropzone-content">
                                    <Upload size={40} />
                                    <p><strong>Click to upload</strong> or drag & drop</p>
                                    <span>Supports JPG, PNG, WEBP</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileInput}
                            style={{ display: 'none' }}
                        />
                        {imagePreview && (
                            <button className="btn btn-primary ocr-scan-btn" onClick={runOCR}>
                                <FileText size={16} /> Extract Score
                            </button>
                        )}
                    </div>
                )}

                {/* Step: Processing */}
                {step === 'processing' && (
                    <div className="ocr-body ocr-processing">
                        <div className="ocr-preview-wrap">
                            <img src={imagePreview} alt="Processing" className="ocr-preview-img processing" />
                        </div>
                        <div className="ocr-progress">
                            <Loader size={20} className="spin" />
                            <span>Reading text... {progress}%</span>
                            <div className="ocr-progress-bar">
                                <div className="ocr-progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step: Results */}
                {step === 'results' && (
                    <div className="ocr-body">
                        {/* Detected Scores */}
                        {detectedScores.length > 0 ? (
                            <>
                                <div className="ocr-scores-section">
                                    <h4>Detected Scores</h4>
                                    <div className="ocr-scores-grid">
                                        {detectedScores.slice(0, 6).map((s, i) => (
                                            <button
                                                key={i}
                                                className={`ocr-score-chip ${selectedScore === s.value ? 'selected' : ''} ${s.confidence}`}
                                                onClick={() => { setSelectedScore(s.value); setManualScore(String(s.value)); }}
                                            >
                                                <span className="ocr-score-value">{s.value}</span>
                                                <span className="ocr-score-context">{s.context}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="ocr-confirm-section">
                                    <label>Score to use:</label>
                                    <div className="ocr-confirm-input">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={manualScore}
                                            onChange={(e) => setManualScore(e.target.value)}
                                        />
                                        <button className="btn btn-primary" onClick={handleConfirm} disabled={!manualScore}>
                                            <Check size={16} /> Use Score
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="ocr-no-scores">
                                <p>No scores detected in the image.</p>
                                <div className="ocr-confirm-section">
                                    <label>Enter score manually:</label>
                                    <div className="ocr-confirm-input">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={manualScore}
                                            onChange={(e) => setManualScore(e.target.value)}
                                            placeholder="Enter score"
                                        />
                                        <button className="btn btn-primary" onClick={handleConfirm} disabled={!manualScore}>
                                            <Check size={16} /> Use Score
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Raw extracted text (collapsible) */}
                        <details className="ocr-raw-text">
                            <summary>View extracted text</summary>
                            <pre>{extractedText || 'No text found'}</pre>
                        </details>

                        <button className="btn btn-secondary btn-sm" onClick={reset} style={{ marginTop: '0.5rem' }}>
                            <RotateCcw size={14} /> Try Another Image
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
