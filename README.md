# NavaDish v3.0 — Academic & Career Schedule Engine

NavaDish is an Awwwards-caliber academic and career schedule engine blending Apple HIG aesthetics with warm editorial design ("Linear × Cron × Superhuman"). It converts long-term academic targets and coursework priorities into an optimized daily schedule backed by a native C++ sweep-line scheduling microservice, real-time cognitive telemetry, and an integrated AI assistant.

---

## ✨ Features & Modules

1. **🗓️ Weekly Schedule Matrix**:
   - 7-day continuous 17-hour timetable (07:00 AM – 11:00 PM) with heat intensity telemetry.
   - Interactive cell inspector, custom activity overrides, and today's sprint checklist with magnetic tactile buttons.
   - Clean editorial cell formatting with subtle empty slot indicators.

2. **🗺️ Circular Roadmap (DAG Tech Tree)**:
   - Interactive competency tech tree with node status filters (`Mastered`, `Active`, `In Progress`, `Target`).
   - Drag-to-pan, zoom canvas with mini-map overview, milestone details drawer, and auto-arrange layout.

3. **📊 Performance & Mastery Engine**:
   - **Top Anchor Consistency Heatmap**: Customizable time range (`7 Days | 30 Days | 90 Days | Custom`), responsive reflow from large day blocks to calendar grids, edge-safe hover tooltips, and live telemetry bar.
   - Concentric Apple Health-style progress rings (ML Specialization, C++ Systems, BS Chemistry) and cognitive retention telemetry.
   - Weak-Topic Bottleneck Detector with 1-click `+ Add to Today's Checklist` action.
   - Time-of-Day Productivity Breakdown with Chronotype Peak Alignment callouts.

4. **✨ AI Assistant (Full Dedicated Experience + Fluid Siri Orb)**:
   - Dedicated 4th navigation tab (`Matrix | Roadmap | Analytics | AI Assistant`).
   - Fluid Siri-style orb with radial gradient blobs in warm coral, amber, and cream palette (`#FF8A5B`, `#FFB05B`, `#FFE4C4`).
   - Dynamic status transitions (`Ready` → `Listening` → `Thinking` → `Speaking`).
   - Collapsible hero deck with suggested prompts (`📊 Summarize my week`, `🎯 What should I focus on?`, `🔄 Rebalance my schedule`, `📎 Analyze a document`).
   - Dual-column workspace: left chat transcript with comic speech bubbles and inline action cards with Undo; right persistent AI Activity Feed.
   - Floating shortcut orb on other tabs that hides when on the AI Assistant page.

5. **⏱️ Persistent Focus Timer**:
   - Bottom-left floating Pomodoro/Deep Work timer with preset selector (25m / 45m / 60m), task linking, and post-session evaluation check-in modal.

6. **⌘K Command Bar & Living Settings Hub**:
   - Universal command palette with quick navigation and actions.
   - Chronotype & sleep schedule configuration, course prioritization, and target deadlines.

---

## 🏛️ Architecture & Stack

- **Frontend**: React 18, Tailwind CSS, Framer Motion animations, Apple glassmorphic panels (`backdrop-filter: blur(20px)`), Lucide icons.
- **Microservice Optimization**: Native C++ (`cpp_scheduler/scheduler.cpp`) executing $O(N \log N)$ interval scheduling and $O(N)$ sweep-line free slot detection.
- **Backend**: Node.js, Express API gateway, child-process C++ binary integration, Groq AI fallback service, Google Calendar sync.
- **Database**: PostgreSQL schema (`schema.sql`) for profiles, milestones, schedules, and reflection check-ins.

---

## 🚀 Getting Started

### 1. Compile C++ Scheduler (Optional / Native Speed)
```bash
g++ -O3 -std=c++17 cpp_scheduler/scheduler.cpp -o cpp_scheduler/scheduler.exe
```

### 2. Install Backend Dependencies & Start Server
```bash
cd backend
npm install
npm start
```
The server will start at `http://localhost:3000`.

### 3. Open in Browser
Open `http://localhost:3000` to interact with the NavaDish v3.0 application.

---

## 📁 Repository Structure
```
NavaDish/
├── .gitignore               # Ignored dependencies & build artifacts
├── README.md                # System documentation
├── SPEC.md                  # Architectural specification
├── AGI_PROMPT.md            # System prompt & constraints
├── schema.sql               # Database schema
├── cpp_scheduler/
│   └── scheduler.cpp        # Native C++ optimization algorithm
├── backend/
│   ├── package.json
│   ├── server.js            # Express API gateway
│   └── services/
│       ├── cppScheduler.js  # C++ binary bridge
│       ├── groqService.js   # AI check-in service
│       └── calendarService.js # Calendar sync service
└── public/
    ├── index.html           # HTML shell & font imports
    ├── style.css            # Custom CSS & Siri Orb animations
    └── app.js               # Core React components & state management
```
