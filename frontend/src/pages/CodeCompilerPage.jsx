import { useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Copy, Check, Code2, Clock, Cpu, ChevronDown, Terminal, Loader, Sun, Moon } from 'lucide-react';
import { compilerAPI } from '../api/client';

const LANGUAGES = [
    { id: 71, name: 'Python', monaco: 'python', template: '# Write your Python code here\nprint("Hello, World!")' },
    { id: 63, name: 'JavaScript', monaco: 'javascript', template: '// Write your JavaScript code here\nconsole.log("Hello, World!");' },
    { id: 54, name: 'C++', monaco: 'cpp', template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
    { id: 62, name: 'Java', monaco: 'java', template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
    { id: 50, name: 'C', monaco: 'c', template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
    { id: 51, name: 'C#', monaco: 'csharp', template: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}' },
    { id: 72, name: 'Ruby', monaco: 'ruby', template: '# Write your Ruby code here\nputs "Hello, World!"' },
    { id: 68, name: 'PHP', monaco: 'php', template: '<?php\necho "Hello, World!\\n";\n?>' },
    { id: 73, name: 'Rust', monaco: 'rust', template: 'fn main() {\n    println!("Hello, World!");\n}' },
    { id: 60, name: 'Go', monaco: 'go', template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}' },
    { id: 78, name: 'Kotlin', monaco: 'kotlin', template: 'fun main() {\n    println("Hello, World!")\n}' },
    { id: 74, name: 'TypeScript', monaco: 'typescript', template: '// Write your TypeScript code here\nconsole.log("Hello, World!");' },
];

const STATUS_COLORS = {
    accepted: '#0a7e07',
    pending: '#f59e0b',
    running: '#3b82f6',
    compilation_error: '#c62828',
    runtime_error: '#e65100',
    time_limit: '#7c3aed',
    memory_limit: '#7c3aed',
    wrong_answer: '#c62828',
};

export default function CodeCompilerPage() {
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(LANGUAGES[0].template);
    const [stdin, setStdin] = useState('');
    const [showStdin, setShowStdin] = useState(false);
    const [output, setOutput] = useState(null);
    const [running, setRunning] = useState(false);
    const [copied, setCopied] = useState(false);
    const [darkTheme, setDarkTheme] = useState(true);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const editorRef = useRef(null);

    const handleEditorDidMount = (editor) => {
        editorRef.current = editor;
    };

    const changeLanguage = (lang) => {
        setLanguage(lang);
        setCode(lang.template);
        setOutput(null);
        setShowLangDropdown(false);
    };

    const runCode = useCallback(async () => {
        if (running || !code.trim()) return;
        setRunning(true);
        setOutput(null);

        try {
            const res = await compilerAPI.runCode({
                language_id: language.id,
                language_name: language.name,
                source_code: code,
                stdin: stdin,
            });
            setOutput(res.data);
        } catch (err) {
            setOutput({
                status: 'runtime_error',
                status_description: 'Request Failed',
                stderr: err.response?.data?.detail || err.message || 'Failed to execute code. Is the backend running?',
                stdout: '',
                execution_time: null,
                memory_used: null,
            });
        } finally {
            setRunning(false);
        }
    }, [code, language, stdin, running]);

    const resetCode = () => {
        setCode(language.template);
        setOutput(null);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const outputText = output
        ? (output.stdout || '') + (output.stderr || '') + (output.compile_output || '')
        : '';

    const statusColor = output ? (STATUS_COLORS[output.status] || '#888') : '#888';

    return (
        <div className="compiler-page">
            {/* Header */}
            <div className="compiler-header">
                <div className="compiler-title">
                    <Code2 size={28} />
                    <h1>Code Compiler</h1>
                </div>
                <div className="compiler-actions">
                    <button
                        className="btn-icon"
                        onClick={() => setDarkTheme(!darkTheme)}
                        title={darkTheme ? 'Switch to light' : 'Switch to dark'}
                    >
                        {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button className="btn-icon" onClick={copyCode} title="Copy code">
                        {copied ? <Check size={18} color="#0a7e07" /> : <Copy size={18} />}
                    </button>
                    <button className="btn-icon" onClick={resetCode} title="Reset code">
                        <RotateCcw size={18} />
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="compiler-toolbar">
                {/* Language Selector */}
                <div className="compiler-lang-select">
                    <button
                        className="compiler-lang-btn"
                        onClick={() => setShowLangDropdown(!showLangDropdown)}
                    >
                        <Code2 size={16} />
                        <span>{language.name}</span>
                        <ChevronDown size={14} />
                    </button>
                    {showLangDropdown && (
                        <div className="compiler-lang-dropdown">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang.id}
                                    className={`compiler-lang-option ${lang.id === language.id ? 'active' : ''}`}
                                    onClick={() => changeLanguage(lang)}
                                >
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="compiler-toolbar-right">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowStdin(!showStdin)}
                    >
                        <Terminal size={14} /> {showStdin ? 'Hide' : 'Show'} Input
                    </button>
                    <button
                        className="btn btn-primary compiler-run-btn"
                        onClick={runCode}
                        disabled={running || !code.trim()}
                    >
                        {running ? (
                            <><Loader size={16} className="spin" /> Running...</>
                        ) : (
                            <><Play size={16} /> Run Code</>
                        )}
                    </button>
                </div>
            </div>

            {/* Editor + Output Layout */}
            <div className="compiler-layout">
                {/* Editor Panel */}
                <div className="compiler-editor-panel">
                    {showStdin && (
                        <div className="compiler-stdin">
                            <label><Terminal size={12} /> Input (stdin)</label>
                            <textarea
                                value={stdin}
                                onChange={(e) => setStdin(e.target.value)}
                                placeholder="Enter input for your program..."
                                rows={3}
                            />
                        </div>
                    )}
                    <div className="compiler-editor-wrapper">
                        <Editor
                            height="100%"
                            language={language.monaco}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            onMount={handleEditorDidMount}
                            theme={darkTheme ? 'vs-dark' : 'light'}
                            options={{
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                padding: { top: 16, bottom: 16 },
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                automaticLayout: true,
                                tabSize: 4,
                                wordWrap: 'on',
                                bracketPairColorization: { enabled: true },
                                suggestOnTriggerCharacters: true,
                            }}
                        />
                    </div>
                </div>

                {/* Output Panel */}
                <div className={`compiler-output-panel ${darkTheme ? 'dark' : 'light'}`}>
                    <div className="compiler-output-header">
                        <Terminal size={16} />
                        <span>Output</span>
                        {output && (
                            <span
                                className="compiler-status-badge"
                                style={{ background: statusColor }}
                            >
                                {output.status_description || output.status}
                            </span>
                        )}
                    </div>

                    <div className="compiler-output-body">
                        {running ? (
                            <div className="compiler-output-loading">
                                <Loader size={24} className="spin" />
                                <p>Compiling and executing...</p>
                            </div>
                        ) : output ? (
                            <>
                                <pre className="compiler-output-text">
                                    {outputText || '(no output)'}
                                </pre>
                                <div className="compiler-output-stats">
                                    {output.execution_time != null && (
                                        <span><Clock size={12} /> {output.execution_time}s</span>
                                    )}
                                    {output.memory_used != null && (
                                        <span><Cpu size={12} /> {(output.memory_used / 1024).toFixed(1)} MB</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="compiler-output-placeholder">
                                <Code2 size={40} />
                                <p>Run your code to see output here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
