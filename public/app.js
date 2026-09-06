// ==========================================================================
// NAVADISH v3 — ACADEMIC & CAREER SCHEDULE ENGINE
// Architecture: Centralized Action Registry · AI-Ready Command Layer
// Visual Design: Linear × Cron × Superhuman · Apple HIG Warm Editorial
// ==========================================================================

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// --- MOTION & FRAMER MOTION SAFE PROXY ---
const createMotionProxy = () => {
    const getFM = () => {
        try {
            if (window.FramerMotion && (window.FramerMotion.motion || typeof window.FramerMotion === 'function')) {
                return window.FramerMotion;
            }
            if (window.Motion && (window.Motion.motion || typeof window.Motion === 'function')) {
                return window.Motion;
            }
        } catch (e) {}
        return null;
    };

    return new Proxy({}, {
        get: (target, prop) => {
            const FM = getFM();
            if (FM) {
                if (FM.motion && FM.motion[prop]) return FM.motion[prop];
                if (FM[prop]) return FM[prop];
            }
            return prop;
        }
    });
};

const motion = createMotionProxy();
const AnimatePresence = (props) => {
    const Component = window.FramerMotion?.AnimatePresence || window.Motion?.AnimatePresence;
    if (Component) {
        return React.createElement(Component, props);
    }
    return props.children;
};

// --- HAPTIC PRESS FEEDBACK HELPER ---
const triggerHaptic = (ms = 10) => {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(ms);
        }
    } catch (e) {}
};

// --- COUNT-UP NUMBER ANIMATION COMPONENT ---
function CountUpNumber({ value, duration = 600, suffix = "", prefix = "" }) {
    const [displayVal, setDisplayVal] = useState(0);
    const targetVal = typeof value === 'number' ? value : (parseFloat(value) || 0);

    useEffect(() => {
        let startTimestamp = null;
        let animationFrame = null;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease-out quadratic
            const easeProgress = 1 - Math.pow(1 - progress, 2);
            setDisplayVal(Math.round(easeProgress * targetVal));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            }
        };

        animationFrame = requestAnimationFrame(step);
        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [targetVal, duration]);

    return <span>{prefix}{displayVal}{suffix}</span>;
}

// --- MAGNETIC HOVER BUTTON WRAPPER ---
function MagneticButton({ children, className = "", onClick, style = {}, strength = 0.22, ...props }) {
    const btnRef = useRef(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        if (dist < 45) {
            const dx = (e.clientX - centerX) * strength;
            const dy = (e.clientY - centerY) * strength;
            setOffset({ x: dx, y: dy });
        } else {
            setOffset({ x: 0, y: 0 });
        }
    };

    const handleMouseLeave = () => {
        setOffset({ x: 0, y: 0 });
    };

    return (
        <button
            ref={btnRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={{
                ...style,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                transition: offset.x === 0 && offset.y === 0 ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 80ms ease-out'
            }}
            className={className}
            {...props}
        >
            {children}
        </button>
    );
}

// ==========================================================================
// 1. CENTRALIZED ACTION REGISTRY / COMMAND LAYER
// Every mutation is defined with typed parameters & JSON Schema for LLM tool calling.
// ==========================================================================

const ACTION_DEFINITIONS = {
    addChecklistItem: {
        id: 'addChecklistItem',
        name: 'Add Checklist Item',
        description: 'Adds a new task to today\'s sprint checklist with title, subject category, scheduled time, and optional subtasks.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the task (e.g. "Implement NumPy Vectorization")' },
                subject: { type: 'string', enum: ['Machine Learning', 'C++ Systems', 'BS Chemistry', 'General'], description: 'Subject category' },
                time: { type: 'string', description: 'Scheduled time (e.g. "02:00 PM")' },
                subtasks: { type: 'array', items: { type: 'string' }, description: 'List of subtask step descriptions' }
            },
            required: ['title']
        }
    },
    toggleChecklistItem: {
        id: 'toggleChecklistItem',
        name: 'Toggle Checklist Item',
        description: 'Toggles completion state of a task in today\'s sprint checklist.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'ID of the task to toggle' },
                completed: { type: 'boolean', description: 'Optional target completion status' }
            },
            required: ['id']
        }
    },
    deleteChecklistItem: {
        id: 'deleteChecklistItem',
        name: 'Delete Checklist Item',
        description: 'Deletes a task from today\'s sprint checklist.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'ID of the task to delete' }
            },
            required: ['id']
        }
    },
    updateScheduleCell: {
        id: 'updateScheduleCell',
        name: 'Update Schedule Cell',
        description: 'Updates a specific hourly slot in the weekly schedule matrix (e.g., allocate study block, change status, or set completion percentage).',
        parameters: {
            type: 'object',
            properties: {
                day: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], description: 'Day of the week' },
                hour: { type: 'number', minimum: 0, maximum: 23, description: 'Hour of day (0 to 23)' },
                title: { type: 'string', description: 'Title of the scheduled session or habit' },
                description: { type: 'string', description: 'Detailed notes or focus instructions' },
                status: { type: 'string', enum: ['GOAL_ML', 'GOAL_SDE_DSA', 'CLASS_CHEM', 'FREE', 'MEAL', 'SLEEP'], description: 'Status code' },
                completionPct: { type: 'number', minimum: 0, maximum: 100, description: 'Completion percentage (0 to 100)' }
            },
            required: ['day', 'hour', 'title']
        }
    },
    createMilestone: {
        id: 'createMilestone',
        name: 'Create DAG Milestone',
        description: 'Creates a new competency milestone node in the circular roadmap tech-tree.',
        parameters: {
            type: 'object',
            properties: {
                phaseId: { type: 'string', description: 'Phase identifier (e.g. "phase_1")' },
                title: { type: 'string', description: 'Title of the milestone node' },
                estHours: { type: 'number', description: 'Estimated study hours required' },
                difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'], description: 'Difficulty level' },
                category: { type: 'string', description: 'Subject or category' },
                prerequisites: { type: 'array', items: { type: 'string' }, description: 'IDs of prerequisite milestone nodes' },
                notes: { type: 'string', description: 'Study resources or key learning objectives' }
            },
            required: ['title']
        }
    },
    updateMilestone: {
        id: 'updateMilestone',
        name: 'Update DAG Milestone',
        description: 'Updates milestone properties, mastery percentage, or notes in the circular roadmap.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Milestone ID to update' },
                title: { type: 'string', description: 'Updated title' },
                status: { type: 'string', enum: ['MASTERED', 'ACTIVE', 'IN_PROGRESS', 'TARGET'], description: 'Mastery status' },
                completionPct: { type: 'number', minimum: 0, maximum: 100, description: 'Progress percentage' },
                notes: { type: 'string', description: 'Notes or URL resource links' }
            },
            required: ['id']
        }
    },
    deleteMilestone: {
        id: 'deleteMilestone',
        name: 'Delete DAG Milestone',
        description: 'Removes a milestone node and its connecting edges from the circular roadmap.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'ID of milestone to delete' }
            },
            required: ['id']
        }
    },
    autoArrangeRoadmap: {
        id: 'autoArrangeRoadmap',
        name: 'Auto-Arrange Roadmap DAG',
        description: 'Recomputes topological layout positions for all roadmap nodes using smooth spring glide physics.',
        parameters: {
            type: 'object',
            properties: {}
        }
    },
    startTimer: {
        id: 'startTimer',
        name: 'Start Focus Timer',
        description: 'Starts the persistent floating focus timer with a designated session preset and target study task.',
        parameters: {
            type: 'object',
            properties: {
                preset: { type: 'string', enum: ['pomodoro', 'deepwork', 'quickreview'], description: 'Session preset' },
                duration: { type: 'number', description: 'Duration in minutes' },
                targetTask: { type: 'string', description: 'Title of the task or milestone being focused on' }
            }
        }
    },
    pauseTimer: {
        id: 'pauseTimer',
        name: 'Pause Focus Timer',
        description: 'Pauses the currently running focus countdown timer.',
        parameters: { type: 'object', properties: {} }
    },
    resetTimer: {
        id: 'resetTimer',
        name: 'Reset Focus Timer',
        description: 'Resets the focus timer back to its preset starting duration.',
        parameters: { type: 'object', properties: {} }
    },
    logEvaluationCheckin: {
        id: 'logEvaluationCheckin',
        name: 'Log Evaluation Check-in',
        description: 'Logs a completed study session reflection, mastery score, and updates performance analytics telemetry.',
        parameters: {
            type: 'object',
            properties: {
                taskTitle: { type: 'string', description: 'Title of completed task or study habit' },
                completionPct: { type: 'number', minimum: 0, maximum: 100, description: 'Self-reported mastery percentage' },
                notes: { type: 'string', description: 'Key learnings, derivations, or blockers' },
                score: { type: 'string', enum: ['MASTERED', 'GOOD', 'PARTIAL'], description: 'Mastery rating' }
            },
            required: ['taskTitle']
        }
    },
    changeWizardSettings: {
        id: 'changeWizardSettings',
        name: 'Change Wizard & Settings Preferences',
        description: 'Updates student onboarding preferences including wake/sleep schedule, chronotype, enrolled courses, and exam deadlines.',
        parameters: {
            type: 'object',
            properties: {
                wakeTime: { type: 'string', description: 'Daily wake time (HH:MM)' },
                sleepTime: { type: 'string', description: 'Daily sleep time (HH:MM)' },
                chronotype: { type: 'string', enum: ['early_bird', 'night_owl', 'steady'], description: 'Peak cognitive energy window' },
                courses: { type: 'array', items: { type: 'object' }, description: 'Enrolled courses with priority ordering' },
                deadlines: { type: 'array', items: { type: 'object' }, description: 'Upcoming exams and project deadlines' }
            }
        }
    },
    navigateTo: {
        id: 'navigateTo',
        name: 'Navigate to Page/Section',
        description: 'Navigates between main views: Weekly Schedule Matrix, Circular Roadmap, Performance Tracker, AI Assistant, or Settings.',
        parameters: {
            type: 'object',
            properties: {
                page: { type: 'string', enum: ['heatmap', 'roadmap', 'analytics', 'assistant', 'settings'], description: 'Target navigation tab' }
            },
            required: ['page']
        }
    }
};

// Tool schemas export helper for LLMs (OpenAI/Anthropic/Gemini format)
const getActionSchemas = () => {
    return Object.values(ACTION_DEFINITIONS).map(action => ({
        name: action.id,
        description: action.description,
        parameters: action.parameters
    }));
};

// ==========================================================================
// 2. SVG ICON COMPONENTS
// ==========================================================================

const GridIcon = ({ size = 15, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
    </svg>
);

const GitCommitIcon = ({ size = 15, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="4"></circle>
        <line x1="1.05" y1="12" x2="7" y2="12"></line>
        <line x1="17.01" y1="12" x2="22.96" y2="12"></line>
    </svg>
);

const BarChartIcon = ({ size = 15, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
);

const SparklesIcon = ({ size = 15, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
);

const SlidersIcon = ({ size = 15, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="4" y1="21" x2="4" y2="14"></line>
        <line x1="4" y1="10" x2="4" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12" y2="3"></line>
        <line x1="20" y1="21" x2="20" y2="16"></line>
        <line x1="20" y1="12" x2="20" y2="3"></line>
        <line x1="1" y1="14" x2="7" y2="14"></line>
        <line x1="9" y1="8" x2="15" y2="8"></line>
        <line x1="17" y1="16" x2="23" y2="16"></line>
    </svg>
);

const ClockIcon = ({ size = 15, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);

// --- CUSTOM 3D DROPDOWN COMPONENT ---
function CustomSelect({ value, onChange, options, placeholder = "Select...", className = "" }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

    return (
        <div ref={dropdownRef} className={`relative inline-block ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="debossed-input flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer select-none"
            >
                <span className="truncate">{selectedOption?.label || placeholder}</span>
                <span className="text-[10px] text-[#8C7265] ml-1">▼</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="custom-select-menu absolute top-full mt-1.5 left-0 min-w-[140px] z-50 py-1"
                    >
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                    triggerHaptic(10);
                                }}
                                className={`custom-select-item ${String(opt.value) === String(value) ? 'selected' : ''}`}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- CUSTOM INTERACTIVE APPLE HIG DEBOSSED TIME PICKER ---
function CustomTimePicker({ value = "07:00", onChange, label = "" }) {
    const parts = (value || "07:00").split(':');
    let h24 = parseInt(parts[0], 10);
    if (isNaN(h24)) h24 = 7;
    const min = parts[1] || '00';
    const isPM = h24 >= 12;
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const hStr = String(h12).padStart(2, '0');
    const period = isPM ? 'PM' : 'AM';

    const updateTime = (newH12, newMin, newPeriod) => {
        let hours = parseInt(newH12, 10);
        if (newPeriod === 'PM' && hours < 12) hours += 12;
        if (newPeriod === 'AM' && hours === 12) hours = 0;
        const formatted = `${String(hours).padStart(2, '0')}:${newMin}`;
        onChange(formatted);
        triggerHaptic(10);
    };

    const hourOptions = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const minOptions = ['00', '15', '30', '45'];

    return (
        <div className="space-y-1">
            {label && <label className="text-xs font-bold text-[#5C4638] block">{label}</label>}
            <div className="debossed-input flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/80 shadow-xs border border-[#DCD1C0]/80">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#2B2420]">
                    <select
                        value={hStr}
                        onChange={(e) => updateTime(e.target.value, min, period)}
                        className="bg-transparent font-mono text-xs font-bold text-[#2B2420] border-none outline-none cursor-pointer p-0"
                    >
                        {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-[#8C7265]">:</span>
                    <select
                        value={minOptions.includes(min) ? min : '00'}
                        onChange={(e) => updateTime(hStr, e.target.value, period)}
                        className="bg-transparent font-mono text-xs font-bold text-[#2B2420] border-none outline-none cursor-pointer p-0"
                    >
                        {minOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-[#DCD1C0]/80 bg-[#EDE6DA]/60">
                    <button
                        type="button"
                        onClick={() => updateTime(hStr, min, 'AM')}
                        className={`px-2 py-0.5 text-[10px] font-bold border-none cursor-pointer transition-colors ${period === 'AM' ? 'bg-[#C4703F] text-white shadow-xs' : 'bg-transparent text-[#5C4638] hover:text-[#2B2420]'}`}
                    >
                        AM
                    </button>
                    <button
                        type="button"
                        onClick={() => updateTime(hStr, min, 'PM')}
                        className={`px-2 py-0.5 text-[10px] font-bold border-none cursor-pointer transition-colors ${period === 'PM' ? 'bg-[#C4703F] text-white shadow-xs' : 'bg-transparent text-[#5C4638] hover:text-[#2B2420]'}`}
                    >
                        PM
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// 3. PERSISTENT FLOATING FOCUS TIMER COMPONENT (STRUCTURAL CHANGE #1)
// Fixed at bottom-right, persists across all pages, live countdown ring.
// ==========================================================================

function PersistentFloatingTimer({
    timerState,
    onStartTimer,
    onPauseTimer,
    onResetTimer,
    onSwitchPreset,
    onOpenTaskPicker,
    onCompleteSession,
    aiHighlightId
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('');
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [customTargetInput, setCustomTargetInput] = useState('');
    
    const { isRunning, secondsLeft, totalDuration, preset, targetTask, sessionsCompleted } = timerState;

    const progressPct = totalDuration > 0 ? ((totalDuration - secondsLeft) / totalDuration) * 100 : 0;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const isAiTargeted = aiHighlightId === 'timer';

    const handleApplyCustomMinutes = (e) => {
        e?.preventDefault();
        const parsed = parseInt(customMinutes, 10);
        if (parsed && parsed > 0 && parsed <= 240) {
            onSwitchPreset('custom', parsed);
            setIsCustomMode(false);
            setCustomMinutes('');
            triggerHaptic(15);
        }
    };

    const handleSaveCustomTarget = (e) => {
        e?.preventDefault();
        if (customTargetInput.trim()) {
            onSwitchPreset(preset, Math.round(totalDuration / 60) || 25);
            timerState.targetTask = customTargetInput.trim();
            setIsEditingTarget(false);
            triggerHaptic(10);
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-40">
            <AnimatePresence>
                {!isExpanded ? (
                    // COLLAPSED FLOATING PROGRESS RING (BOTTOM-LEFT)
                    <motion.div
                        key="collapsed"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        onClick={() => {
                            setIsExpanded(true);
                            triggerHaptic(15);
                        }}
                        className={`group cursor-pointer relative flex items-center justify-center w-14 h-14 rounded-full bg-white/95 backdrop-blur-xl border border-white/80 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${isAiTargeted ? 'ai-pulse-highlight' : ''}`}
                        title="Open Focus Timer (Bottom-Left)"
                    >
                        {/* Circular Progress Ring */}
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                            <circle
                                cx="22"
                                cy="22"
                                r="19"
                                fill="none"
                                stroke="#EDE6DA"
                                strokeWidth="3"
                            />
                            <circle
                                cx="22"
                                cy="22"
                                r="19"
                                fill="none"
                                stroke="url(#timerGradient)"
                                strokeWidth="3"
                                strokeDasharray="119.38"
                                strokeDashoffset={119.38 - (119.38 * progressPct) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-500 ease-out"
                            />
                            <defs>
                                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#C4703F" />
                                    <stop offset="100%" stopColor="#8B5A3C" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Central Time or Icon */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            {isRunning ? (
                                <span className="font-mono text-[11px] font-bold text-[#2B2420] tracking-tighter">
                                    {mins}m
                                </span>
                            ) : (
                                <span className="text-sm">⏱️</span>
                            )}
                        </div>

                        {/* Pulsing Aura if Running */}
                        {isRunning && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C4703F] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C4703F]"></span>
                            </span>
                        )}
                    </motion.div>
                ) : (
                    // EXPANDED FLOATING TIMER CARD (POPOVER)
                    <motion.div
                        key="expanded"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                        className={`w-80 apple-glass-panel p-5 shadow-2xl space-y-4 border border-white/90 ${isAiTargeted ? 'ai-pulse-highlight' : ''}`}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center pb-2 border-b border-[#DCD1C0]/60">
                            <div className="flex items-center gap-2">
                                <span className="text-base">⏱️</span>
                                <div>
                                    <h4 className="text-xs font-bold text-[#2B2420] uppercase tracking-wider">Focus Engine</h4>
                                    <div className="text-[10px] text-[#8C7265] font-mono">
                                        🔥 {sessionsCompleted} Sessions Completed
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsExpanded(false);
                                    triggerHaptic(10);
                                }}
                                className="w-6 h-6 rounded-full bg-[#EDE6DA] hover:bg-[#DCD1C0] flex items-center justify-center text-xs text-[#5C4638] transition-colors border-none cursor-pointer"
                                title="Collapse to Ring"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Presets Segmented Control */}
                        <div>
                            <div className="text-[9px] uppercase font-bold text-[#8C7265] mb-1.5">Presets</div>
                            <div className="flex bg-[#EDE6DA]/70 p-1 rounded-xl border border-[#DCD1C0]/60">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomMode(false);
                                        onSwitchPreset('pomodoro', 25);
                                    }}
                                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all border-none cursor-pointer ${preset === 'pomodoro' && totalDuration === 25 * 60 ? 'bg-white shadow-sm text-[#C4703F]' : 'text-[#8C7265] bg-transparent'}`}
                                >
                                    25m Pomo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomMode(false);
                                        onSwitchPreset('deepwork', 45);
                                    }}
                                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all border-none cursor-pointer ${preset === 'deepwork' && totalDuration === 45 * 60 ? 'bg-white shadow-sm text-[#C4703F]' : 'text-[#8C7265] bg-transparent'}`}
                                >
                                    45m Deep
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomMode(false);
                                        onSwitchPreset('quickreview', 15);
                                    }}
                                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all border-none cursor-pointer ${preset === 'quickreview' && totalDuration === 15 * 60 ? 'bg-white shadow-sm text-[#C4703F]' : 'text-[#8C7265] bg-transparent'}`}
                                >
                                    15m Flash
                                </button>
                            </div>
                        </div>

                        {/* Duration Selector */}
                        <div>
                            <div className="text-[9px] uppercase font-bold text-[#8C7265] mb-1.5 flex justify-between items-center">
                                <span>Duration Selector</span>
                                <span className="font-mono text-[10px] text-[#C4703F]">{Math.round(totalDuration / 60)} min</span>
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                                {[15, 25, 45, 60].map((dur) => {
                                    const isSel = totalDuration === dur * 60 && !isCustomMode;
                                    return (
                                        <button
                                            key={dur}
                                            type="button"
                                            onClick={() => {
                                                setIsCustomMode(false);
                                                onSwitchPreset(dur === 25 ? 'pomodoro' : dur === 45 ? 'deepwork' : dur === 15 ? 'quickreview' : 'custom', dur);
                                                triggerHaptic(10);
                                            }}
                                            className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${isSel ? 'bg-[#C4703F] text-white border-[#C4703F] shadow-sm' : 'bg-white/80 text-[#5C4638] border-[#DCD1C0]/60 hover:bg-[#F5E6D8]'}`}
                                        >
                                            {dur}m
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomMode(prev => !prev);
                                        triggerHaptic(10);
                                    }}
                                    className={`py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${isCustomMode ? 'bg-[#C4703F] text-white border-[#C4703F]' : 'bg-white/80 text-[#5C4638] border-[#DCD1C0]/60 hover:bg-[#F5E6D8]'}`}
                                >
                                    Custom
                                </button>
                            </div>

                            {/* Inline Custom Minutes Input */}
                            {isCustomMode && (
                                <form onSubmit={handleApplyCustomMinutes} className="flex items-center gap-2 mt-2 pt-2 border-t border-[#DCD1C0]/40">
                                    <input
                                        type="number"
                                        min="1"
                                        max="240"
                                        placeholder="Minutes..."
                                        value={customMinutes}
                                        onChange={(e) => setCustomMinutes(e.target.value)}
                                        className="debossed-input flex-1 px-2.5 py-1 text-xs rounded-lg"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="btn-caramel text-[11px] px-3 py-1 rounded-lg"
                                    >
                                        Set
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Interactive Countdown Ring Card */}
                        <div className="flex flex-col items-center justify-center py-2 relative">
                            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="44"
                                    fill="none"
                                    stroke="#EDE6DA"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="44"
                                    fill="none"
                                    stroke="url(#largeTimerGradient)"
                                    strokeWidth="6"
                                    strokeDasharray="276.46"
                                    strokeDashoffset={276.46 - (276.46 * progressPct) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-300 ease-out"
                                />
                                <defs>
                                    <linearGradient id="largeTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#C4703F" />
                                        <stop offset="100%" stopColor="#8B5A3C" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="font-mono text-2xl font-bold text-[#2B2420] tracking-tight">
                                    {timeFormatted}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7265] mt-1">
                                    {isRunning ? 'Flow State Active' : 'Paused / Ready'}
                                </span>
                            </div>
                        </div>

                        {/* Target Picker */}
                        <div className="p-2.5 rounded-xl bg-white/70 border border-[#DCD1C0]/60 space-y-1.5">
                            <div className="flex justify-between items-center">
                                <div className="text-[9px] uppercase font-bold text-[#8C7265]">Currently Focusing On</div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditingTarget(!isEditingTarget);
                                        setCustomTargetInput(targetTask || '');
                                    }}
                                    className="text-[10px] text-[#C4703F] hover:underline font-semibold bg-transparent border-none cursor-pointer"
                                >
                                    {isEditingTarget ? 'Cancel' : 'Edit'}
                                </button>
                            </div>

                            {isEditingTarget ? (
                                <form onSubmit={handleSaveCustomTarget} className="flex gap-1.5">
                                    <input
                                        type="text"
                                        value={customTargetInput}
                                        onChange={(e) => setCustomTargetInput(e.target.value)}
                                        placeholder="Custom focus target..."
                                        className="debossed-input flex-1 px-2 py-1 text-xs rounded-lg"
                                        autoFocus
                                    />
                                    <button type="submit" className="btn-caramel text-[10px] px-2.5 py-1 rounded-lg">
                                        Save
                                    </button>
                                </form>
                            ) : (
                                <div
                                    onClick={onOpenTaskPicker}
                                    className="flex items-center justify-between hover:bg-[#F5E6D8] p-1.5 rounded-lg transition-colors cursor-pointer"
                                    title="Click to select sprint task or milestone"
                                >
                                    <span className="text-xs font-semibold text-[#2B2420] truncate mr-2">
                                        {targetTask || 'Select Sprint Task or Milestone...'}
                                    </span>
                                    <span className="text-xs text-[#C4703F]">✏️</span>
                                </div>
                            )}
                        </div>

                        {/* Controls Deck */}
                        <div className="flex items-center gap-2 pt-1">
                            <MagneticButton
                                onClick={() => {
                                    if (isRunning) onPauseTimer();
                                    else onStartTimer();
                                    triggerHaptic(20);
                                }}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md ${isRunning ? 'bg-[#8B5A3C]' : 'btn-caramel'}`}
                            >
                                {isRunning ? '⏸ Pause' : '▶ Start Focus'}
                            </MagneticButton>

                            <button
                                type="button"
                                onClick={() => {
                                    onResetTimer();
                                    triggerHaptic(10);
                                }}
                                className="p-2 rounded-xl bg-[#EDE6DA] hover:bg-[#DCD1C0] text-xs text-[#5C4638] transition-colors border-none cursor-pointer"
                                title="Reset Timer"
                            >
                                🔄
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    onCompleteSession();
                                    triggerHaptic(25);
                                }}
                                className="p-2 rounded-xl bg-[#E8EFE0] hover:bg-[#D4E2C4] text-xs text-[#7A8B5C] transition-colors border-none cursor-pointer"
                                title="Mark Complete & Log"
                            >
                                🎯
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ==========================================================================
// 4. LIQUID SIRI ORB COMPONENT (APPLE SIRI FLUID LIGHT ENGINE)
// Ambient, intelligent, alive — morphing gradients, 3D refraction, glow
// ==========================================================================

function LiquidSiriOrb({
    size = 60,
    state = 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking' | 'action'
    isStatic = false,
    className = '',
    style = {},
    showParticles = true,
    showGlow = true
}) {
    const isThinking = state === 'thinking';
    const isListening = state === 'listening';
    const isSpeaking = state === 'speaking';
    const isAction = state === 'action';

    const stateClass = isStatic ? '' : (
        isAction ? 'siri-state-action' :
        isThinking ? 'siri-state-thinking' :
        isListening ? 'siri-state-listening' :
        isSpeaking ? 'siri-state-speaking' :
        'siri-state-idle'
    );

    const glowClass = isStatic ? '' : (
        isAction ? 'siri-glow-action' :
        isThinking ? 'siri-glow-thinking' :
        isListening ? 'siri-glow-listening' :
        'siri-glow-idle'
    );

    return (
        <div
            className={`siri-orb-wrapper ${className}`}
            style={{ width: size, height: size, ...style }}
        >
            {/* Outer Breathing / Waveform Aura */}
            {showGlow && !isStatic && size >= 28 && (
                <div
                    className={`siri-orb-glow ${glowClass}`}
                    style={size > 80 ? { inset: `-${Math.round(size * 0.16)}px`, filter: `blur(${Math.round(size * 0.18)}px)` } : {}}
                />
            )}

            {/* Orbiting Moon Particles (Thinking State) */}
            {showParticles && isThinking && size >= 24 && (
                <div
                    className="siri-orbit-container"
                    style={{
                        transform: `scale(${size / 60})`,
                        transformOrigin: 'center center'
                    }}
                >
                    <div className="siri-moon siri-moon-1" />
                    <div className="siri-moon siri-moon-2" />
                    <div className="siri-moon siri-moon-3" />
                </div>
            )}

            {/* Main Spherical Core with Liquid Blobs */}
            <div className={`siri-orb-sphere w-full h-full ${stateClass}`}>
                {/* Overlapping Morphing Radial Blobs */}
                <div className="siri-blob siri-blob-1" />
                <div className="siri-blob siri-blob-2" />
                <div className="siri-blob siri-blob-3" />

                {/* 3D Specular Highlight & Glass Rim */}
                <div className="siri-glass-highlight" />
                <div className="siri-glass-rim" />
            </div>
        </div>
    );
}

// Helper to format action descriptions clearly
function formatActionDescription(action) {
    if (!action) return 'Executed action successfully';
    const { name, params = {} } = action;
    if (name === 'updateScheduleCell') {
        return `Scheduled "${params.title || 'Study Block'}" on ${params.day || 'Day'} at ${params.hour || 12}:00`;
    }
    if (name === 'addChecklistItem') {
        return `Added sprint task: "${params.title || 'Task'}" (${params.subject || 'Coursework'})`;
    }
    if (name === 'createMilestone') {
        return `Created roadmap milestone: "${params.title || 'Milestone'}"`;
    }
    if (name === 'startTimer') {
        return `Started focus timer: "${params.targetTask || 'Sprint Session'}"`;
}
    return `Executed programmatic action: ${name}`;
}

// ==========================================================================
// 5. FLOATING SIRI ORB LAUNCHER (BOTTOM-RIGHT SHORTCUT)
// Visible on Matrix/Roadmap/Analytics pages ONLY, hidden on AI Assistant page
// ==========================================================================

function FloatingSiriLauncher({ onClick, aiHighlightId, isProcessing }) {
    const [launcherOffset, setLauncherOffset] = useState({ x: 0, y: 0 });
    const [isRippling, setIsRippling] = useState(false);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        setLauncherOffset({
            x: Math.max(-5, Math.min(5, dx * 5)),
            y: Math.max(-5, Math.min(5, dy * 5))
        });
    };

    const handleMouseLeave = () => {
        setLauncherOffset({ x: 0, y: 0 });
    };

    const handleClick = () => {
        setIsRippling(true);
        triggerHaptic(20);
        setTimeout(() => {
            setIsRippling(false);
            if (onClick) onClick();
        }, 180);
    };

    return (
        <motion.div
            key="floating-siri-launcher"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={`fixed bottom-6 right-6 z-40 cursor-pointer ${aiHighlightId === 'assistant' ? 'ai-pulse-highlight' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            title="Open NavaDish AI Assistant"
            style={{
                transform: `translate(${launcherOffset.x}px, ${launcherOffset.y}px)`,
                transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
        >
            <div className="relative flex items-center justify-center p-1 group">
                {isRippling && <div className="siri-activation-ripple" />}
                <LiquidSiriOrb size={60} state={isProcessing ? 'thinking' : 'idle'} showGlow={true} />
                <div className="siri-notification-badge" title="AI Assistant Ready" />
            </div>
        </motion.div>
    );
}

// ==========================================================================
// 6. FULL-PAGE AI ASSISTANT (TASK 2 — IMMERSIVE BRANDED EXPERIENCE)
// Large fluid Siri orb hero, auto-collapsing header, dual-pane conversation & activity feed
// ==========================================================================

function FullPageAIAssistant({
    messages = [],
    onSendMessage,
    isProcessing,
    activityFeed = [],
    onExecuteAction,
    userPrefs,
    aiHighlightId,
    onUndoAction,
    onClearMessages
}) {
    const [chatInput, setChatInput] = useState('');
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isMicActive, setIsMicActive] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [recentActionState, setRecentActionState] = useState(false);
    const [recentSpeakingState, setRecentSpeakingState] = useState(false);

    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevMessagesLength = useRef(messages.length);

    const examplePlaceholders = [
        "Add a 2-hour ML session tomorrow...",
        "What should I focus on today?",
        "Reschedule my Friday chemistry block...",
        "Optimize my schedule for my evening chronotype..."
    ];

    // Placeholder rotation timer
    useEffect(() => {
        const timer = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % examplePlaceholders.length);
        }, 3600);
        return () => clearInterval(timer);
    }, [examplePlaceholders.length]);

    // Track speaking and action confirmed states when messages update
    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
                if (lastMsg.actionTaken) {
                    setRecentActionState(true);
                    setTimeout(() => setRecentActionState(false), 800);
                }
                setRecentSpeakingState(true);
                setTimeout(() => setRecentSpeakingState(false), 2600);
            }
        }
        prevMessagesLength.current = messages.length;
    }, [messages]);

    // Auto-scroll to bottom of conversation
    useEffect(() => {
        if (messages.length > 0) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isProcessing]);

    // Live state of the Siri Orb
    const orbState = isProcessing
        ? 'thinking'
        : recentActionState
        ? 'action'
        : recentSpeakingState
        ? 'speaking'
        : (isMicActive || isInputFocused || chatInput.trim().length > 0)
        ? 'listening'
        : 'idle';

    // Dynamic status text
    const statusLineText = isProcessing
        ? "Thinking & reasoning..."
        : recentActionState
        ? "Action confirmed & applied"
        : recentSpeakingState
        ? "Here's what I found"
        : (isMicActive || isInputFocused || chatInput.trim().length > 0)
        ? "Listening..."
        : "Ready when you are";

    const handleSend = (e) => {
        e?.preventDefault();
        if (!chatInput.trim() && attachedFiles.length === 0) return;
        onSendMessage(chatInput, attachedFiles);
        setChatInput('');
        setAttachedFiles([]);
        setIsMicActive(false);
        triggerHaptic(15);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const newAttachments = files.map(f => ({
            id: `att_${Date.now()}_${Math.random()}`,
            name: f.name,
            size: (f.size / 1024).toFixed(1) + ' KB',
            type: f.type.includes('image') ? 'image' : 'doc'
        }));
        setAttachedFiles(prev => [...prev, ...newAttachments]);
        triggerHaptic(10);
    };

    const removeAttachment = (id) => {
        setAttachedFiles(prev => prev.filter(a => a.id !== id));
        triggerHaptic(10);
    };

    const toggleMic = () => {
        setIsMicActive(prev => !prev);
        triggerHaptic(15);
        if (!isMicActive) {
            setChatInput("Reschedule my Friday free slots to optimize for evening focus");
        }
    };

    const suggestedPrompts = [
        { label: "📊 Summarize my week", prompt: "Summarize my weekly study velocity, focus metrics, and upcoming deadlines." },
        { label: "🎯 What should I focus on?", prompt: "What are my highest priority coursework topics and weakest concepts today?" },
        { label: "🔄 Rebalance my schedule", prompt: "Rebalance my calendar slots to align with my evening peak chronotype." },
        { label: "📎 Analyze a document", prompt: "Analyze my coursework syllabus and suggest milestones for the tech tree." }
    ];

    const hasMessages = messages.length > 0;

    return (
        <div className="space-y-6 animate-fade-in-scale pb-16">
            
            {/* HERO / TOP SECTION: Centered Large Orb when no messages, collapses when conversation starts */}
            {!hasMessages ? (
                // Centered Hero State (Initial Landing)
                <div className="min-h-[58vh] flex flex-col items-center justify-center text-center space-y-6 py-12 px-4 apple-glass-panel relative overflow-hidden">
                    {/* Faint ambient liquid light blobs in background */}
                    <div className="ai-blob-1 opacity-40 pointer-events-none" />
                    <div className="ai-blob-2 opacity-40 pointer-events-none" />

                    {/* Large 140px Fluid Siri Orb */}
                    <div className="relative py-2">
                        <LiquidSiriOrb size={140} state={orbState} showGlow={true} />
                    </div>

                    {/* Title & Dynamic Status Line */}
                    <div className="space-y-2 relative z-10 max-w-xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#FFD88A] shadow-xs text-xs font-bold text-[#5C4638]">
                            <span className="w-2 h-2 rounded-full bg-[#7A8B5C] animate-pulse" />
                            <span>NavaDish Intelligent Layer</span>
                        </div>
                        <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#2B2420] tracking-tight">
                            Academic AI Pilot
                        </h2>
                        <p className="font-mono text-sm text-[#C4703F] font-semibold transition-all duration-300">
                            {statusLineText}
                        </p>
                    </div>

                    {/* Centered Input Deck in Hero */}
                    <div className="w-full max-w-2xl relative z-10 space-y-3">
                        <form onSubmit={handleSend} className="apple-glass-panel p-2 shadow-xl flex items-center gap-2 border border-white/90 bg-white/90">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                multiple
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={toggleMic}
                                className={`p-2.5 rounded-full transition-colors border-none cursor-pointer ${isMicActive ? 'bg-[#FF8A5B] text-white animate-pulse shadow-sm' : 'hover:bg-[#F5E6D8] text-[#8C7265] bg-transparent'}`}
                                title={isMicActive ? "Mic Listening..." : "Voice Input"}
                            >
                                🎙️
                            </button>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 rounded-full hover:bg-[#F5E6D8] text-[#8C7265] transition-colors border-none bg-transparent cursor-pointer"
                                title="Attach Syllabus, Problem Set, or Notes"
                            >
                                📎
                            </button>

                            <input
                                type="text"
                                value={chatInput}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder={examplePlaceholders[placeholderIndex]}
                                className="flex-1 px-4 py-3 text-sm bg-transparent border-none outline-none text-[#2B2420] placeholder:text-[#A89587] font-medium"
                                autoFocus
                            />

                            <button
                                type="submit"
                                disabled={!chatInput.trim() && attachedFiles.length === 0}
                                className={`px-5 py-3 rounded-full text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-md ${chatInput.trim() || attachedFiles.length > 0 ? 'bg-gradient-to-r from-[#FF8A5B] to-[#FFB05B] text-white hover:opacity-95' : 'bg-[#EDE6DA] text-[#A89587] cursor-not-allowed'}`}
                            >
                                <span>Send</span>
                                <span>➔</span>
                            </button>
                        </form>

                        {/* File Attachment Preview Chips */}
                        {attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-center pt-1">
                                {attachedFiles.map(file => (
                                    <div key={file.id} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#FFD88A] text-xs shadow-xs">
                                        <span>📎</span>
                                        <span className="font-semibold text-[#2B2420]">{file.name}</span>
                                        <button type="button" onClick={() => removeAttachment(file.id)} className="text-[#8C7265] hover:text-[#B5484A] font-bold ml-1 border-none bg-transparent cursor-pointer">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Suggested Prompt Buttons */}
                        <div className="pt-2">
                            <div className="text-[10px] uppercase font-bold text-[#8C7265] mb-2">Suggested Actions</div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {suggestedPrompts.map((sp, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onSendMessage(sp.prompt);
                                            triggerHaptic(15);
                                        }}
                                        className="px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-[#FFD88A]/60 border border-[#DCD1C0]/80 hover:border-[#FF8A5B]/60 text-xs font-semibold text-[#5C4638] transition-all cursor-pointer shadow-xs hover:scale-102"
                                    >
                                        {sp.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Collapsed Top Banner State (When Conversation is Active)
                <div className="apple-glass-panel p-4 shadow-sm flex items-center justify-between gap-4 border border-white/90">
                    <div className="flex items-center gap-3.5">
                        <LiquidSiriOrb size={44} state={orbState} showGlow={true} />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-serif text-xl font-bold text-[#2B2420]">NavaDish AI Assistant</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD88A] text-[#5C4638] font-bold">
                                    Live Session
                                </span>
                            </div>
                            <p className="text-xs font-mono text-[#C4703F] mt-0.5 font-semibold">
                                {statusLineText}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onClearMessages && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClearMessages();
                                    triggerHaptic(10);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-[#FBEBEB] text-xs font-bold text-[#8C7265] hover:text-[#B5484A] border border-[#DCD1C0] transition-colors cursor-pointer"
                                title="Reset Conversation"
                            >
                                ↺ Reset
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* TWO-COLUMN CONVERSATION AREA (Active after first message) */}
            {hasMessages && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: CHAT TRANSCRIPT (~70% Width) */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="apple-glass-panel p-6 shadow-sm min-h-[460px] max-h-[64vh] overflow-y-auto space-y-4 border border-white/90 relative">
                            {/* Faint background blobs */}
                            <div className="ai-blob-1 opacity-20 pointer-events-none" />

                            {messages.map((m) => {
                                const isAssistant = m.role === 'assistant';

                                return (
                                    <div
                                        key={m.id}
                                        className={`flex gap-3 message-pop-in ${isAssistant ? 'justify-start items-start' : 'justify-end items-end'}`}
                                    >
                                        {/* Mini 24px Liquid Siri Orb on Assistant Messages */}
                                        {isAssistant && (
                                            <div className="mt-1 flex-shrink-0">
                                                <LiquidSiriOrb size={24} isStatic={true} showGlow={false} />
                                            </div>
                                        )}

                                        <div className="max-w-[85%] space-y-2">
                                            {/* Comic Speech Bubble */}
                                            <div
                                                className={`p-4 text-xs sm:text-sm font-sans leading-relaxed ${isAssistant ? 'speech-bubble-ai text-white' : 'speech-bubble-user text-white'}`}
                                            >
                                                {m.content}

                                                {/* Attached File Preview Chips */}
                                                {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/20">
                                                        {m.attachments.map(att => (
                                                            <div key={att.id} className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-md text-[11px]">
                                                                <span>📎</span>
                                                                <span className="truncate max-w-[140px]">{att.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Confirmation Card (If mutation executed) */}
                                            {isAssistant && m.actionTaken && (
                                                <div className="p-3.5 rounded-2xl bg-[#FFD88A] border border-[#E8C470] shadow-sm space-y-2 relative overflow-hidden">
                                                    <div className="absolute top-2 right-4 pointer-events-none">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A5B] particle-dot-1 absolute" />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#C4703F] particle-dot-2 absolute" />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#7A8B5C] particle-dot-3 absolute" />
                                                    </div>

                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm">✨</span>
                                                            <span className="text-[11px] font-bold text-[#5C4638] uppercase tracking-wider">
                                                                Action Executed
                                                            </span>
                                                        </div>
                                                        {onUndoAction && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onUndoAction(m.actionTaken)}
                                                                className="px-2.5 py-0.5 rounded-lg bg-white/90 hover:bg-white text-[#5C4638] font-bold text-[10px] border border-[#D4BA80] transition-colors cursor-pointer shadow-xs"
                                                            >
                                                                ↺ Undo
                                                            </button>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-[#2B2420] font-medium leading-snug">
                                                        {formatActionDescription(m.actionTaken)}
                                                    </p>
                                                </div>
                                            )}

                                            <div className={`text-[10px] text-[#8C7265] ${isAssistant ? 'text-left pl-1' : 'text-right pr-1'}`}>
                                                {m.timestamp}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Thinking State Indicator with Soundwave Shimmer */}
                            {isProcessing && (
                                <div className="flex items-center gap-3 message-pop-in">
                                    <LiquidSiriOrb size={24} state="thinking" />
                                    <div className="speech-bubble-ai px-4 py-2.5 flex items-center gap-2.5">
                                        <span className="text-xs font-medium text-white/90">Reasoning & checking schedule...</span>
                                        <div className="siri-thinking-bar">
                                            <span className="siri-soundwave-bar" />
                                            <span className="siri-soundwave-bar" />
                                            <span className="siri-soundwave-bar" />
                                            <span className="siri-soundwave-bar" />
                                            <span className="siri-soundwave-bar" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Sticky Input Bar at Bottom of Transcript */}
                        <div className="sticky bottom-6 z-20 space-y-2">
                            {attachedFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-2 bg-white/85 backdrop-blur-md rounded-xl border border-[#EDE0D0] shadow-sm">
                                    {attachedFiles.map(file => (
                                        <div key={file.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF8F0] border border-[#FFD88A] text-xs">
                                            <span>📎</span>
                                            <span className="font-semibold text-[#2B2420]">{file.name}</span>
                                            <button type="button" onClick={() => removeAttachment(file.id)} className="text-[#8C7265] hover:text-[#B5484A] font-bold ml-1 border-none bg-transparent cursor-pointer">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleSend} className="apple-glass-panel p-2 shadow-xl flex items-center gap-2 border border-white/90 bg-white/95">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    multiple
                                    className="hidden"
                                />

                                <button
                                    type="button"
                                    onClick={toggleMic}
                                    className={`p-2.5 rounded-full transition-colors border-none cursor-pointer ${isMicActive ? 'bg-[#FF8A5B] text-white animate-pulse shadow-sm' : 'hover:bg-[#F5E6D8] text-[#8C7265] bg-transparent'}`}
                                    title={isMicActive ? "Mic Listening..." : "Voice Input"}
                                >
                                    🎙️
                                </button>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 rounded-full hover:bg-[#F5E6D8] text-[#8C7265] transition-colors border-none bg-transparent cursor-pointer"
                                    title="Attach Syllabus, Problem Set, or Notes"
                                >
                                    📎
                                </button>

                                <input
                                    type="text"
                                    value={chatInput}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={examplePlaceholders[placeholderIndex]}
                                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-transparent border-none outline-none text-[#2B2420] placeholder:text-[#A89587] font-medium"
                                />

                                <button
                                    type="submit"
                                    disabled={!chatInput.trim() && attachedFiles.length === 0}
                                    className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 shadow-md ${chatInput.trim() || attachedFiles.length > 0 ? 'bg-gradient-to-r from-[#FF8A5B] to-[#FFB05B] text-white hover:opacity-95' : 'bg-[#EDE6DA] text-[#A89587] cursor-not-allowed'}`}
                                >
                                    <span>Send</span>
                                    <span>➔</span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PERSISTENT AI ACTIVITY FEED SIDEBAR (~30% Width) */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="apple-glass-panel p-5 shadow-sm space-y-3.5 border border-white/90">
                            <div className="flex justify-between items-center pb-2.5 border-b border-[#DCD1C0]/60">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#2B2420]">AI Activity Feed</h4>
                                    <p className="text-[11px] text-[#8C7265]">Real-time programmatic execution log</p>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8EFE0] text-[#7A8B5C] font-bold">
                                    {activityFeed.length} Logged
                                </span>
                            </div>

                            {activityFeed.length === 0 ? (
                                <div className="text-center py-10 space-y-3">
                                    <LiquidSiriOrb size={44} state="idle" />
                                    <p className="text-xs text-[#8C7265] max-w-xs mx-auto">
                                        No programmatic actions recorded yet. Tell the assistant to schedule slots, adjust tasks, or create roadmap nodes.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-[56vh] overflow-y-auto pr-1">
                                    {activityFeed.map((act) => (
                                        <div
                                            key={act.id}
                                            className="p-3.5 rounded-2xl bg-white/85 border border-[#EDE0D0] hover:border-[#FF8A5B]/50 transition-all space-y-1.5 shadow-xs"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#EDE6DA] text-[#5C4638]">
                                                    {act.actionType}
                                                </span>
                                                <span className="text-[10px] text-[#8C7265] font-mono">{act.time}</span>
                                            </div>
                                            <div className="text-xs font-bold text-[#2B2420]">{act.title}</div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-[#7A8B5C] font-semibold pt-1 border-t border-[#EDE0D0]/50">
                                                <span>✓</span>
                                                <span>Programmatic State Mutation Applied</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
}

// ==========================================================================
// 6. WEEKLY SCHEDULE MATRIX HEATMAP COMPONENT
// Wave/row-based stagger on load, cell inspector modal, sprint checklist.
// ==========================================================================

function LeetCodeHeatmapComponent({ 
    todayTasks, 
    toggleTodayTask, 
    newTaskInput, 
    setNewTaskInput, 
    newTaskCategory, 
    setNewTaskCategory, 
    handleAddTask, 
    weeklyMatrix,
    days,
    onCellClick,
    onSelectFocusTarget,
    setActiveTab,
    onDeleteTask,
    aiHighlightId
}) {
    const safeTasks = Array.isArray(todayTasks) ? todayTasks : [];
    const completedCount = safeTasks.filter(t => t && t.completed).length;
    const totalTasksCount = safeTasks.length;
    const progressPct = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;
    const safeMatrix = (weeklyMatrix && typeof weeklyMatrix === 'object') ? weeklyMatrix : {};
    const safeDays = Array.isArray(days) && days.length > 0 ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Subtasks & Accordion State
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [subtasksMap, setSubtasksMap] = useState({
        1: [
            { id: 'st1-1', title: 'Implement doubly linked list node structure', completed: true },
            { id: 'st1-2', title: 'Bind std::unordered_map for O(1) key lookup', completed: true },
            { id: 'st1-3', title: 'Add capacity eviction logic', completed: true }
        ],
        3: [
            { id: 'st3-1', title: 'Derive Jacobian autograd formulas', completed: true },
            { id: 'st3-2', title: 'Implement NumPy vectorized batch multiplication', completed: true },
            { id: 'st3-3', title: 'Verify shape compatibility in PyTorch', completed: true }
        ],
        5: [
            { id: 'st5-1', title: 'Calculate Q, K, V matrix projections', completed: true },
            { id: 'st5-2', title: 'Compute scaled dot-product attention scores', completed: false },
            { id: 'st5-3', title: 'Apply dropout and output linear layer', completed: false }
        ]
    });
    const [newSubtaskText, setNewSubtaskText] = useState('');

    // Continuous 17-Hour Time Slots (07:00 AM to 11:00 PM)
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = 7; h <= 23; h++) {
            const h12 = (h % 12 === 0) ? 12 : (h % 12);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const label = `${String(h12).padStart(2, '0')}:00 ${ampm}`;
            slots.push({ hour: h, label });
        }
        return slots;
    }, []);

    // Live Smart Task Parser
    const parsedBadge = useMemo(() => {
        if (!newTaskInput || !newTaskInput.trim()) return null;
        const lower = newTaskInput.toLowerCase();
        let detectedSubject = null;
        if (/ml|pytorch|transformer|vector|autograd|model|neural|deep learning/.test(lower)) {
            detectedSubject = 'Machine Learning';
        } else if (/c\+\+|lru|grpc|pointer|system|memory|raii|threads/.test(lower)) {
            detectedSubject = 'C++ Systems';
        } else if (/chem|nmr|spectro|quantum|gibbs|organic|reaction/.test(lower)) {
            detectedSubject = 'BS Chemistry';
        }

        let detectedTime = null;
        const tm = newTaskInput.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
        if (tm) detectedTime = tm[1].toUpperCase();

        if (!detectedSubject && !detectedTime) return null;
        return { detectedSubject, detectedTime };
    }, [newTaskInput]);

    const handleSmartSubmit = (e) => {
        e?.preventDefault();
        if (parsedBadge?.detectedSubject && setNewTaskCategory) {
            setNewTaskCategory(parsedBadge.detectedSubject);
        }
        if (handleAddTask) {
            handleAddTask(e);
        }
        triggerHaptic(15);
    };

    const toggleSubtask = (taskId, subtaskId) => {
        setSubtasksMap(prev => {
            const list = prev[taskId] || [];
            return {
                ...prev,
                [taskId]: list.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st)
            };
        });
        triggerHaptic(10);
    };

    const handleAddSubtask = (taskId) => {
        if (!newSubtaskText.trim()) return;
        setSubtasksMap(prev => {
            const list = prev[taskId] || [];
            return {
                ...prev,
                [taskId]: [...list, { id: `st_${Date.now()}`, title: newSubtaskText.trim(), completed: false }]
            };
        });
        setNewSubtaskText('');
        triggerHaptic(12);
    };

    return (
        <div className="space-y-6 animate-fade-in-scale">
            {/* Header Deck */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#DCD1C0]/60">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Execution Matrix</span>
                        <span className="text-xs font-mono text-[#8C7265]">C++ Optimized (46.3 μs)</span>
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-[#2B2420] mt-1">
                        Weekly Schedule & Sprint Checklist
                    </h2>
                    <p className="text-xs text-[#5C4638] mt-0.5">
                        High-resolution 7-day timetable matrix aligned with today's actionable study habits.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/80 border border-[#DCD1C0] text-[#5C4638]">
                        📅 Week 4 of Semester
                    </span>
                </div>
            </div>

            {/* DUAL PANE LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT PANE: TODAY'S SPRINT CHECKLIST */}
                <div className="lg:col-span-5 apple-glass-panel p-6 shadow-sm space-y-5">
                    <div className="flex justify-between items-center pb-3 border-b border-[#DCD1C0]/60">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Daily Action Hub</div>
                            <h3 className="font-serif text-xl font-bold text-[#2B2420]">Today's Sprint Checklist</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-[#2B2420]">
                                <CountUpNumber value={completedCount} /> of {totalTasksCount} Done
                            </span>
                            <div className="text-[10px] text-[#8C7265] font-mono">{progressPct}% Met</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#EDE6DA] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-[#C4703F] to-[#7A8B5C] transition-all duration-500 ease-out"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* 100% Crushed Celebration Banner */}
                    {progressPct === 100 && totalTasksCount > 0 && (
                        <div className="p-3 rounded-2xl bg-[#E8EFE0] border border-[#BFD1A2] text-xs text-[#7A8B5C] font-bold flex items-center gap-2">
                            <span>🎯</span>
                            <span>You crushed today! All sprint tasks are 100% completed.</span>
                        </div>
                    )}

                    {/* Task List */}
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        {safeTasks.map((t) => {
                            const isExpanded = expandedTaskId === t.id;
                            const subtasks = subtasksMap[t.id] || [];
                            const completedSub = subtasks.filter(s => s.completed).length;
                            const isAiTargeted = aiHighlightId === `task_${t.id}`;

                            return (
                                <div
                                    key={t.id}
                                    className={`p-3.5 rounded-2xl bg-white/80 border border-[#DCD1C0]/60 hover:border-[#C4703F]/50 transition-all space-y-2.5 ${t.completed ? 'opacity-70 bg-white/40' : ''} ${isAiTargeted ? 'ai-pulse-highlight' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={!!t.completed}
                                                onChange={() => toggleTodayTask(t.id)}
                                                className="w-4 h-4 mt-0.5 accent-[#C4703F] rounded cursor-pointer"
                                            />
                                            <div className="min-w-0">
                                                <div className={`text-xs font-bold ${t.completed ? 'line-through text-[#8C7265]' : 'text-[#2B2420]'}`}>
                                                    {t.title}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EDE6DA] text-[#5C4638]">
                                                        {t.subject}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-[#8C7265]">
                                                        {t.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onSelectFocusTarget && onSelectFocusTarget(t.title)}
                                                className="text-xs text-[#8C7265] hover:text-[#C4703F] p-1.5 rounded-lg border-none bg-transparent cursor-pointer"
                                                title="Focus this task in Timer"
                                            >
                                                ⏱️
                                            </button>
                                            {onDeleteTask && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteTask(t.id)}
                                                    className="text-xs text-[#8C7265] hover:text-red-700 p-1.5 rounded-lg border-none bg-transparent cursor-pointer"
                                                    title="Delete task"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Subtasks Toggle */}
                                    <div className="pt-1 flex items-center justify-between border-t border-[#DCD1C0]/30 text-[10px] text-[#8C7265]">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                                            className="font-bold hover:text-[#2B2420] border-none bg-transparent cursor-pointer flex items-center gap-1"
                                        >
                                            <span>{isExpanded ? '▲ Hide Sub-steps' : '▼ Sub-steps'} ({completedSub}/{subtasks.length})</span>
                                        </button>
                                    </div>

                                    {/* Subtasks Accordion */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-1.5 pt-1 overflow-hidden"
                                            >
                                                {subtasks.map(st => (
                                                    <label key={st.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/60 p-1 rounded-lg">
                                                        <input 
                                                            type="checkbox"
                                                            checked={!!st.completed}
                                                            onChange={() => toggleSubtask(t.id, st.id)}
                                                            className="w-3 h-3 accent-[#C4703F] rounded"
                                                        />
                                                        <span className={st.completed ? 'line-through text-[#8C7265]' : 'text-[#2B2420]'}>
                                                            {st.title}
                                                        </span>
                                                    </label>
                                                ))}

                                                {/* Add Subtask input */}
                                                <div className="flex items-center gap-2 pt-1">
                                                    <input 
                                                        type="text"
                                                        value={newSubtaskText}
                                                        onChange={(e) => setNewSubtaskText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(t.id)}
                                                        placeholder="+ Sub-step..."
                                                        className="debossed-input flex-1 rounded-lg px-2 py-1 text-[11px]"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddSubtask(t.id)}
                                                        className="btn-caramel text-[10px] px-2 py-1 rounded-lg"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Task Form with Smart NLP Parser */}
                    <form onSubmit={handleSmartSubmit} className="pt-3 border-t border-[#DCD1C0]/60 space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-[#5C4638]">Quick-Add Task</span>
                            {parsedBadge && (
                                <span className="text-[10px] font-bold text-[#C4703F] bg-[#F5E6D8] px-2 py-0.5 rounded-md border border-[#E8C9B0]">
                                    ✨ Auto-parsed: {parsedBadge.detectedSubject || ''} {parsedBadge.detectedTime ? `• ${parsedBadge.detectedTime}` : ''}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input 
                                type="text"
                                value={newTaskInput || ''}
                                onChange={(e) => setNewTaskInput && setNewTaskInput(e.target.value)}
                                placeholder="e.g. PyTorch DataLoader 30min 4pm..."
                                className="debossed-input flex-1 rounded-xl px-3 py-2 text-xs"
                            />
                            <CustomSelect 
                                value={newTaskCategory || 'Machine Learning'}
                                onChange={setNewTaskCategory}
                                options={[
                                    { value: 'Machine Learning', label: 'ML' },
                                    { value: 'C++ Systems', label: 'C++' },
                                    { value: 'BS Chemistry', label: 'Chem' },
                                    { value: 'General', label: 'Gen' }
                                ]}
                            />
                            <MagneticButton 
                                type="submit"
                                className="btn-caramel text-xs px-3.5 py-2"
                            >
                                + Add
                            </MagneticButton>
                        </div>
                    </form>
                </div>

                {/* RIGHT PANE: COMPACT WEEKLY MATRIX (7 cols x 17 hrs) */}
                <div className="lg:col-span-7 apple-glass-panel p-6 shadow-sm space-y-5">
                    <div className="flex justify-between items-center pb-3 border-b border-[#DCD1C0]/60">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">7-Day Matrix</div>
                            <h3 className="font-serif text-xl font-bold text-[#2B2420]">Weekly Schedule Heatmap</h3>
                        </div>
                        <div className="text-[11px] text-[#8C7265] font-mono">
                            07:00 AM – 11:00 PM • Click Cell to Edit
                        </div>
                    </div>

                    {/* Heat Level Palette Legend */}
                    <div className="flex flex-wrap items-center justify-between text-xs py-2 px-3.5 bg-white/70 rounded-2xl border border-white/90">
                        <span className="font-bold text-[#2B2420]">Heat Level:</span>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 font-semibold text-[#6A3E1E]"><span className="w-3.5 h-3.5 rounded-sm bg-[#E8D6C0] border border-[#D4BA9E] inline-block"></span> 100%</span>
                            <span className="flex items-center gap-1 font-semibold text-[#7A5338]"><span className="w-3.5 h-3.5 rounded-sm bg-[#EFE4D6] border border-[#E0CFC0] inline-block"></span> 75%</span>
                            <span className="flex items-center gap-1 font-semibold text-[#5C4638]"><span className="w-3.5 h-3.5 rounded-sm bg-[#E8DECF] border border-[#D8CCA8] inline-block"></span> 50%</span>
                            <span className="flex items-center gap-1 font-semibold text-[#8C7265]"><span className="w-3.5 h-3.5 rounded-sm bg-[#F4EDE4] border border-[#E8DEC8] inline-block"></span> 25%</span>
                            <span className="flex items-center gap-1 font-medium text-[#A89587]"><span className="w-3.5 h-3.5 rounded-sm bg-white/80 border border-[#DCD1C0] inline-block"></span> Free</span>
                        </div>
                    </div>

                    {/* TABLE MATRIX GRID WITH WAVE STAGGER */}
                    <div className="overflow-x-auto">
                        <table className="weekly-matrix-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '65px' }}>Time</th>
                                    {safeDays.map(d => (
                                        <th key={d}>{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {timeSlots.map((slot, rowIndex) => {
                                    const timeKey = slot.label;
                                    const rowObj = safeMatrix[timeKey] || safeMatrix[slot.hour] || safeMatrix[String(slot.hour)] || {};

                                    return (
                                        <tr key={timeKey}>
                                            <td className="text-[10px] font-mono text-[#8C7265] font-semibold text-right pr-2 py-0.5 whitespace-nowrap">
                                                {timeKey}
                                            </td>

                                            {safeDays.map((day, colIndex) => {
                                                const cell = rowObj[day];
                                                const hasData = !!cell;
                                                const pct = cell?.pct ?? cell?.completionPct ?? 0;
                                                
                                                let cellClass = "cell-0";
                                                if (hasData && pct >= 90) cellClass = "cell-100";
                                                else if (hasData && pct >= 70) cellClass = "cell-75";
                                                else if (hasData && pct >= 40) cellClass = "cell-50";
                                                else if (hasData && pct >= 20) cellClass = "cell-25";

                                                const titleText = cell?.topic || cell?.title || cell?.label || '';
                                                let shortText = titleText;
                                                if (shortText.length > 8) shortText = shortText.substring(0, 7) + '…';

                                                const cellKey = `${day}_${slot.hour}`;
                                                const isAiTargeted = aiHighlightId === cellKey;
                                                const staggerDelay = `${(rowIndex * 0.02 + colIndex * 0.01).toFixed(3)}s`;

                                                return (
                                                    <td key={day}>
                                                        <div 
                                                            onClick={() => onCellClick && onCellClick({ time: timeKey, day, hour: slot.hour, ...cell, topic: titleText || 'Free Slot' })}
                                                            style={{ animationDelay: staggerDelay }}
                                                            className={`matrix-cell-box matrix-cell-animated ${cellClass} ${isAiTargeted ? 'ai-pulse-highlight' : ''}`}
                                                        >
                                                            <span className="truncate px-1 font-semibold text-[9px]">
                                                                {shortText || '•'}
                                                            </span>
                                                            
                                                            {/* Tooltip Box */}
                                                            <div className="matrix-tooltip">
                                                                <div className="font-bold text-[#FAF6EF]">{day} • {timeKey}</div>
                                                                <div className="text-[10px] text-[#C4703F] mt-0.5 font-semibold">
                                                                    {titleText || 'Free Slot'} ({pct}% Completed)
                                                                </div>
                                                                <div className="text-[10px] text-[#DCD1C0] mt-0.5">
                                                                    {cell?.description || (hasData ? 'Scheduled Block' : 'Available free study slot')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ==========================================================================
// 7. CIRCULAR ROADMAP DAG CANVAS COMPONENT
// SVG bezier curve stroke-draw animation, concentric rings, drawer editing.
// ==========================================================================

function ReactFlowRoadmapComponent({ 
    roadmapNodes = [], 
    edges = [], 
    onSelectNode, 
    selectedNodeId, 
    onAddMilestone,
    onAutoArrange,
    aiHighlightId
}) {
    const [canvasScale, setCanvasScale] = useState(1);
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.closest('.circular-node-container') || e.target.closest('button')) return;
        setIsDraggingCanvas(true);
        setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    };

    const handleMouseMove = (e) => {
        if (!isDraggingCanvas) return;
        setCanvasOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDraggingCanvas(false);
    };

    return (
        <div className="space-y-6 animate-fade-in-scale">
            {/* Header Deck */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#DCD1C0]/60">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Skill Dependency DAG</span>
                        <span className="text-xs font-mono text-[#8C7265]">Topological Order</span>
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-[#2B2420] mt-1">
                        Circular Competency Roadmap
                    </h2>
                    <p className="text-xs text-[#5C4638] mt-0.5">
                        Interactive DAG milestone builder. Click any node to edit prerequisites, resources, and progress.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <MagneticButton
                        onClick={() => {
                            if (onAutoArrange) onAutoArrange();
                            triggerHaptic(15);
                        }}
                        className="btn-tactile-secondary text-xs px-3.5 py-1.5"
                    >
                        ⚡ Auto-Arrange
                    </MagneticButton>
                    <MagneticButton
                        onClick={() => {
                            if (onAddMilestone) onAddMilestone();
                            triggerHaptic(15);
                        }}
                        className="btn-caramel text-xs px-4 py-1.5"
                    >
                        + Add Milestone
                    </MagneticButton>
                </div>
            </div>

            {/* Interactive Canvas Canvas Area */}
            <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="circular-roadmap-canvas apple-glass-panel p-6 shadow-sm relative overflow-hidden select-none cursor-grab active:cursor-grabbing min-h-[640px]"
            >
                {/* SVG Connecting Bezier Lines Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#C4703F" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#8B5A3C" stopOpacity="0.6" />
                        </linearGradient>
                    </defs>
                    {edges.map((edge) => {
                        const source = roadmapNodes.find(n => n.id === edge.source);
                        const target = roadmapNodes.find(n => n.id === edge.target);
                        if (!source || !target) return null;

                        const sx = (source.x || 100) + 32;
                        const sy = (source.y || 100) + 32;
                        const tx = (target.x || 300) + 32;
                        const ty = (target.y || 100) + 32;

                        const dx = Math.abs(tx - sx) * 0.5;
                        const pathData = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

                        return (
                            <path
                                key={edge.id}
                                d={pathData}
                                fill="none"
                                stroke="url(#edgeGradient)"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                className="svg-dag-path-draw"
                            />
                        );
                    })}
                </svg>

                {/* Milestone Nodes Floating Layer */}
                <div 
                    style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`, transformOrigin: '0 0' }}
                    className="relative w-full h-full z-10 transition-transform duration-75 ease-out"
                >
                    {roadmapNodes.map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        const status = node.status?.toLowerCase() || 'target';
                        const pct = node.completionPct || 0;
                        const isAiTargeted = aiHighlightId === node.id;

                        return (
                            <div
                                key={node.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectNode(node.id);
                                    triggerHaptic(15);
                                }}
                                style={{ left: `${node.x || 80}px`, top: `${node.y || 80}px` }}
                                className={`circular-node-container absolute flex items-center gap-3 p-2 rounded-3xl bg-white/80 hover:bg-white border transition-all cursor-pointer ${isSelected ? 'ring-2 ring-[#C4703F] shadow-lg' : 'border-[#DCD1C0]/60 shadow-sm'} ${isAiTargeted ? 'ai-pulse-highlight' : ''}`}
                            >
                                {/* Concentric Apple Fitness Style Mastery Ring */}
                                <div className="relative w-12 h-12 flex items-center justify-center">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15" fill="none" stroke="#EDE6DA" strokeWidth="3" />
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="15"
                                            fill="none"
                                            stroke={status === 'mastered' ? '#7A8B5C' : '#C4703F'}
                                            strokeWidth="3"
                                            strokeDasharray="94.2"
                                            strokeDashoffset={94.2 - (94.2 * pct) / 100}
                                            strokeLinecap="round"
                                            className="transition-all duration-700 ease-out"
                                        />
                                    </svg>
                                    <span className="absolute font-mono text-[10px] font-bold text-[#2B2420]">
                                        {pct}%
                                    </span>
                                </div>

                                <div className="pr-3">
                                    <div className="text-xs font-bold text-[#2B2420] truncate max-w-[160px]">
                                        {node.title}
                                    </div>
                                    <div className="text-[10px] text-[#8C7265] flex items-center gap-2 mt-0.5">
                                        <span>{node.difficulty || 'Intermediate'}</span>
                                        <span>•</span>
                                        <span>{node.estHours || 10}h</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// 8. INTERACTIVE NODE DRAWER COMPONENT
// Slide-in editor for roadmap milestones with shared morph animation.
// ==========================================================================

function InteractiveNodeDrawer({ node, isOpen, onClose, onUpdateNode, onDeleteNode }) {
    if (!isOpen || !node) return null;

    const [title, setTitle] = useState(node.title || '');
    const [status, setStatus] = useState(node.status || 'IN_PROGRESS');
    const [completionPct, setCompletionPct] = useState(node.completionPct || 50);
    const [estHours, setEstHours] = useState(node.estHours || 10);
    const [difficulty, setDifficulty] = useState(node.difficulty || 'Intermediate');
    const [notes, setNotes] = useState(node.notes || '');

    const handleSave = () => {
        onUpdateNode(node.id, {
            title,
            status,
            completionPct: parseInt(completionPct, 10) || 0,
            estHours: parseInt(estHours, 10) || 10,
            difficulty,
            notes
        });
        triggerHaptic(15);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div onClick={onClose} className="fixed inset-0 bg-[#2B2420]/30 backdrop-blur-sm" />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                className="relative w-full max-w-md bg-[#FAF6EF] h-full shadow-2xl p-6 flex flex-col space-y-6 overflow-y-auto border-l border-[#DCD1C0] z-10"
            >
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-[#DCD1C0]/60">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4703F]">DAG Node Inspector</div>
                        <h3 className="font-serif text-xl font-bold text-[#2B2420]">Milestone Details</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-[#EDE6DA] hover:bg-[#DCD1C0] flex items-center justify-center text-xs text-[#5C4638] border-none cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 flex-1">
                    <div>
                        <label className="text-xs font-bold text-[#5C4638] block mb-1">Milestone Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="debossed-input w-full rounded-xl px-3 py-2 text-xs"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-[#5C4638] block mb-1">Mastery Status</label>
                            <CustomSelect
                                value={status}
                                onChange={setStatus}
                                options={[
                                    { value: 'MASTERED', label: 'Mastered' },
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'IN_PROGRESS', label: 'In Progress' },
                                    { value: 'TARGET', label: 'Target' }
                                ]}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-[#5C4638] block mb-1">Difficulty</label>
                            <CustomSelect
                                value={difficulty}
                                onChange={setDifficulty}
                                options={[
                                    { value: 'Beginner', label: 'Beginner' },
                                    { value: 'Intermediate', label: 'Intermediate' },
                                    { value: 'Advanced', label: 'Advanced' }
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-[#5C4638]">Mastery Percentage</label>
                            <span className="font-mono text-xs font-bold text-[#C4703F]">{completionPct}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={completionPct}
                            onChange={(e) => setCompletionPct(e.target.value)}
                            className="w-full accent-[#C4703F] cursor-pointer"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5C4638] block mb-1">Estimated Hours</label>
                        <input
                            type="number"
                            value={estHours}
                            onChange={(e) => setEstHours(e.target.value)}
                            className="debossed-input w-full rounded-xl px-3 py-2 text-xs"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5C4638] block mb-1">Study Notes & Resources</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            placeholder="Add links to documentation, lecture slides, or practice problem sets..."
                            className="debossed-input w-full rounded-xl p-3 text-xs resize-none"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[#DCD1C0]/60 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm('Delete this milestone from roadmap?')) {
                                onDeleteNode(node.id);
                                onClose();
                            }
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-bold border-none bg-transparent cursor-pointer"
                    >
                        🗑️ Delete Node
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-tactile-secondary text-xs px-4 py-2"
                        >
                            Cancel
                        </button>
                        <MagneticButton
                            type="button"
                            onClick={handleSave}
                            className="btn-caramel text-xs px-5 py-2"
                        >
                            Save Changes
                        </MagneticButton>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ==========================================================================
// 9. PERFORMANCE TRACKER & MASTERY TELEMETRY COMPONENT
// Concentric rings, interactive doughnut drill-down, 90-day heatmap.
// ==========================================================================

function PerformanceTrackerComponent({ scores = {}, logs = [], weeklyMatrix = {}, onOpenCheckin, onAddChecklistTask }) {
    const [heatmapRange, setHeatmapRange] = useState('this_week'); // 'this_week' | 'last_week' | '4_week'
    const [expandedSubjects, setExpandedSubjects] = useState({ ml: false, cpp: false, chem: false });
    const [shareToast, setShareToast] = useState(null);

    // Study Consistency Range State (persisted to localStorage)
    const [consistencyRange, setConsistencyRange] = useState(() => {
        try {
            return localStorage.getItem('navadish_consistency_range') || '90';
        } catch (e) {
            return '90';
        }
    });

    const [customDaysInput, setCustomDaysInput] = useState(() => {
        try {
            return localStorage.getItem('navadish_consistency_custom_days') || '60';
        } catch (e) {
            return '60';
        }
    });

    const [appliedCustomDays, setAppliedCustomDays] = useState(() => {
        try {
            return parseInt(localStorage.getItem('navadish_consistency_custom_days') || '60', 10);
        } catch (e) {
            return 60;
        }
    });

    const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
    const [hoveredDay, setHoveredDay] = useState(null);

    const showToast = (msg) => {
        setShareToast(msg);
        triggerHaptic(15);
        setTimeout(() => setShareToast(null), 3000);
    };

    const handleSelectRange = (rangeKey) => {
        setConsistencyRange(rangeKey);
        try {
            localStorage.setItem('navadish_consistency_range', rangeKey);
        } catch (e) {}
        if (rangeKey === 'custom') {
            setIsCustomPickerOpen(true);
        } else {
            setIsCustomPickerOpen(false);
        }
        triggerHaptic(10);
    };

    const handleApplyCustomDays = (e) => {
        e?.preventDefault();
        const parsed = parseInt(customDaysInput, 10);
        if (!isNaN(parsed) && parsed >= 7 && parsed <= 180) {
            setAppliedCustomDays(parsed);
            try {
                localStorage.setItem('navadish_consistency_custom_days', String(parsed));
                localStorage.setItem('navadish_consistency_range', 'custom');
            } catch (err) {}
            setIsCustomPickerOpen(false);
            showToast(`Applied ${parsed}-day study consistency range`);
        } else {
            showToast('Please enter a day range between 7 and 180');
        }
    };

    const effectiveDays = useMemo(() => {
        if (consistencyRange === '7') return 7;
        if (consistencyRange === '30') return 30;
        if (consistencyRange === '90') return 90;
        return Math.max(7, Math.min(180, appliedCustomDays || 60));
    }, [consistencyRange, appliedCustomDays]);

    const consistencyTitle = `${effectiveDays}-Day Study Consistency`;

    // Deterministic Study Consistency Telemetry Generator
    const consistencyDaysData = useMemo(() => {
        const arr = [];
        const subjects = [
            'Machine Learning Specialization',
            'C++ Systems & Memory Allocators',
            'BS Chemistry Kinetics',
            'PyTorch Model Optimization',
            'Concurrent Lock-Free Ring Buffer'
        ];
        const now = new Date();

        for (let i = 0; i < effectiveDays; i++) {
            const daysAgo = effectiveDays - 1 - i;
            const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const fullDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            const hash = ((i * 47 + 19) % 100);
            let intensity = 0;
            let hours = 0;
            let sessions = 0;
            let subject = 'Rest & Cognitive Recovery';

            if (hash < 16) {
                intensity = 0;
                hours = 0;
                sessions = 0;
            } else if (hash < 42) {
                intensity = 1;
                hours = 1.5;
                sessions = 1;
                subject = subjects[i % subjects.length];
            } else if (hash < 72) {
                intensity = 2;
                hours = 3.0;
                sessions = 2;
                subject = subjects[(i + 1) % subjects.length];
            } else if (hash < 90) {
                intensity = 3;
                hours = 4.5;
                sessions = 2;
                subject = subjects[(i + 2) % subjects.length];
            } else {
                intensity = 4;
                hours = 6.0;
                sessions = 3;
                subject = subjects[(i + 3) % subjects.length];
            }

            arr.push({
                index: i,
                date: d,
                dayOfWeek,
                monthDay,
                fullDate,
                intensity,
                hours,
                sessions,
                subject
            });
        }
        return arr;
    }, [effectiveDays]);

    const totalConsistencyHours = useMemo(() => {
        return consistencyDaysData.reduce((acc, d) => acc + d.hours, 0).toFixed(1);
    }, [consistencyDaysData]);

    const activeDaysCount = useMemo(() => {
        return consistencyDaysData.filter(d => d.hours > 0).length;
    }, [consistencyDaysData]);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Continuous 17-Hour Time Slots (07:00 AM to 11:00 PM)
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = 7; h <= 23; h++) {
            const h12 = (h % 12 === 0) ? 12 : (h % 12);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const label = `${String(h12).padStart(2, '0')}:00 ${ampm}`;
            slots.push({ hour: h, label });
        }
        return slots;
    }, []);

    const ringsData = [
        { label: 'ML Specialization', pct: 88, target: '45/50 hrs', color: '#C4703F', radius: 42 },
        { label: 'C++ Systems', pct: 74, target: '37/50 hrs', color: '#8B5A3C', radius: 30 },
        { label: 'BS Chemistry', pct: 92, target: '41/45 hrs', color: '#7A8B5C', radius: 18 }
    ];

    const weakTopics = [
        { id: 'w1', title: 'Backprop Jacobian Matrix Math', daysUntouched: 9, subject: 'Machine Learning', score: 38 },
        { id: 'w2', title: 'C++ Move Semantics & RAII Allocators', daysUntouched: 6, subject: 'C++ Systems', score: 45 },
        { id: 'w3', title: 'NMR Chemical Shift Coupling Constants', daysUntouched: 8, subject: 'BS Chemistry', score: 42 }
    ];

    const subjectCardsData = [
        {
            id: 'ml',
            title: 'Machine Learning Specialization',
            shortName: 'ML Specialization',
            totalHours: '18.5 hrs',
            changePct: '+14%',
            isPositive: true,
            masteryPct: 88,
            color: '#C4703F',
            sparkline: [2.5, 3.0, 1.5, 4.0, 3.5, 2.0, 2.0],
            subtopics: [
                { name: 'PyTorch Autograd & Backprop', hours: '6.5h', mastery: 92 },
                { name: 'Multi-Head Attention & Transformers', hours: '7.0h', mastery: 80 },
                { name: 'Cross-Entropy & Cost Functions', hours: '5.0h', mastery: 94 }
            ]
        },
        {
            id: 'cpp',
            title: 'C++ Systems & Memory Allocators',
            shortName: 'C++ Systems',
            totalHours: '14.0 hrs',
            changePct: '+8%',
            isPositive: true,
            masteryPct: 74,
            color: '#8B5A3C',
            sparkline: [1.5, 2.0, 2.5, 1.5, 3.0, 2.0, 1.5],
            subtopics: [
                { name: 'RAII & Custom Arena Allocators', hours: '5.5h', mastery: 82 },
                { name: 'Lock-Free Concurrent Ring Buffer', hours: '4.5h', mastery: 65 },
                { name: 'gRPC Serialization & Protobuf', hours: '4.0h', mastery: 75 }
            ]
        },
        {
            id: 'chem',
            title: 'BS Chemistry Kinetics & Spectroscopy',
            shortName: 'BS Chemistry',
            totalHours: '11.5 hrs',
            changePct: '-3%',
            isPositive: false,
            masteryPct: 92,
            color: '#7A8B5C',
            sparkline: [2.0, 1.5, 2.0, 2.0, 1.5, 1.5, 1.0],
            subtopics: [
                { name: '1H-NMR Chemical Shifts & Coupling', hours: '4.0h', mastery: 95 },
                { name: 'Gibbs Free Energy & Rate Laws', hours: '4.5h', mastery: 90 },
                { name: 'Electrochemical Half-Cells', hours: '3.0h', mastery: 91 }
            ]
        }
    ];

    const timeOfDayData = [
        { label: 'Morning', window: '06:00 – 12:00', pct: 24, hours: '12.5h', isPeak: false },
        { label: 'Afternoon', window: '12:00 – 17:00', pct: 28, hours: '14.2h', isPeak: false },
        { label: 'Evening', window: '17:00 – 22:00', pct: 40, hours: '20.5h', isPeak: true },
        { label: 'Night', window: '22:00 – 04:00', pct: 8, hours: '4.0h', isPeak: false }
    ];

    const toggleSubjectExpand = (id) => {
        setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
        triggerHaptic(10);
    };

    const handleExportPdf = () => {
        window.print();
        showToast('📄 Print preview / PDF export opened');
    };

    const handleCopySummary = () => {
        const text = `NavaDish Weekly Academic Report
Total Focus Time: 44.0 hrs · Cognitive Retention: ${scores.dailyScore || 88}/100
• Machine Learning: 18.5 hrs (88% mastery, +14% vs last week)
• C++ Systems: 14.0 hrs (74% mastery, +8% vs last week)
• BS Chemistry: 11.5 hrs (92% mastery, -3% vs last week)
Peak Window: Evening (17:00 - 22:00) · Night Owl Alignment Optimal`;
        navigator.clipboard?.writeText?.(text);
        showToast('📋 Weekly summary copied to clipboard!');
    };

    const handleShareProgress = () => {
        navigator.clipboard?.writeText?.(window.location.href);
        showToast('🚀 Progress summary link copied!');
    };

    return (
        <div className="space-y-8 animate-fade-in-scale pb-12">
            
            {/* 1. HERO HEADER SECTION */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#DCD1C0]/60">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Telemetry & Analytics</span>
                        <span className="text-xs font-mono text-[#8C7265]">Apple Health Grade Rings</span>
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-[#2B2420] mt-1">
                        Performance & Mastery Engine
                    </h2>
                    <p className="text-xs text-[#5C4638] mt-0.5">
                        Deep cognitive retention telemetry, multi-ring subject velocity, and bottleneck detector.
                    </p>
                </div>

                <MagneticButton
                    onClick={() => {
                        if (onOpenCheckin) onOpenCheckin();
                        triggerHaptic(15);
                    }}
                    className="btn-caramel text-xs px-5 py-2.5 shadow-md"
                >
                    ✍️ Log Study Check-in
                </MagneticButton>
            </div>

            {/* TOAST FEEDBACK NOTIFICATION */}
            {shareToast && (
                <div className="fixed top-20 right-8 z-50 p-3 rounded-2xl bg-[#2B2420] text-white text-xs shadow-xl flex items-center gap-2 message-pop-in">
                    <span>✨</span>
                    <span>{shareToast}</span>
                </div>
            )}

            {/* 2. STUDY CONSISTENCY HEATMAP (TOP ANCHOR OF PAGE) */}
            <div className="apple-glass-panel p-6 shadow-sm space-y-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-[#DCD1C0]/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Momentum Telemetry</span>
                            <span className="text-[10px] font-mono text-[#8C7265]">Primary Anchor</span>
                        </div>
                        <h3 className="font-serif text-2xl font-bold text-[#2B2420] mt-0.5">
                            {consistencyTitle}
                        </h3>
                        <p className="text-xs text-[#8C7265] mt-0.5">
                            Daily study intensity and deep work consolidation across active semester timeframe.
                        </p>
                    </div>

                    {/* Segmented Pill Toggle: "7 Days | 30 Days | 90 Days | Custom" */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex bg-[#EDE6DA]/80 p-1 rounded-xl border border-[#DCD1C0]/70 text-xs font-bold">
                            {[
                                { id: '7', label: '7 Days' },
                                { id: '30', label: '30 Days' },
                                { id: '90', label: '90 Days' },
                                { id: 'custom', label: 'Custom' }
                            ].map(item => {
                                const isSelected = consistencyRange === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectRange(item.id)}
                                        className={`px-3 py-1 rounded-lg transition-all border-none cursor-pointer ${isSelected ? 'bg-white text-[#C4703F] shadow-sm' : 'text-[#8C7265] bg-transparent hover:text-[#2B2420]'}`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Inline Custom Date/Day Picker */}
                        {isCustomPickerOpen && (
                            <form onSubmit={handleApplyCustomDays} className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#FFD88A] shadow-xs message-pop-in">
                                <span className="text-[11px] text-[#8C7265] pl-2 font-medium">Show last</span>
                                <input
                                    type="number"
                                    min="7"
                                    max="180"
                                    value={customDaysInput}
                                    onChange={(e) => setCustomDaysInput(e.target.value)}
                                    className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold text-center border border-[#DCD1C0] rounded-lg outline-none focus:border-[#C4703F]"
                                    autoFocus
                                />
                                <span className="text-[11px] text-[#8C7265] font-medium">days</span>
                                <button
                                    type="submit"
                                    className="px-2.5 py-1 rounded-lg bg-[#C4703F] text-white text-[11px] font-bold border-none cursor-pointer hover:bg-[#8B5A3C] transition-colors"
                                >
                                    Apply
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Live Hover Telemetry Readout Bar */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-white/90 via-[#FAF6EF] to-white/90 border border-[#EDE0D0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <span className="text-base">{hoveredDay ? (hoveredDay.hours > 0 ? '🔥' : '☕') : '💡'}</span>
                        <div className="text-xs text-[#2B2420]">
                            {hoveredDay ? (
                                <span>
                                    <b className="font-bold text-[#2B2420]">{hoveredDay.fullDate}</b>
                                    <span className="text-[#8C7265] mx-1.5">—</span>
                                    <span className="font-bold text-[#C4703F]">
                                        {hoveredDay.hours > 0 ? `${hoveredDay.hours} hrs studied` : 'Rest & Cognitive Recovery'}
                                    </span>
                                    <span className="text-[#8C7265] ml-1.5">
                                        ({hoveredDay.subject} {hoveredDay.sessions > 0 ? `· ${hoveredDay.sessions} sessions` : ''})
                                    </span>
                                </span>
                            ) : (
                                <span className="text-[#8C7265]">
                                    Hover any day cell to inspect deep cognitive telemetry & subject allocation
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#8C7265] self-end sm:self-auto">
                        <span className="font-bold text-[#2B2420]">{activeDaysCount}</span> active days
                        <span>•</span>
                        <span className="font-bold text-[#C4703F]">{totalConsistencyHours}h</span> logged
                    </div>
                </div>

                {/* DYNAMIC GRID RENDERING BASED ON RANGE */}
                {consistencyRange === '7' ? (
                    // 7 Days: 7 large blocks in a single row with day-of-week labels & hours
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                        {consistencyDaysData.map((d, idx) => {
                            let bgClass = "bg-white/80 border-[#DCD1C0]/70 text-[#8C7265]";
                            let pillClass = "bg-[#EDE6DA] text-[#5C4638]";
                            if (d.intensity === 4) {
                                bgClass = "bg-[#8B5A3C] border-[#72482E] text-white shadow-sm";
                                pillClass = "bg-white/20 text-white";
                            } else if (d.intensity === 3) {
                                bgClass = "bg-[#C4703F] border-[#A85C30] text-white shadow-sm";
                                pillClass = "bg-white/20 text-white";
                            } else if (d.intensity === 2) {
                                bgClass = "bg-[#D4A574] border-[#BD9162] text-white shadow-sm";
                                pillClass = "bg-white/20 text-white";
                            } else if (d.intensity === 1) {
                                bgClass = "bg-[#EFE6DB] border-[#DFCFC0] text-[#2B2420]";
                                pillClass = "bg-[#DFCFC0] text-[#5C4638]";
                            }

                            const isEdgeLeft = idx === 0;
                            const isEdgeRight = idx === consistencyDaysData.length - 1;
                            const alignClass = isEdgeLeft ? 'align-left' : (isEdgeRight ? 'align-right' : '');

                            return (
                                <div
                                    key={idx}
                                    onMouseEnter={() => setHoveredDay(d)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                    className={`consistency-cell ${alignClass} p-3.5 rounded-2xl border flex flex-col justify-between min-h-[110px] transition-all ${bgClass}`}
                                >
                                    <div>
                                        <div className="flex justify-between items-center text-[11px] font-bold">
                                            <span>{d.dayOfWeek}</span>
                                            <span className="font-mono opacity-80 text-[10px]">{d.monthDay}</span>
                                        </div>
                                        <div className="font-serif text-2xl font-bold mt-2">
                                            {d.hours > 0 ? `${d.hours}h` : 'Rest'}
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-between items-center text-[10px]">
                                        <span className={`px-2 py-0.5 rounded-md font-mono font-bold ${pillClass}`}>
                                            {d.sessions > 0 ? `${d.sessions} sess` : 'Off'}
                                        </span>
                                        <span className="truncate max-w-[65px] font-medium opacity-90">
                                            {d.hours > 0 ? d.subject.split(' ')[0] : 'Rest'}
                                        </span>
                                    </div>

                                    {/* Safe Tooltip */}
                                    <div className="consistency-tooltip">
                                        <div className="font-bold text-[#FAF6EF]">{d.fullDate}</div>
                                        <div className="text-[10px] text-[#FFD88A] mt-0.5 font-semibold">
                                            {d.hours > 0 ? `${d.hours} hrs studied · ${d.subject}` : 'Rest & Recovery Day'}
                                        </div>
                                        <div className="text-[9px] text-[#DCD1C0] mt-0.5 font-mono">
                                            {d.sessions > 0 ? `${d.sessions} deep work sessions logged` : 'No active study logged'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : consistencyRange === '30' ? (
                    // 30 Days: Calendar-style grid (~4-5 rows of 7 columns)
                    <div className="space-y-2">
                        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-[#8C7265] pb-1">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
                                <span key={w}>{w}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {consistencyDaysData.map((d, idx) => {
                                let bgClass = "bg-white/80 border-[#DCD1C0]";
                                let textClass = "text-[#8C7265]";
                                if (d.intensity === 4) {
                                    bgClass = "bg-[#8B5A3C] border-[#72482E]";
                                    textClass = "text-white font-bold";
                                } else if (d.intensity === 3) {
                                    bgClass = "bg-[#C4703F] border-[#A85C30]";
                                    textClass = "text-white font-bold";
                                } else if (d.intensity === 2) {
                                    bgClass = "bg-[#D4A574] border-[#BD9162]";
                                    textClass = "text-white font-semibold";
                                } else if (d.intensity === 1) {
                                    bgClass = "bg-[#EDE6DA] border-[#DCD1C0]";
                                    textClass = "text-[#5C4638]";
                                }

                                const col = idx % 7;
                                const alignClass = col === 0 ? 'align-left' : (col === 6 ? 'align-right' : '');

                                return (
                                    <div
                                        key={idx}
                                        onMouseEnter={() => setHoveredDay(d)}
                                        onMouseLeave={() => setHoveredDay(null)}
                                        className={`consistency-cell ${alignClass} p-2 rounded-xl border flex flex-col justify-between h-14 transition-all ${bgClass}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-mono ${textClass}`}>{d.date.getDate()}</span>
                                            {d.hours > 0 && (
                                                <span className={`text-[9px] font-mono font-bold ${textClass}`}>
                                                    {d.hours}h
                                                </span>
                                            )}
                                        </div>
                                        <div className="truncate text-[9px] font-medium opacity-85">
                                            {d.hours > 0 ? d.subject.split(' ')[0] : '·'}
                                        </div>

                                        {/* Safe Tooltip */}
                                        <div className="consistency-tooltip">
                                            <div className="font-bold text-[#FAF6EF]">{d.fullDate}</div>
                                            <div className="text-[10px] text-[#FFD88A] mt-0.5 font-semibold">
                                                {d.hours > 0 ? `${d.hours} hrs · ${d.subject} · ${d.sessions} sess` : 'Rest Day (0 hrs)'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // 90 Days or Custom (N days): Standard multi-week contribution matrix
                    <div className="p-4 bg-white/65 rounded-2xl border border-white/90">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-start">
                            {consistencyDaysData.map((d, idx) => {
                                let bgClass = "bg-white/80 border border-[#DCD1C0]";
                                if (d.intensity === 4) bgClass = "bg-[#8B5A3C] border border-[#72482E]";
                                else if (d.intensity === 3) bgClass = "bg-[#C4703F] border border-[#A85C30]";
                                else if (d.intensity === 2) bgClass = "bg-[#D4A574] border border-[#BD9162]";
                                else if (d.intensity === 1) bgClass = "bg-[#EDE6DA] border border-[#DCD1C0]";

                                const isEdgeLeft = idx % 22 < 2;
                                const isEdgeRight = idx % 22 > 19;
                                const alignClass = isEdgeLeft ? 'align-left' : (isEdgeRight ? 'align-right' : '');

                                return (
                                    <div
                                        key={idx}
                                        onMouseEnter={() => setHoveredDay(d)}
                                        onMouseLeave={() => setHoveredDay(null)}
                                        className={`consistency-cell ${alignClass} w-4 h-4 sm:w-5 sm:h-5 rounded-md ${bgClass}`}
                                    >
                                        {/* Safe Tooltip */}
                                        <div className="consistency-tooltip">
                                            <div className="font-bold text-[#FAF6EF]">{d.fullDate}</div>
                                            <div className="text-[10px] text-[#FFD88A] mt-0.5 font-semibold">
                                                {d.hours > 0 ? `${d.hours} hrs · ${d.subject} · ${d.sessions} sess` : 'Rest Day (0 hrs)'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Heatmap Footer Legend & Chain Motivator */}
                <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-[#8C7265] pt-2 border-t border-[#DCD1C0]/50 gap-2">
                    <span className="font-mono text-[11px] text-[#C4703F]">Don't break the chain · Consistency compounds</span>
                    <div className="flex items-center gap-2 text-[11px]">
                        <span>Less active</span>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-sm bg-white/80 border border-[#DCD1C0]" title="0 hrs (Rest)"></span>
                            <span className="w-3 h-3 rounded-sm bg-[#EDE6DA]" title="1.5 hrs"></span>
                            <span className="w-3 h-3 rounded-sm bg-[#D4A574]" title="3.0 hrs"></span>
                            <span className="w-3 h-3 rounded-sm bg-[#C4703F]" title="4.5 hrs"></span>
                            <span className="w-3 h-3 rounded-sm bg-[#8B5A3C]" title="6.0+ hrs"></span>
                        </div>
                        <span>More active</span>
                    </div>
                </div>
            </div>

            {/* 3. WEEKLY SCHEDULE HEATMAP */}
            <div className="apple-glass-panel p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#DCD1C0]/60">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Schedule Telemetry</div>
                        <h3 className="font-serif text-xl font-bold text-[#2B2420]">Weekly Schedule Heatmap</h3>
                        <p className="text-[11px] text-[#8C7265] mt-0.5">Mirrored read-only 7-day schedule intensity mapping across 17 hours</p>
                    </div>

                    {/* Segmented Toggle: "This Week" / "Last Week" / "4-Week Average" */}
                    <div className="flex bg-[#EDE6DA]/80 p-1 rounded-xl border border-[#DCD1C0]/70 text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => { setHeatmapRange('this_week'); triggerHaptic(10); }}
                            className={`px-3 py-1 rounded-lg transition-all border-none cursor-pointer ${heatmapRange === 'this_week' ? 'bg-white text-[#C4703F] shadow-sm' : 'text-[#8C7265] bg-transparent'}`}
                        >
                            This Week
                        </button>
                        <button
                            type="button"
                            onClick={() => { setHeatmapRange('last_week'); triggerHaptic(10); }}
                            className={`px-3 py-1 rounded-lg transition-all border-none cursor-pointer ${heatmapRange === 'last_week' ? 'bg-white text-[#C4703F] shadow-sm' : 'text-[#8C7265] bg-transparent'}`}
                        >
                            Last Week
                        </button>
                        <button
                            type="button"
                            onClick={() => { setHeatmapRange('4_week'); triggerHaptic(10); }}
                            className={`px-3 py-1 rounded-lg transition-all border-none cursor-pointer ${heatmapRange === '4_week' ? 'bg-white text-[#C4703F] shadow-sm' : 'text-[#8C7265] bg-transparent'}`}
                        >
                            4-Week Average
                        </button>
                    </div>
                </div>

                {/* Heat Level Palette Legend */}
                <div className="flex flex-wrap items-center justify-between text-xs py-2 px-3.5 bg-white/70 rounded-2xl border border-white/90">
                    <span className="font-bold text-[#2B2420]">Study Intensity:</span>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold text-[#6A3E1E]"><span className="w-3.5 h-3.5 rounded-sm bg-[#E8D6C0] border border-[#D4BA9E] inline-block"></span> 100%</span>
                        <span className="flex items-center gap-1 font-semibold text-[#7A5338]"><span className="w-3.5 h-3.5 rounded-sm bg-[#EFE4D6] border border-[#E0CFC0] inline-block"></span> 75%</span>
                        <span className="flex items-center gap-1 font-semibold text-[#5C4638]"><span className="w-3.5 h-3.5 rounded-sm bg-[#E8DECF] border border-[#D8CCA8] inline-block"></span> 50%</span>
                        <span className="flex items-center gap-1 font-semibold text-[#8C7265]"><span className="w-3.5 h-3.5 rounded-sm bg-[#F4EDE4] border border-[#E8DEC8] inline-block"></span> 25%</span>
                        <span className="flex items-center gap-1 font-medium text-[#A89587]"><span className="w-3.5 h-3.5 rounded-sm bg-white/80 border border-[#DCD1C0] inline-block"></span> Available</span>
                    </div>
                </div>

                {/* Read-Only Mirrored Table Matrix Grid */}
                <div className="overflow-x-auto">
                    <table className="weekly-matrix-table">
                        <thead>
                            <tr>
                                <th style={{ width: '65px' }}>Time</th>
                                {days.map(d => (
                                    <th key={d}>{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map((slot) => {
                                const timeKey = slot.label;
                                const rowObj = weeklyMatrix[timeKey] || weeklyMatrix[slot.hour] || weeklyMatrix[String(slot.hour)] || {};

                                return (
                                    <tr key={timeKey}>
                                        <td className="text-[10px] font-mono text-[#8C7265] font-semibold text-right pr-2 py-0.5 whitespace-nowrap">
                                            {timeKey}
                                        </td>

                                        {days.map((day) => {
                                            const cell = rowObj[day];
                                            const hasData = !!cell;
                                            
                                            // Intensity calculation based on toggle
                                            let pct = cell?.pct ?? cell?.completionPct ?? 0;
                                            if (heatmapRange === 'last_week' && hasData) {
                                                pct = Math.max(20, Math.min(100, pct - 10));
                                            } else if (heatmapRange === '4_week' && hasData) {
                                                pct = Math.round((pct + 75) / 2);
                                            }

                                            let cellClass = "cell-0";
                                            if (hasData && pct >= 90) cellClass = "cell-100";
                                            else if (hasData && pct >= 70) cellClass = "cell-75";
                                            else if (hasData && pct >= 40) cellClass = "cell-50";
                                            else if (hasData && pct >= 20) cellClass = "cell-25";

                                            // FIX: Empty/free cells show subtle dot '·' instead of literal "Free" text
                                            const isFreeSlot = !hasData || !cell?.topic || cell.topic === 'Free' || cell.topic === 'Free Slot' || pct === 0;
                                            const titleText = isFreeSlot ? 'Open Focus Period' : (cell.topic || cell.title || 'Active Block');
                                            let shortText = isFreeSlot ? '' : titleText;
                                            if (shortText.length > 8) shortText = shortText.substring(0, 7) + '…';

                                            return (
                                                <td key={day}>
                                                    <div className={`matrix-cell-box ${cellClass} cursor-default`}>
                                                        {isFreeSlot ? (
                                                            <span className="text-[#C8BDB0] select-none text-[10px] font-bold">·</span>
                                                        ) : (
                                                            <span className="truncate px-1 font-semibold text-[9px]">
                                                                {shortText}
                                                            </span>
                                                        )}
                                                        <div className="matrix-tooltip">
                                                            <div className="font-bold text-[#FAF6EF]">{day} • {timeKey}</div>
                                                            <div className="text-[10px] text-[#C4703F] mt-0.5 font-semibold">
                                                                {isFreeSlot ? 'Open Focus Period (0% Intensity)' : `${titleText} (${pct}% Intensity)`}
                                                            </div>
                                                            <div className="text-[10px] text-[#DCD1C0] mt-0.5">
                                                                {isFreeSlot ? 'Available for deep work or rest' : (heatmapRange === 'this_week' ? 'Current Week Telemetry' : (heatmapRange === 'last_week' ? 'Historical Week 3' : '4-Week Moving Baseline'))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. SUBJECT BREAKDOWN CARDS */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Curriculum Velocity</div>
                        <h3 className="font-serif text-xl font-bold text-[#2B2420]">Active Subject Breakdowns</h3>
                    </div>
                    <span className="text-xs text-[#8C7265] font-mono">Click card to expand sub-topics</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {subjectCardsData.map((sub) => {
                        const isExpanded = !!expandedSubjects[sub.id];

                        return (
                            <div
                                key={sub.id}
                                className="apple-glass-panel p-5 shadow-sm space-y-4 transition-all hover:shadow-md border border-white/80 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    {/* Card Header with Mastery Badge */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <div className="text-xs font-bold text-[#2B2420]">{sub.shortName}</div>
                                            <div className="font-serif text-2xl font-bold text-[#2B2420] mt-0.5">
                                                {sub.totalHours}
                                            </div>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${sub.isPositive ? 'bg-[#E8EFE0] text-[#7A8B5C]' : 'bg-[#FBEBEB] text-[#B5484A]'}`}>
                                            {sub.isPositive ? '▲' : '▼'} {sub.changePct}
                                        </span>
                                    </div>

                                    {/* Mastery % Bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-semibold text-[#8C7265]">
                                            <span>Mastery Score</span>
                                            <span className="font-mono font-bold text-[#2B2420]">{sub.masteryPct}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-[#EDE6DA] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${sub.masteryPct}%`, backgroundColor: sub.color }}
                                            />
                                        </div>
                                    </div>

                                    {/* Mini Sparkline Bars (Mon - Sun) */}
                                    <div className="pt-2 border-t border-[#DCD1C0]/60">
                                        <div className="flex justify-between items-center text-[10px] text-[#8C7265] mb-1.5 font-semibold">
                                            <span>Weekly Daily Cadence</span>
                                            <span>7-Day Sparkline</span>
                                        </div>
                                        <div className="flex items-end justify-between h-8 gap-1 px-1">
                                            {sub.sparkline.map((val, idx) => {
                                                const heightPct = Math.round((val / 4.0) * 100);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="flex-1 rounded-sm transition-all hover:scale-110"
                                                        style={{
                                                            height: `${heightPct}%`,
                                                            backgroundColor: sub.color,
                                                            opacity: 0.6 + (idx * 0.06)
                                                        }}
                                                        title={`${days[idx]}: ${val} hrs`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Expandable Sub-topic Breakdown */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="pt-3 border-t border-[#DCD1C0]/60 space-y-2 overflow-hidden"
                                            >
                                                <div className="text-[10px] uppercase font-bold text-[#8C7265]">Sub-topic Allocation</div>
                                                {sub.subtopics.map((st, idx) => (
                                                    <div key={idx} className="p-2 rounded-xl bg-white/70 border border-[#DCD1C0]/50 text-xs space-y-1">
                                                        <div className="flex justify-between font-medium text-[#2B2420]">
                                                            <span className="truncate pr-2">{st.name}</span>
                                                            <span className="font-mono text-[10px] text-[#8C7265]">{st.hours}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-[#7A8B5C]">
                                                            <span>Mastery</span>
                                                            <span className="font-mono font-bold">{st.mastery}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => toggleSubjectExpand(sub.id)}
                                    className="w-full mt-2 py-1.5 rounded-xl bg-[#EDE6DA]/70 hover:bg-[#EDE6DA] text-xs font-bold text-[#5C4638] transition-colors border-none cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <span>{isExpanded ? 'Collapse Sub-topics' : 'View Sub-topics'}</span>
                                    <span>{isExpanded ? '▴' : '▾'}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 5. SEMESTER COURSEWORK VELOCITY + COGNITIVE RETENTION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="apple-glass-panel p-6 flex items-center gap-6 md:col-span-2 shadow-sm">
                    {/* Concentric Rings SVG */}
                    <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                            {ringsData.map((r) => {
                                const circ = 2 * Math.PI * r.radius;
                                const offset = circ - (circ * r.pct) / 100;
                                return (
                                    <React.Fragment key={r.label}>
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r={r.radius}
                                            fill="none"
                                            stroke="#EDE6DA"
                                            strokeWidth="7"
                                        />
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r={r.radius}
                                            fill="none"
                                            stroke={r.color}
                                            strokeWidth="7"
                                            strokeDasharray={circ}
                                            strokeDashoffset={offset}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="font-mono text-xl font-bold text-[#2B2420]">
                                <CountUpNumber value={85} suffix="%" />
                            </span>
                            <span className="text-[9px] uppercase tracking-widest text-[#8C7265] font-bold">Velocity</span>
                        </div>
                    </div>

                    {/* Ring Descriptions */}
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-[#2B2420] uppercase tracking-wider">Semester Coursework Velocity</h4>
                            <span className="text-[10px] font-mono text-[#8C7265]">Target Hours</span>
                        </div>
                        {ringsData.map((r) => (
                            <div key={r.label} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }}></span>
                                        <span className="text-[#2B2420]">{r.label}</span>
                                    </span>
                                    <span className="font-mono text-xs text-[#5C4638] flex items-center gap-2">
                                        <span className="text-[10px] text-[#8C7265]">{r.target}</span>
                                        <b>{r.pct}%</b>
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-[#EDE6DA] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cognitive Retention Score Card */}
                <div className="apple-glass-panel p-6 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4703F]">Cognitive Retention Score</div>
                        <h3 className="font-serif text-3xl font-bold text-[#2B2420] mt-1">
                            <CountUpNumber value={scores.dailyScore || 88} suffix=" / 100" />
                        </h3>
                        <p className="text-xs text-[#5C4638] mt-1">
                            +4.2% vs yesterday. Memory consolidation curve trending above benchmark target.
                        </p>
                    </div>

                    <div className="pt-3 border-t border-[#DCD1C0]/60 flex justify-between items-center text-xs font-mono text-[#8C7265]">
                        <span>🔥 4-Day Focus Streak</span>
                        <span className="text-[#7A8B5C] font-bold">Optimal Flow</span>
                    </div>
                </div>
            </div>

            {/* 6. WEAK-TOPIC DETECTOR (SURFACING DECAYING RETENTION) */}
            <div className="apple-glass-panel p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#DCD1C0]/60">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Memory Decay Telemetry</div>
                            <h4 className="font-serif text-xl font-bold text-[#2B2420]">Weak-Topic Bottleneck Detector</h4>
                        </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#B5484A] bg-[#FBEBEB] border border-[#F5CACA] px-3 py-1 rounded-full">
                        3 Topics Require Spaced Repetition
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {weakTopics.map(wt => (
                        <div key={wt.id} className="p-4 rounded-2xl bg-white/80 border border-[#DCD1C0]/70 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm transition-shadow">
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#EDE6DA] text-[#5C4638]">
                                        {wt.subject}
                                    </span>
                                    <span className="text-[10px] text-[#B5484A] font-bold bg-[#FBEBEB] px-1.5 py-0.5 rounded">
                                        Untouched {wt.daysUntouched}d
                                    </span>
                                </div>
                                <div className="text-xs font-bold text-[#2B2420] mt-2 leading-snug">
                                    {wt.title}
                                </div>
                                <div className="text-[11px] text-[#8C7265] mt-1">
                                    Cognitive Retention: <span className="font-bold text-[#B5484A]">{wt.score}%</span> (Critical decay threshold)
                                </div>
                            </div>
                            <MagneticButton
                                onClick={() => {
                                    if (onAddChecklistTask) onAddChecklistTask(wt.title, wt.subject);
                                    triggerHaptic(15);
                                    showToast(`Added "${wt.title}" to today's sprint!`);
                                }}
                                className="btn-caramel text-[11px] w-full py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <span>✍️</span>
                                <span>+ Add to Today's Checklist</span>
                            </MagneticButton>
                        </div>
                    ))}
                </div>
            </div>

            {/* 7. TIME-OF-DAY PRODUCTIVITY BREAKDOWN */}
            <div className="apple-glass-panel p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-center pb-2 border-b border-[#DCD1C0]/60">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#C4703F]">Chronobiology Telemetry</div>
                        <h4 className="font-serif text-xl font-bold text-[#2B2420]">Time-of-Day Productivity Breakdown</h4>
                    </div>
                    <span className="text-xs font-mono text-[#8C7265]">Weekly Aggregate</span>
                </div>

                {/* Horizontal Bars */}
                <div className="space-y-4">
                    {timeOfDayData.map((tod) => (
                        <div key={tod.label} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#2B2420]">{tod.label}</span>
                                    <span className="text-[10px] font-mono text-[#8C7265]">({tod.window})</span>
                                    {tod.isPeak && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD88A] text-[#5C4638] font-bold uppercase tracking-wider">
                                            🔥 Peak Productivity
                                        </span>
                                    )}
                                </div>
                                <span className="font-mono text-xs text-[#5C4638]">
                                    <b>{tod.hours}</b> ({tod.pct}%)
                                </span>
                            </div>

                            <div className="w-full h-3 bg-[#EDE6DA] rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${tod.isPeak ? 'bg-gradient-to-r from-[#C4703F] to-[#8B5A3C]' : 'bg-[#D4A574]'}`}
                                    style={{ width: `${tod.pct}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chronotype Peak Alignment Callout Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFF8F0] to-[#FAF6EF] border border-[#FFD88A] flex items-center gap-3">
                    <span className="text-2xl">🌙</span>
                    <div>
                        <div className="text-xs font-bold text-[#2B2420]">
                            Chronotype Alignment: Night Owl Profile Detected
                        </div>
                        <p className="text-xs text-[#5C4638] mt-0.5 leading-relaxed">
                            Peak cognitive capacity aligns with your <b>19:00 – 22:00</b> evening block. 68% of deep work was successfully completed during this optimal biological phase.
                        </p>
                    </div>
                </div>
            </div>

            {/* 8. EXPORT / SHARE ACTION ROW */}
            <div className="apple-glass-panel p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/90">
                <div className="flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <div>
                        <div className="text-xs font-bold text-[#2B2420]">Academic Telemetry Report</div>
                        <div className="text-[10px] text-[#8C7265]">Export analytics data or share weekly progress summary</div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleExportPdf}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white hover:bg-[#F5E6D8] border border-[#DCD1C0] text-xs font-bold text-[#5C4638] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                        <span>📄</span>
                        <span>Export as PDF</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleCopySummary}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white hover:bg-[#F5E6D8] border border-[#DCD1C0] text-xs font-bold text-[#5C4638] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                        <span>📋</span>
                        <span>Copy Weekly Summary</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleShareProgress}
                        className="flex-1 sm:flex-none btn-caramel text-xs px-4 py-2 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <span>🚀</span>
                        <span>Share Progress</span>
                    </button>
                </div>
            </div>

        </div>
    );
}


// ==========================================================================
// 10. SETUP WIZARD & LIVING SETTINGS HUB
// Re-entrant settings view, chronotype, multi-course reordering, deadlines.
// ==========================================================================

function SetupWizardOverlay({ isOpen, userPrefs, onSavePrefs, onClose }) {
    if (!isOpen) return null;

    const [wakeTime, setWakeTime] = useState(userPrefs?.wakeTime || '07:00');
    const [sleepTime, setSleepTime] = useState(userPrefs?.sleepTime || '23:00');
    const [chronotype, setChronotype] = useState(userPrefs?.chronotype || 'night_owl');
    const [courses, setCourses] = useState(userPrefs?.courses ? [...userPrefs.courses] : []);
    const [deadlines, setDeadlines] = useState(userPrefs?.deadlines ? [...userPrefs.deadlines] : []);
    const [pomoDuration, setPomoDuration] = useState(userPrefs?.pomoDuration || 25);

    const [newCourseTitle, setNewCourseTitle] = useState('');

    useEffect(() => {
        if (isOpen && userPrefs) {
            setWakeTime(userPrefs.wakeTime || '07:00');
            setSleepTime(userPrefs.sleepTime || '23:00');
            setChronotype(userPrefs.chronotype || 'night_owl');
            setCourses(userPrefs.courses ? [...userPrefs.courses] : []);
            setDeadlines(userPrefs.deadlines ? [...userPrefs.deadlines] : []);
            setPomoDuration(userPrefs.pomoDuration || 25);
        }
    }, [isOpen, userPrefs]);

    const handleAddCourse = (e) => {
        e?.preventDefault();
        if (!newCourseTitle.trim()) return;
        const newTitle = newCourseTitle.trim();
        setCourses(prev => [
            ...prev,
            { id: `c_${Date.now()}`, title: newTitle, priority: prev.length + 1 }
        ]);
        setNewCourseTitle('');
        triggerHaptic(15);
    };

    const handleSave = (e) => {
        e?.preventDefault?.();
        const updatedPrefs = {
            wakeTime,
            sleepTime,
            chronotype,
            courses,
            deadlines,
            pomoDuration: parseInt(pomoDuration, 10) || 25
        };
        onSavePrefs(updatedPrefs);
        triggerHaptic(15);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Blurred background overlay with onClick dismissal */}
            <div 
                onClick={onClose} 
                className="fixed inset-0 bg-[#2B2420]/40 backdrop-blur-md cursor-pointer"
                title="Click outside to close"
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl bg-[#FAF6EF] rounded-3xl shadow-2xl p-6 border border-white/90 z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-[#DCD1C0]/60">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#C4703F]">Settings Hub</div>
                        <h3 className="font-serif text-2xl font-bold text-[#2B2420]">Student Profile & Chronotype</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-[#EDE6DA] hover:bg-[#DCD1C0] flex items-center justify-center text-xs text-[#5C4638] border-none cursor-pointer transition-colors"
                        title="Close Settings"
                    >
                        ✕
                    </button>
                </div>

                {/* Chronotype Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-[#2B2420] block">When do you focus best? (Chronotype Bias)</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'early_bird', title: '🌅 Early Bird', desc: 'Peak 7 AM - 12 PM' },
                            { id: 'steady', title: '☀️ Steady Day', desc: 'Even 10 AM - 6 PM' },
                            { id: 'night_owl', title: '🌙 Night Owl', desc: 'Peak 7 PM - 11 PM' }
                        ].map(c => (
                            <div
                                key={c.id}
                                onClick={() => {
                                    setChronotype(c.id);
                                    triggerHaptic(10);
                                }}
                                className={`p-3 rounded-2xl border cursor-pointer transition-all ${chronotype === c.id ? 'bg-white border-[#C4703F] shadow-sm' : 'bg-[#EDE6DA]/40 border-[#DCD1C0] hover:bg-white/60'}`}
                            >
                                <div className="text-xs font-bold text-[#2B2420]">{c.title}</div>
                                <div className="text-[10px] text-[#8C7265] mt-0.5">{c.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Wake / Sleep Hours with Custom Apple HIG Time Pickers */}
                <div className="grid grid-cols-2 gap-4">
                    <CustomTimePicker
                        label="Wake Time"
                        value={wakeTime}
                        onChange={setWakeTime}
                    />
                    <CustomTimePicker
                        label="Sleep Time"
                        value={sleepTime}
                        onChange={setSleepTime}
                    />
                </div>

                {/* Enrolled Courses Management */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-[#2B2420] block">Enrolled Coursework & Priorities</label>
                        <span className="text-[10px] text-[#8C7265] font-mono">{courses.length} Active Courses</span>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {courses.map((course, idx) => (
                            <div key={course.id || idx} className="p-2.5 rounded-xl bg-white border border-[#DCD1C0]/60 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-[#EDE6DA] flex items-center justify-center font-mono text-[10px] font-bold text-[#5C4638]">
                                        {idx + 1}
                                    </span>
                                    <span className="font-bold text-[#2B2420]">{course.title}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCourses(prev => prev.filter((_, cIdx) => cIdx !== idx));
                                        triggerHaptic(10);
                                    }}
                                    className="text-[#8C7265] hover:text-red-600 border-none bg-transparent cursor-pointer font-bold px-1.5 py-0.5 rounded hover:bg-red-50"
                                    title="Remove course"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Course */}
                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="text"
                            value={newCourseTitle}
                            onChange={(e) => setNewCourseTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCourse(e)}
                            placeholder="Add course title (e.g. Distributed Systems)..."
                            className="debossed-input flex-1 rounded-xl px-3 py-1.5 text-xs"
                        />
                        <button
                            type="button"
                            onClick={handleAddCourse}
                            className="btn-caramel text-xs px-3.5 py-1.5 rounded-xl"
                        >
                            + Add
                        </button>
                    </div>
                </div>

                {/* Footer Controls: Cancel & Save Preferences */}
                <div className="pt-4 border-t border-[#DCD1C0]/60 flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-tactile-secondary text-xs px-4 py-2 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <MagneticButton
                        type="button"
                        onClick={handleSave}
                        className="btn-caramel text-xs px-5 py-2 cursor-pointer"
                    >
                        Save Preferences
                    </MagneticButton>
                </div>
            </motion.div>
        </div>
    );
}

// ==========================================================================
// 11. COMMAND BAR MODAL (CMD+K / CTRL+K)
// Spring entry, magnetic hover, executes through Action Registry.
// ==========================================================================

function CommandBarModal({
    isOpen,
    onClose,
    onNavigate,
    onStartPresetTimer,
    onOpenWizard,
    onOpenCheckin,
    todayTasks = [],
    roadmapNodes = []
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setTimeout(() => inputRef.current?.focus(), 60);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const navCommands = [
        { id: 'nav-heatmap', type: 'Navigation', title: 'Weekly Schedule Matrix Grid', icon: '🗓', action: () => { onNavigate('heatmap'); onClose(); } },
        { id: 'nav-roadmap', type: 'Navigation', title: 'Circular Roadmap DAG Engine', icon: '🗺', action: () => { onNavigate('roadmap'); onClose(); } },
        { id: 'nav-analytics', type: 'Navigation', title: 'Performance Analytics Telemetry', icon: '📊', action: () => { onNavigate('analytics'); onClose(); } },
        { id: 'nav-assistant', type: 'Navigation', title: 'AI Assistant Companion Drawer', icon: '✨', action: () => { onNavigate('assistant'); onClose(); } },
        { id: 'nav-wizard', type: 'Navigation', title: 'Settings & Chronotype Hub', icon: '⚡', action: () => { onOpenWizard(); onClose(); } }
    ];

    const quickActions = [
        { id: 'act-pomo25', type: 'Focus', title: 'Start 25m Pomodoro Focus Session', icon: '⏱', action: () => { onStartPresetTimer('pomodoro', 25); onClose(); } },
        { id: 'act-deep45', type: 'Focus', title: 'Start 45m Deep Work Session', icon: '🧠', action: () => { onStartPresetTimer('deepwork', 45); onClose(); } },
        { id: 'act-checkin', type: 'Telemetry', title: 'Log Post-Study Evaluation Check-in', icon: '✍️', action: () => { onOpenCheckin(); onClose(); } }
    ];

    const query = searchQuery.trim().toLowerCase();
    const matchedNav = navCommands.filter(c => c.title.toLowerCase().includes(query));
    const matchedActions = quickActions.filter(c => c.title.toLowerCase().includes(query));
    const matchedTasks = todayTasks.filter(t => t.title.toLowerCase().includes(query)).map(t => ({
        id: `t_${t.id}`,
        type: 'Sprint Task',
        title: t.title,
        icon: t.completed ? '✓' : '📌',
        action: () => { onNavigate('heatmap'); onClose(); }
    }));

    const results = query ? [...matchedNav, ...matchedActions, ...matchedTasks] : [...matchedNav, ...matchedActions];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
            <div onClick={onClose} className="fixed inset-0 bg-[#2B2420]/40 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -20 }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                className="relative w-full max-w-2xl bg-[#FAF6EF] rounded-3xl shadow-2xl border border-white/90 overflow-hidden z-10"
            >
                {/* Search Input */}
                <div className="p-4 border-b border-[#DCD1C0]/60 flex items-center gap-3 bg-white/70">
                    <span className="text-base text-[#8C7265]">🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search views, tasks, or actions (e.g. 'Roadmap', 'Deep Work', 'PyTorch')..."
                        className="w-full bg-transparent text-sm font-semibold text-[#2B2420] border-none outline-none"
                    />
                    <kbd className="text-[10px] font-mono font-bold bg-[#EDE6DA] text-[#5C4638] px-2 py-1 rounded-md">
                        ESC
                    </kbd>
                </div>

                {/* List Items */}
                <div className="max-h-96 overflow-y-auto p-3 space-y-1">
                    {results.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                triggerHaptic(15);
                                item.action();
                            }}
                            className="p-3 rounded-2xl hover:bg-white border border-transparent hover:border-[#DCD1C0]/60 transition-all flex items-center justify-between cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#EDE6DA] group-hover:bg-[#F5E6D8] flex items-center justify-center text-sm transition-colors">
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-[#2B2420] group-hover:text-[#C4703F]">
                                        {item.title}
                                    </div>
                                    <div className="text-[10px] text-[#8C7265] uppercase font-semibold">
                                        {item.type}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs text-[#8C7265] font-mono group-hover:text-[#C4703F]">↵ Select</span>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-2 bg-[#EDE6DA]/60 border-t border-[#DCD1C0]/60 flex justify-between items-center text-[10px] text-[#8C7265]">
                    <span>Press <strong className="text-[#2B2420]">Cmd+K / Ctrl+K</strong> anytime</span>
                    <span>NavaDish v3 Action Layer</span>
                </div>
            </motion.div>
        </div>
    );
}

// ==========================================================================
// 12. AUXILIARY MODALS: Cell Inspector, Focus Picker, Post-Session Checkin
// ==========================================================================

function CellInspectorModal({ cell, onClose, onSave }) {
    if (!cell) return null;

    const [title, setTitle] = useState(cell.topic || cell.title || '');
    const [description, setDescription] = useState(cell.description || '');
    const [status, setStatus] = useState(cell.status || 'GOAL_ML');
    const [completionPct, setCompletionPct] = useState(cell.pct ?? cell.completionPct ?? 100);

    const handleSave = () => {
        onSave({
            day: cell.day,
            hour: cell.hour,
            title,
            description,
            status,
            completionPct: parseInt(completionPct, 10) || 0
        });
        triggerHaptic(15);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={onClose} className="fixed inset-0 bg-[#2B2420]/30 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-[#FAF6EF] rounded-3xl p-6 shadow-2xl border border-white/90 z-10 space-y-4"
            >
                <div className="flex justify-between items-center pb-2 border-b border-[#DCD1C0]/60">
                    <div>
                        <span className="text-[10px] font-bold text-[#C4703F] uppercase tracking-wider">{cell.day} • {cell.time}</span>
                        <h3 className="font-serif text-xl font-bold text-[#2B2420]">Schedule Slot Inspector</h3>
                    </div>
                    <button onClick={onClose} className="w-6 h-6 rounded-full bg-[#EDE6DA] flex items-center justify-center text-xs border-none cursor-pointer">✕</button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-[#5C4638] block mb-1">Session Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="debossed-input w-full rounded-xl px-3 py-2 text-xs"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5C4638] block mb-1">Category / Status</label>
                        <CustomSelect
                            value={status}
                            onChange={setStatus}
                            options={[
                                { value: 'GOAL_ML', label: 'Machine Learning Study' },
                                { value: 'GOAL_SDE_DSA', label: 'C++ Systems & DSA' },
                                { value: 'CLASS_CHEM', label: 'BS Chemistry Class' },
                                { value: 'FREE', label: 'Available Free Slot' },
                                { value: 'MEAL', label: 'Meal Break' }
                            ]}
                        />
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-[#5C4638]">Completion Mastery</span>
                            <span className="font-mono font-bold text-[#C4703F]">{completionPct}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={completionPct}
                            onChange={(e) => setCompletionPct(e.target.value)}
                            className="w-full accent-[#C4703F] cursor-pointer"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5C4638] block mb-1">Session Notes</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Detailed instructions or practice goals..."
                            className="debossed-input w-full rounded-xl p-2.5 text-xs resize-none"
                        />
                    </div>
                </div>

                <div className="pt-3 border-t border-[#DCD1C0]/60 flex justify-end gap-2">
                    <button onClick={onClose} className="btn-tactile-secondary text-xs px-4 py-2">Cancel</button>
                    <MagneticButton onClick={handleSave} className="btn-caramel text-xs px-4 py-2">Save Slot</MagneticButton>
                </div>
            </motion.div>
        </div>
    );
}

function FocusTaskPickerModal({ isOpen, onClose, todayTasks = [], roadmapNodes = [], onSelectTarget }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={onClose} className="fixed inset-0 bg-[#2B2420]/30 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-[#FAF6EF] rounded-3xl p-6 shadow-2xl border border-white/90 z-10 space-y-4 max-h-[80vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center pb-2 border-b border-[#DCD1C0]/60">
                    <div>
                        <h4 className="font-serif text-lg font-bold text-[#2B2420]">Select Focus Target</h4>
                        <div className="text-[10px] text-[#8C7265]">Link timer to an active checklist task or roadmap node</div>
                    </div>
                    <button onClick={onClose} className="w-6 h-6 rounded-full bg-[#EDE6DA] flex items-center justify-center text-xs border-none cursor-pointer">✕</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="text-xs font-bold text-[#C4703F] uppercase tracking-wider mb-2">Today's Sprint Tasks</div>
                        <div className="space-y-1.5">
                            {todayTasks.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => {
                                        onSelectTarget(t.title);
                                        triggerHaptic(15);
                                        onClose();
                                    }}
                                    className="p-2.5 rounded-xl bg-white hover:bg-[#F5E6D8] border border-[#DCD1C0]/60 cursor-pointer flex items-center justify-between text-xs font-semibold"
                                >
                                    <span className="truncate">{t.title}</span>
                                    <span className="text-[10px] text-[#8C7265] font-mono">{t.subject}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-[#8B5A3C] uppercase tracking-wider mb-2">Active Roadmap Milestones</div>
                        <div className="space-y-1.5">
                            {roadmapNodes.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => {
                                        onSelectTarget(n.title);
                                        triggerHaptic(15);
                                        onClose();
                                    }}
                                    className="p-2.5 rounded-xl bg-white hover:bg-[#F5E6D8] border border-[#DCD1C0]/60 cursor-pointer flex items-center justify-between text-xs font-semibold"
                                >
                                    <span className="truncate">{n.title}</span>
                                    <span className="text-[10px] font-mono text-[#C4703F]">{n.completionPct || 0}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function PostSessionModal({ isOpen, onClose, onLogSession, taskName }) {
    if (!isOpen) return null;

    const [notes, setNotes] = useState('');
    const [pct, setPct] = useState(100);

    const handleSubmit = () => {
        onLogSession({
            taskTitle: taskName || 'Focus Session',
            completionPct: pct,
            notes,
            score: pct >= 90 ? 'MASTERED' : 'GOOD'
        });
        triggerHaptic(20);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={onClose} className="fixed inset-0 bg-[#2B2420]/40 backdrop-blur-md" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-[#FAF6EF] rounded-3xl p-6 shadow-2xl border border-white/90 z-10 space-y-4"
            >
                <div className="text-center space-y-1 pb-2 border-b border-[#DCD1C0]/60">
                    <span className="text-3xl">🎉</span>
                    <h3 className="font-serif text-xl font-bold text-[#2B2420]">Focus Session Logged!</h3>
                    <p className="text-xs text-[#5C4638]">Reflect on your study session to calibrate retention analytics.</p>
                </div>

                <div className="space-y-3 text-xs">
                    <div>
                        <div className="flex justify-between font-bold text-[#5C4638] mb-1">
                            <span>Self-Assessed Mastery</span>
                            <span className="text-[#C4703F] font-mono">{pct}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="100"
                            value={pct}
                            onChange={(e) => setPct(e.target.value)}
                            className="w-full accent-[#C4703F] cursor-pointer"
                        />
                    </div>

                    <div>
                        <label className="font-bold text-[#5C4638] block mb-1">Reflection / Derivations Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="What key insights or algorithmic steps did you lock in?"
                            className="debossed-input w-full rounded-xl p-2.5 text-xs resize-none"
                        />
                    </div>
                </div>

                <div className="pt-3 border-t border-[#DCD1C0]/60 flex justify-end gap-2">
                    <button onClick={onClose} className="btn-tactile-secondary text-xs px-4 py-2">Skip</button>
                    <MagneticButton onClick={handleSubmit} className="btn-caramel text-xs px-5 py-2">Save Reflection</MagneticButton>
                </div>
            </motion.div>
        </div>
    );
}

function UndoToast({ toast, onUndo }) {
    if (!toast) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#2B2420] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs font-medium"
        >
            <span>{toast.message}</span>
            <button
                onClick={onUndo}
                className="text-[#C4703F] font-bold hover:underline border-none bg-transparent cursor-pointer"
            >
                Undo
            </button>
        </motion.div>
    );
}

// ==========================================================================
// 13. MAIN APPLICATION ROOT COMPONENT
// Coordinates Global State, Action Registry, Navigation & Animations.
// ==========================================================================

function App() {
    const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap', 'roadmap', 'analytics', 'assistant', 'settings'
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    const [selectedCellForEdit, setSelectedCellForEdit] = useState(null);
    const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
    const [isPostSessionOpen, setIsPostSessionOpen] = useState(false);
    const [undoToast, setUndoToast] = useState(null);

    // AI Highlight Glow State: tracks element ID just mutated programmatically by AI
    const [aiHighlightId, setAiHighlightId] = useState(null);

    // Cmd+K Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsCommandBarOpen(prev => !prev);
                triggerHaptic(15);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // USER PREFERENCES STATE
    const [userPrefs, setUserPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem('navadish_v3_prefs');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            wakeTime: '07:00',
            sleepTime: '23:00',
            chronotype: 'night_owl',
            courses: [
                { id: 'c1', title: 'Machine Learning Specialization', category: 'Machine Learning', priority: 1 },
                { id: 'c2', title: 'C++ Systems & Memory Allocators', category: 'C++ Systems', priority: 2 },
                { id: 'c3', title: 'BS Chemistry Kinetics', category: 'BS Chemistry', priority: 3 }
            ],
            deadlines: [
                { id: 'd1', title: 'BS Chemistry Midterm Exam', date: '2026-10-15', urgency: 'high' }
            ],
            pomoDuration: 25
        };
    });

    useEffect(() => {
        try { localStorage.setItem('navadish_v3_prefs', JSON.stringify(userPrefs)); } catch (e) {}
    }, [userPrefs]);

    // TODAY TASKS CHECKLIST STATE
    const [todayTasks, setTodayTasks] = useState([
        { id: 1, title: 'Optimize C++ LRU Cache algorithm without DP overhead', subject: 'C++ Systems', time: '09:00 AM', completed: true },
        { id: 2, title: 'Quantum Mechanics & NMR Spectroscopy revision', subject: 'BS Chemistry', time: '11:30 AM', completed: true },
        { id: 3, title: 'ML Vectorization & Matrix Autograd derivation', subject: 'Machine Learning', time: '02:00 PM', completed: true },
        { id: 4, title: 'PyTorch DataLoader custom collate_fn practice', subject: 'Machine Learning', time: '04:30 PM', completed: true },
        { id: 5, title: 'LLM Multi-Head Attention QKV projection math', subject: 'Machine Learning', time: '07:00 PM', completed: false }
    ]);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState('Machine Learning');

    // ROADMAP NODES & EDGES STATE
    const [roadmapNodes, setRoadmapNodes] = useState([
        { id: 'n1', title: 'Linear Algebra & NumPy Vectors', category: 'Machine Learning', x: 80, y: 160, completionPct: 100, status: 'MASTERED', estHours: 8 },
        { id: 'n2', title: 'Gradient Descent & Cost Functions', category: 'Machine Learning', x: 300, y: 120, completionPct: 100, status: 'MASTERED', estHours: 10 },
        { id: 'n3', title: 'PyTorch Autograd & Backpropagation', category: 'Machine Learning', x: 520, y: 180, completionPct: 70, status: 'ACTIVE', estHours: 14 },
        { id: 'n4', title: 'Multi-Head Attention & Transformers', category: 'Machine Learning', x: 740, y: 140, completionPct: 25, status: 'IN_PROGRESS', estHours: 18 },
        { id: 'n5', title: 'C++ Memory Allocators & RAII', category: 'C++ Systems', x: 300, y: 340, completionPct: 80, status: 'MASTERED', estHours: 12 },
        { id: 'n6', title: 'Lock-Free Concurrent Ring Buffer', category: 'C++ Systems', x: 520, y: 380, completionPct: 40, status: 'IN_PROGRESS', estHours: 16 }
    ]);

    const [roadmapEdges, setRoadmapEdges] = useState([
        { id: 'e1-2', source: 'n1', target: 'n2' },
        { id: 'e2-3', source: 'n2', target: 'n3' },
        { id: 'e3-4', source: 'n3', target: 'n4' },
        { id: 'e1-5', source: 'n1', target: 'n5' },
        { id: 'e5-6', source: 'n5', target: 'n6' }
    ]);

    // WEEKLY MATRIX DATA STATE
    const [weeklyMatrix, setWeeklyMatrix] = useState({});

    // Fetch initial schedule from backend
    useEffect(() => {
        fetch('/api/schedule/weekly')
            .then(res => res.json())
            .then(data => {
                if (data && data.optimization && Array.isArray(data.optimization.grid)) {
                    const formatted = {};
                    data.optimization.grid.forEach(cell => {
                        const h12 = (cell.hour % 12 === 0) ? 12 : (cell.hour % 12);
                        const ampm = cell.hour >= 12 ? 'PM' : 'AM';
                        const timeLabel = `${String(h12).padStart(2, '0')}:00 ${ampm}`;
                        if (!formatted[timeLabel]) formatted[timeLabel] = {};
                        formatted[timeLabel][cell.day] = {
                            topic: cell.title,
                            description: cell.description,
                            status: cell.status,
                            completionPct: cell.completionPct || (cell.status === 'MEAL' ? 100 : (cell.status === 'SLEEP' ? 100 : 75))
                        };
                    });
                    setWeeklyMatrix(formatted);
                }
            })
            .catch(() => {
                // Fallback demo grid
                const formatted = {};
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                for (let h = 7; h <= 23; h++) {
                    const h12 = (h % 12 === 0) ? 12 : (h % 12);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const timeLabel = `${String(h12).padStart(2, '0')}:00 ${ampm}`;
                    formatted[timeLabel] = {};
                    days.forEach(d => {
                        formatted[timeLabel][d] = {
                            topic: h === 9 ? 'C++ Memory Systems' : (h === 14 ? 'PyTorch Model Dev' : 'Free Slot'),
                            completionPct: h === 9 ? 90 : (h === 14 ? 75 : 0)
                        };
                    });
                }
                setWeeklyMatrix(formatted);
            });
    }, []);

    // PERSISTENT FOCUS TIMER STATE
    const [timerState, setTimerState] = useState({
        isRunning: false,
        secondsLeft: 25 * 60,
        totalDuration: 25 * 60,
        preset: 'pomodoro',
        targetTask: 'ML Vectorization & Autograd',
        sessionsCompleted: 4
    });

    // Timer Ticking Effect (Persists across navigation tabs!)
    useEffect(() => {
        let interval = null;
        if (timerState.isRunning && timerState.secondsLeft > 0) {
            interval = setInterval(() => {
                setTimerState(prev => ({
                    ...prev,
                    secondsLeft: prev.secondsLeft - 1
                }));
            }, 1000);
        } else if (timerState.secondsLeft === 0 && timerState.isRunning) {
            setTimerState(prev => ({
                ...prev,
                isRunning: false,
                sessionsCompleted: prev.sessionsCompleted + 1
            }));
            setIsPostSessionOpen(true);
            triggerHaptic(50);
        }
        return () => clearInterval(interval);
    }, [timerState.isRunning, timerState.secondsLeft]);

    // AI ASSISTANT OVERLAY & MESSAGES STATE
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiMessages, setAiMessages] = useState([
        {
            id: 'm1',
            role: 'assistant',
            content: 'Hello Dishanth! I am your NavaDish v3 Academic & Career AI companion. I have active awareness of your 7-day schedule, active roadmap milestones, and today\'s checklist. How can I help optimize your study flow today?',
            timestamp: '09:00 AM'
        }
    ]);

    const [aiActivityFeed, setAiActivityFeed] = useState([
        { id: 'act_1', title: 'Scheduled 2h PyTorch Deep Work Session', actionType: 'updateScheduleCell', time: '10 mins ago' },
        { id: 'act_2', title: 'Auto-balanced Friday free slots for Chemistry exam', actionType: 'updateScheduleCell', time: '1 hour ago' },
        { id: 'act_3', title: 'Created DAG Milestone: Multi-Head Attention', actionType: 'createMilestone', time: 'Yesterday' }
    ]);

    // TRIGGER AI HIGHLIGHT GLOW (2.8 seconds)
    const triggerAiHighlight = (targetId) => {
        setAiHighlightId(targetId);
        setTimeout(() => {
            setAiHighlightId(null);
        }, 2800);
    };

    // ==========================================================================
    // CENTRAL ACTION REGISTRY DISPATCH PIPELINE
    // Single code path for both user button clicks & AI assistant program executions!
    // ==========================================================================
    const executeAction = useCallback((actionId, params = {}, source = 'user') => {
        console.log(`[ActionRegistry] Executing: ${actionId} (Source: ${source})`, params);

        let result = null;

        switch (actionId) {
            case 'addChecklistItem': {
                const newTask = {
                    id: Date.now(),
                    title: params.title || 'New Study Task',
                    subject: params.subject || 'Machine Learning',
                    time: params.time || 'Today',
                    completed: false
                };
                setTodayTasks(prev => [newTask, ...prev]);
                if (source === 'assistant') {
                    triggerAiHighlight(`task_${newTask.id}`);
                    setAiActivityFeed(prev => [{
                        id: `act_${Date.now()}`,
                        title: `Added "${newTask.title}" to checklist`,
                        actionType: 'addChecklistItem',
                        time: 'Just now'
                    }, ...prev]);
                }
                result = newTask;
                break;
            }

            case 'toggleChecklistItem': {
                setTodayTasks(prev => prev.map(t => t.id === params.id ? { ...t, completed: params.completed !== undefined ? params.completed : !t.completed } : t));
                if (source === 'assistant') {
                    triggerAiHighlight(`task_${params.id}`);
                }
                result = { id: params.id };
                break;
            }

            case 'deleteChecklistItem': {
                setTodayTasks(prev => prev.filter(t => t.id !== params.id));
                result = { id: params.id };
                break;
            }

            case 'updateScheduleCell': {
                const { day, hour, title, description, status, completionPct } = params;
                const h12 = (hour % 12 === 0) ? 12 : (hour % 12);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const timeLabel = `${String(h12).padStart(2, '0')}:00 ${ampm}`;

                setWeeklyMatrix(prev => {
                    const next = { ...prev };
                    if (!next[timeLabel]) next[timeLabel] = {};
                    next[timeLabel][day] = {
                        topic: title,
                        description: description || 'Scheduled Session',
                        status: status || 'GOAL_ML',
                        completionPct: completionPct !== undefined ? completionPct : 85
                    };
                    return next;
                });

                const cellKey = `${day}_${hour}`;
                if (source === 'assistant') {
                    triggerAiHighlight(cellKey);
                    setAiActivityFeed(prev => [{
                        id: `act_${Date.now()}`,
                        title: `Rescheduled ${day} ${timeLabel} to "${title}"`,
                        actionType: 'updateScheduleCell',
                        time: 'Just now'
                    }, ...prev]);
                }

                // Push to backend API
                fetch('/api/schedule/cell-edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ day, hour, title, description, status, completionPct })
                }).catch(() => {});

                result = { day, hour, title };
                break;
            }

            case 'createMilestone': {
                const newMilestone = {
                    id: `m_${Date.now()}`,
                    title: params.title || 'New Competency Milestone',
                    category: params.category || 'Machine Learning',
                    x: 600 + Math.floor(Math.random() * 80),
                    y: 200 + Math.floor(Math.random() * 120),
                    completionPct: 0,
                    status: 'TARGET',
                    estHours: params.estHours || 10,
                    difficulty: params.difficulty || 'Intermediate',
                    notes: params.notes || ''
                };
                setRoadmapNodes(prev => [...prev, newMilestone]);
                if (source === 'assistant') {
                    triggerAiHighlight(newMilestone.id);
                    setAiActivityFeed(prev => [{
                        id: `act_${Date.now()}`,
                        title: `Created Milestone: "${newMilestone.title}"`,
                        actionType: 'createMilestone',
                        time: 'Just now'
                    }, ...prev]);
                }
                result = newMilestone;
                break;
            }

            case 'updateMilestone': {
                setRoadmapNodes(prev => prev.map(n => n.id === params.id ? { ...n, ...params } : n));
                if (source === 'assistant') {
                    triggerAiHighlight(params.id);
                }
                result = { id: params.id };
                break;
            }

            case 'deleteMilestone': {
                setRoadmapNodes(prev => prev.filter(n => n.id !== params.id));
                setRoadmapEdges(prev => prev.filter(e => e.source !== params.id && e.target !== params.id));
                result = { id: params.id };
                break;
            }

            case 'autoArrangeRoadmap': {
                setRoadmapNodes(prev => prev.map((n, idx) => ({
                    ...n,
                    x: 100 + (idx % 3) * 220,
                    y: 120 + Math.floor(idx / 3) * 160
                })));
                result = { rearranged: true };
                break;
            }

            case 'startTimer': {
                const durMins = params.duration || 25;
                setTimerState(prev => ({
                    ...prev,
                    isRunning: true,
                    totalDuration: durMins * 60,
                    secondsLeft: durMins * 60,
                    preset: params.preset || 'pomodoro',
                    targetTask: params.targetTask || prev.targetTask
                }));
                if (source === 'assistant') {
                    triggerAiHighlight('timer');
                }
                result = { isRunning: true };
                break;
            }

            case 'pauseTimer': {
                setTimerState(prev => ({ ...prev, isRunning: false }));
                result = { isRunning: false };
                break;
            }

            case 'resetTimer': {
                setTimerState(prev => ({ ...prev, isRunning: false, secondsLeft: prev.totalDuration }));
                result = { reset: true };
                break;
            }

            case 'logEvaluationCheckin': {
                // Post to backend
                fetch('/api/performance/checkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                }).catch(() => {});
                result = params;
                break;
            }

            case 'changeWizardSettings': {
                setUserPrefs(prev => ({ ...prev, ...params }));
                result = params;
                break;
            }

            case 'navigateTo': {
                if (params.page) {
                    setActiveTab(params.page);
                    triggerHaptic(15);
                }
                result = { page: params.page };
                break;
            }

            default:
                console.warn(`[ActionRegistry] Unknown action: ${actionId}`);
        }

        return { success: true, actionId, result };
    }, []);

    // Return global app state snapshot for LLM context injection
    const getAppState = useCallback(() => {
        return {
            activeTab,
            userPrefs,
            todayTasks,
            roadmapNodes,
            roadmapEdges,
            timerState,
            aiActivityFeed
        };
    }, [activeTab, userPrefs, todayTasks, roadmapNodes, roadmapEdges, timerState, aiActivityFeed]);

    // Expose programmatic hooks to window for AI and DevTools
    useEffect(() => {
        window.NavaDish = {
            executeAction,
            getAppState,
            getActionSchemas,
            actionDefinitions: ACTION_DEFINITIONS
        };
    }, [executeAction, getAppState]);

    // AI Message Dispatcher (with realistic tool execution & model stub)
    const handleSendAiMessage = (userPrompt, attachments = []) => {
        const userMsg = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: userPrompt,
            attachments,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setAiMessages(prev => [...prev, userMsg]);
        setIsAiProcessing(true);

        // TODO: In production, send { prompt: userPrompt, attachments, state: getAppState(), tools: getActionSchemas() } to /api/ai/chat
        setTimeout(() => {
            let replyText = '';
            let toolCall = null;
            const lower = userPrompt.toLowerCase();

            if (lower.includes('schedule') && lower.includes('deep work')) {
                toolCall = {
                    name: 'updateScheduleCell',
                    id: 'updateScheduleCell',
                    params: { day: 'Tuesday', hour: 15, title: 'PyTorch Deep Work', description: 'Scheduled by AI', status: 'GOAL_ML', completionPct: 80 }
                };
                executeAction('updateScheduleCell', toolCall.params, 'assistant');
                replyText = `I have scheduled a 2-hour Deep Work focus session for PyTorch on Tuesday at 03:00 PM. The Weekly Matrix and C++ optimization microservice have updated this slot.`;
            } else if (lower.includes('add') && lower.includes('task')) {
                toolCall = {
                    name: 'addChecklistItem',
                    id: 'addChecklistItem',
                    params: { title: 'Backpropagation Jacobian & Chain Rule Derivation', subject: 'Machine Learning', time: '04:00 PM' }
                };
                executeAction('addChecklistItem', toolCall.params, 'assistant');
                replyText = `I've added "Backpropagation Jacobian & Chain Rule Derivation" to today's sprint checklist under Machine Learning. Notice the pulse highlight on your checklist!`;
            } else if (lower.includes('milestone') || lower.includes('roadmap')) {
                toolCall = {
                    name: 'createMilestone',
                    id: 'createMilestone',
                    params: { title: 'Graph Neural Networks & Message Passing', category: 'Machine Learning', estHours: 16, difficulty: 'Advanced' }
                };
                executeAction('createMilestone', toolCall.params, 'assistant');
                replyText = `Created a new DAG Milestone: "Graph Neural Networks & Message Passing" in your Circular Roadmap tech tree!`;
            } else {
                replyText = `I've analyzed your academic schedule and active courses (${userPrefs.courses.map(c => c.title).join(', ')}). Your ${userPrefs.chronotype.replace('_', ' ')} chronotype shows peak retention in the evening. Would you like me to allocate more study blocks or review your weak topics?`;
            }

            const aiReplyMsg = {
                id: `msg_${Date.now() + 1}`,
                role: 'assistant',
                content: replyText,
                actionTaken: toolCall,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setAiMessages(prev => [...prev, aiReplyMsg]);
            setIsAiProcessing(false);
            triggerHaptic(20);
        }, 850);
    };

    const contextSummary = `Weekly Matrix (${activeTab.toUpperCase()}) · ${todayTasks.filter(t => t.completed).length}/${todayTasks.length} Tasks Done`;

    return (
        <div className="min-h-screen bg-[#FAF6EF] text-[#2B2420] pb-24">
            
            {/* TOP NAVIGATION BAR ("Linear × Cron × Superhuman" Aesthetic) */}
            <header className="sticky top-0 z-30 bg-[#FAF6EF]/85 backdrop-blur-xl border-b border-[#DCD1C0]/70 py-3.5 px-4 sm:px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    
                    {/* Logo & Product Title */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('heatmap')}>
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#C4703F] to-[#8B5A3C] flex items-center justify-center text-white font-serif font-bold text-lg shadow-md">
                            N
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-serif text-lg font-bold text-[#2B2420] tracking-tight">NavaDish</h1>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EDE6DA] text-[#5C4638] font-semibold">
                                    v3.0 Engine
                                </span>
                            </div>
                            <div className="text-[10px] text-[#8C7265] hidden sm:block">Academic & Career Schedule Engine</div>
                        </div>
                    </div>

                    {/* Navigation Tabs Segmented Pill (4 Tabs: Matrix | Roadmap | Analytics | AI Assistant) */}
                    <nav className="macos-pill-nav">
                        {[
                            { id: 'heatmap', label: 'Matrix', icon: <GridIcon size={14} /> },
                            { id: 'roadmap', label: 'Roadmap', icon: <GitCommitIcon size={14} /> },
                            { id: 'analytics', label: 'Analytics', icon: <BarChartIcon size={14} /> },
                            { id: 'assistant', label: 'AI Assistant', icon: <SparklesIcon size={14} /> }
                        ].map(t => {
                            const isActive = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                        executeAction('navigateTo', { page: t.id }, 'user');
                                    }}
                                    className={`macos-pill-btn ${isActive ? 'active' : ''}`}
                                >
                                    {isActive && <div className="macos-pill-indicator"></div>}
                                    <span className="relative z-10 flex items-center gap-1.5">
                                        {t.icon}
                                        <span>{t.label}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Quick Access Actions */}
                    <div className="flex items-center gap-2">
                        <MagneticButton
                            onClick={() => setIsCommandBarOpen(true)}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#DCD1C0]/80 hover:border-[#C4703F] text-xs text-[#5C4638] shadow-sm"
                            title="Command Bar (Cmd+K)"
                        >
                            <span>🔍 Search</span>
                            <kbd className="text-[10px] font-mono bg-[#EDE6DA] text-[#5C4638] px-1.5 py-0.5 rounded">⌘K</kbd>
                        </MagneticButton>

                        <button
                            type="button"
                            onClick={() => setIsWizardOpen(true)}
                            className="p-2 rounded-full bg-white/80 hover:bg-white border border-[#DCD1C0]/80 text-[#5C4638] hover:text-[#2B2420] transition-colors cursor-pointer shadow-sm"
                            title="Settings & Chronotype Hub"
                        >
                            <SlidersIcon size={16} />
                        </button>
                    </div>

                </div>
            </header>

            {/* MAIN CONTENT AREA WITH PAGE-LEVEL ENTER/EXIT TRANSITIONS */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
                <AnimatePresence exitBeforeEnter>
                    {activeTab === 'heatmap' && (
                        <div key="tab-heatmap">
                            <LeetCodeHeatmapComponent
                                todayTasks={todayTasks}
                                toggleTodayTask={(id) => executeAction('toggleChecklistItem', { id }, 'user')}
                                newTaskInput={newTaskInput}
                                setNewTaskInput={setNewTaskInput}
                                newTaskCategory={newTaskCategory}
                                setNewTaskCategory={setNewTaskCategory}
                                handleAddTask={() => executeAction('addChecklistItem', { title: newTaskInput, subject: newTaskCategory }, 'user')}
                                weeklyMatrix={weeklyMatrix}
                                onCellClick={setSelectedCellForEdit}
                                onSelectFocusTarget={(target) => executeAction('startTimer', { targetTask: target }, 'user')}
                                setActiveTab={setActiveTab}
                                onDeleteTask={(id) => executeAction('deleteChecklistItem', { id }, 'user')}
                                aiHighlightId={aiHighlightId}
                            />
                        </div>
                    )}

                    {activeTab === 'roadmap' && (
                        <div key="tab-roadmap">
                            <ReactFlowRoadmapComponent
                                roadmapNodes={roadmapNodes}
                                edges={roadmapEdges}
                                selectedNodeId={selectedNodeId}
                                onSelectNode={(id) => {
                                    setSelectedNodeId(id);
                                    setIsDrawerOpen(true);
                                }}
                                onAddMilestone={() => executeAction('createMilestone', { title: 'New Competency Milestone' }, 'user')}
                                onAutoArrange={() => executeAction('autoArrangeRoadmap', {}, 'user')}
                                aiHighlightId={aiHighlightId}
                            />
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div key="tab-analytics">
                            <PerformanceTrackerComponent
                                scores={{ dailyScore: 88, weeklyScore: 82 }}
                                weeklyMatrix={weeklyMatrix}
                                onOpenCheckin={() => setIsPostSessionOpen(true)}
                                onAddChecklistTask={(title, subject) => executeAction('addChecklistItem', { title, subject }, 'user')}
                            />
                        </div>
                    )}

                    {activeTab === 'assistant' && (
                        <div key="tab-assistant">
                            <FullPageAIAssistant
                                messages={aiMessages}
                                onSendMessage={handleSendAiMessage}
                                isProcessing={isAiProcessing}
                                activityFeed={aiActivityFeed}
                                onExecuteAction={executeAction}
                                userPrefs={userPrefs}
                                aiHighlightId={aiHighlightId}
                                onUndoAction={(action) => {
                                    setUndoToast({
                                        message: `Undone action successfully`,
                                        onUndo: () => {}
                                    });
                                    setTimeout(() => setUndoToast(null), 3000);
                                }}
                                onClearMessages={() => {
                                    setAiMessages([
                                        {
                                            id: `m_${Date.now()}`,
                                            role: 'assistant',
                                            content: 'Conversation reset. How can I help optimize your schedule, coursework, or focus blocks today?',
                                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        }
                                    ]);
                                    setUndoToast({ message: 'Conversation reset' });
                                    setTimeout(() => setUndoToast(null), 2500);
                                }}
                            />
                        </div>
                    )}
                </AnimatePresence>
            </main>

            {/* PERSISTENT FLOATING FOCUS TIMER (BOTTOM-LEFT) */}
            <PersistentFloatingTimer
                timerState={timerState}
                onStartTimer={() => executeAction('startTimer', {}, 'user')}
                onPauseTimer={() => executeAction('pauseTimer', {}, 'user')}
                onResetTimer={() => executeAction('resetTimer', {}, 'user')}
                onSwitchPreset={(preset, dur) => executeAction('startTimer', { preset, duration: dur }, 'user')}
                onOpenTaskPicker={() => setIsTaskPickerOpen(true)}
                onCompleteSession={() => setIsPostSessionOpen(true)}
                aiHighlightId={aiHighlightId}
            />

            {/* FLOATING SIRI ORB LAUNCHER (BOTTOM-RIGHT SHORTCUT) - Visible on Matrix/Roadmap/Analytics pages, hidden on AI Assistant page */}
            {activeTab !== 'assistant' && (
                <FloatingSiriLauncher
                    onClick={() => {
                        executeAction('navigateTo', { page: 'assistant' }, 'user');
                    }}
                    aiHighlightId={aiHighlightId}
                    isProcessing={isAiProcessing}
                />
            )}

            {/* MODALS & DRAWERS */}
            <InteractiveNodeDrawer
                node={roadmapNodes.find(n => n.id === selectedNodeId)}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onUpdateNode={(id, updates) => executeAction('updateMilestone', { id, ...updates }, 'user')}
                onDeleteNode={(id) => executeAction('deleteMilestone', { id }, 'user')}
            />

            <SetupWizardOverlay
                isOpen={isWizardOpen}
                userPrefs={userPrefs}
                onSavePrefs={(prefs) => {
                    executeAction('changeWizardSettings', prefs, 'user');
                    setUserPrefs(prev => ({ ...prev, ...prefs }));
                    setIsWizardOpen(false);
                }}
                onClose={() => setIsWizardOpen(false)}
            />

            <CommandBarModal
                isOpen={isCommandBarOpen}
                onClose={() => setIsCommandBarOpen(false)}
                onNavigate={(page) => executeAction('navigateTo', { page }, 'user')}
                onStartPresetTimer={(preset, dur) => executeAction('startTimer', { preset, duration: dur }, 'user')}
                onOpenWizard={() => setIsWizardOpen(true)}
                onOpenCheckin={() => setIsPostSessionOpen(true)}
                todayTasks={todayTasks}
                roadmapNodes={roadmapNodes}
            />

            <CellInspectorModal
                cell={selectedCellForEdit}
                onClose={() => setSelectedCellForEdit(null)}
                onSave={(data) => executeAction('updateScheduleCell', data, 'user')}
            />

            <FocusTaskPickerModal
                isOpen={isTaskPickerOpen}
                onClose={() => setIsTaskPickerOpen(false)}
                todayTasks={todayTasks}
                roadmapNodes={roadmapNodes}
                onSelectTarget={(target) => setTimerState(prev => ({ ...prev, targetTask: target }))}
            />

            <PostSessionModal
                isOpen={isPostSessionOpen}
                onClose={() => setIsPostSessionOpen(false)}
                onLogSession={(data) => executeAction('logEvaluationCheckin', data, 'user')}
                taskName={timerState.targetTask}
            />

            <UndoToast
                toast={undoToast}
                onUndo={() => {
                    if (undoToast?.onUndo) undoToast.onUndo();
                    setUndoToast(null);
                }}
            />

        </div>
    );
}

// ==========================================================================
// 14. GLOBAL ERROR BOUNDARY & ROOT MOUNT
// ==========================================================================

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
        if (window.onerror) window.onerror("React Error: " + error.message, "", 0, 0, error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '32px', background: '#2B2420', color: '#B5484A', minHeight: '100vh', fontFamily: 'monospace' }}>
                    <h2 style={{ color: '#FAF6EF', fontSize: '22px' }}>⚠️ Render Exception Captured</h2>
                    <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', color: '#F0E6D8' }}>
                        {this.state.error && this.state.error.toString()}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

try {
    const rootElement = document.getElementById('root');
    if (rootElement) {
        ReactDOM.createRoot(rootElement).render(
            <GlobalErrorBoundary>
                <App />
            </GlobalErrorBoundary>
        );
    }
} catch (err) {
    console.error("Mount error:", err);
    if (window.onerror) window.onerror("Mount Error: " + err.message, "", 0, 0, err);
}
