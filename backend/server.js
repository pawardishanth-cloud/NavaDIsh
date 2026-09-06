const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { runCppWeeklyOptimization } = require('./services/cppScheduler');
const { generateGroqCheckinFeedback } = require('./services/groqService');
const { syncGoogleCalendarEvents } = require('./services/calendarService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let userOnboardingData = {
    wakeTime: "07:00",
    sleepTime: "23:00",
    mealTimes: { breakfast: "08:00", lunch: "13:00", dinner: "20:00" },
    academicCommitments: [
        { day: "Monday", title: "BS Chemistry (IIT KGP)", time: "09:00 AM - 10:00 AM" }
    ],
    goalAllocations: [
        { goal: "Machine Learning Specialization (2 Months Target)", hoursPerDay: 2 },
        { goal: "SDE Intern Prep (DSA & System Design)", hoursPerDay: 2 }
    ],
    isWizardCompleted: true
};

// Rich Enhanced Roadmap Architecture
let enhancedRoadmapPipeline = [
    {
        id: "phase_1",
        phaseTitle: "Phase 1: ML Math & Classical Supervised Models",
        monthLabel: "Month 1 Target",
        progress: 75,
        status: "ACTIVE",
        sprints: [
            {
                id: "s1",
                sprintTitle: "Sprint 1: Linear Algebra, Vectorization & NumPy",
                progress: 100,
                tasks: [
                    { id: "t101", title: "Vectors, Matrices & Matrix Multiplication", difficulty: "Beginner", estHours: 8, completed: true },
                    { id: "t102", title: "Partial Derivatives & Gradient Descent Mechanics", difficulty: "Intermediate", estHours: 10, completed: true },
                    { id: "t103", title: "NumPy Vectorized Ops & Pandas DataFrames", difficulty: "Beginner", estHours: 6, completed: true }
                ]
            },
            {
                id: "s2",
                sprintTitle: "Sprint 2: Linear & Logistic Regression, Regularization",
                progress: 50,
                tasks: [
                    { id: "t104", title: "Cost Functions & Mean Squared Error Loss", difficulty: "Intermediate", estHours: 8, completed: true },
                    { id: "t105", title: "L1 (Lasso) & L2 (Ridge) Regularization", difficulty: "Intermediate", estHours: 10, completed: false },
                    { id: "t106", title: "Classification Decision Boundaries & Sigmoid", difficulty: "Intermediate", estHours: 12, completed: false }
                ]
            }
        ]
    },
    {
        id: "phase_2",
        phaseTitle: "Phase 2: Deep Learning, PyTorch & Model Deployment",
        monthLabel: "Month 2 Target",
        progress: 20,
        status: "IN_PROGRESS",
        sprints: [
            {
                id: "s3",
                sprintTitle: "Sprint 3: Neural Networks & PyTorch Autograd",
                progress: 40,
                tasks: [
                    { id: "t201", title: "Multi-Layer Perceptrons & Activation Functions", difficulty: "Intermediate", estHours: 14, completed: true },
                    { id: "t202", title: "PyTorch Custom Tensors & Model Classes", difficulty: "Advanced", estHours: 16, completed: false },
                    { id: "t203", title: "Backpropagation Math & Chain Rule", difficulty: "Advanced", estHours: 18, completed: false }
                ]
            },
            {
                id: "s4",
                sprintTitle: "Sprint 4: Computer Vision & Model Serving REST APIs",
                progress: 0,
                tasks: [
                    { id: "t204", title: "CNN Filters, Convolutions & Max Pooling", difficulty: "Advanced", estHours: 20, completed: false },
                    { id: "t205", title: "C++ Microservice Integration & Flask API Deployment", difficulty: "Advanced", estHours: 22, completed: false }
                ]
            }
        ]
    }
];

let performanceAnalytics = {
    dailyScore: 88,
    weeklyScore: 82,
    monthlyScore: 78,
    overallGoalScore: 42,
    tasksCompletedToday: 4,
    totalTasksToday: 5,
    taskLogs: [
        { id: "log_1", title: "Vectors & Gradient Descent Mechanics", completionPct: 100, date: "Today", score: "MASTERED" },
        { id: "log_2", title: "BS Chemistry Kinetics", completionPct: 75, date: "Today", score: "GOOD" }
    ]
};

let cellOverrides = {};

// REST API Endpoints
app.get('/api/analytics', (req, res) => {
    res.json({
        performance: performanceAnalytics,
        roadmap: enhancedRoadmapPipeline,
        cellOverrides
    });
});

app.post('/api/performance/checkin', (req, res) => {
    const { taskTitle, completionPct = 100, notes } = req.body;
    const pct = parseInt(completionPct, 10) || 100;
    performanceAnalytics.tasksCompletedToday += 1;
    let scoreLabel = pct >= 90 ? "MASTERED" : (pct >= 50 ? "GOOD" : "PARTIAL");

    performanceAnalytics.taskLogs.unshift({
        id: `log_${Date.now()}`,
        title: taskTitle || "Study Habit Session",
        completionPct: pct,
        date: "Today",
        score: scoreLabel,
        notes: notes || "Session completed."
    });

    performanceAnalytics.dailyScore = Math.min(100, Math.round((performanceAnalytics.tasksCompletedToday / performanceAnalytics.totalTasksToday) * 100));
    performanceAnalytics.weeklyScore = Math.round((performanceAnalytics.dailyScore * 0.4) + 50);
    performanceAnalytics.monthlyScore = Math.round((performanceAnalytics.weeklyScore * 0.6) + 30);
    performanceAnalytics.overallGoalScore = Math.round((performanceAnalytics.monthlyScore * 0.5) + 5);

    res.json({ success: true, performance: performanceAnalytics });
});

app.post('/api/roadmap/task-toggle', (req, res) => {
    const { phaseId, sprintId, taskId, completed } = req.body;
    const phase = enhancedRoadmapPipeline.find(p => p.id === phaseId);
    if (phase) {
        const sprint = phase.sprints.find(s => s.id === sprintId);
        if (sprint) {
            const task = sprint.tasks.find(t => t.id === taskId);
            if (task) task.completed = completed;

            const sprintDone = sprint.tasks.filter(t => t.completed).length;
            sprint.progress = Math.round((sprintDone / sprint.tasks.length) * 100);
        }

        const totalTasks = phase.sprints.reduce((acc, s) => acc + s.tasks.length, 0);
        const doneTasks = phase.sprints.reduce((acc, s) => acc + s.tasks.filter(t => t.completed).length, 0);
        phase.progress = Math.round((doneTasks / totalTasks) * 100);
    }
    res.json({ success: true, roadmap: enhancedRoadmapPipeline });
});

app.post('/api/roadmap/add-task', (req, res) => {
    const { phaseId, sprintId, taskTitle, difficulty = "Intermediate", estHours = 10 } = req.body;
    const phase = enhancedRoadmapPipeline.find(p => p.id === phaseId);
    if (phase) {
        const sprint = phase.sprints.find(s => s.id === sprintId) || phase.sprints[0];
        if (sprint && taskTitle) {
            sprint.tasks.push({
                id: `t_${Date.now()}`,
                title: taskTitle,
                difficulty,
                estHours: parseInt(estHours, 10) || 10,
                completed: false
            });
        }
    }
    res.json({ success: true, roadmap: enhancedRoadmapPipeline });
});

app.post('/api/schedule/cell-edit', (req, res) => {
    const { day, hour, title, description, status, completionPct } = req.body;
    const key = `${day}_${hour}`;
    cellOverrides[key] = { day, hour, title, description, status, completionPct };
    res.json({ success: true, updatedCell: cellOverrides[key] });
});

app.get('/api/schedule/weekly', async (req, res) => {
    try {
        const result = await runCppWeeklyOptimization(userOnboardingData);
        if (result.grid) {
            result.grid.forEach(cell => {
                const key = `${cell.day}_${cell.hour}`;
                if (cellOverrides[key]) {
                    cell.title = cellOverrides[key].title;
                    cell.description = cellOverrides[key].description;
                    cell.status = cellOverrides[key].status;
                    if (cellOverrides[key].completionPct !== undefined) {
                        cell.completionPct = cellOverrides[key].completionPct;
                    }
                }
            });
        }
        res.json({ success: true, optimization: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`NavaDish Extra-Compact Server active on http://localhost:${PORT}`);
    console.log(`Enhanced Roadmap Pipeline & Cell Overrides ready.`);
    console.log(`====================================================`);
});
