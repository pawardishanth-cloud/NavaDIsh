# Technical Specification: Career-Goal Learning App ("NavaDish")

## Product Architectural Overview
The **Career-Goal Learning App** transforms high-level career goals into daily, actionable 25-minute study habits automatically integrated into a student's existing schedule.

- **Mindmap Tech-Tree**: Represented as a Directed Acyclic Graph (DAG) visualizing skill dependencies, unlocked nodes, in-progress habits, and mastered competencies.
- **UI/UX Design Language**: "Quiet elegance." Monochromatic and neutral color palette with generous white space, subtle vector strokes, flat states, and intentional animations.
- **System Stack**:
  - **Frontend**: React Native (Expo) with SVG/Skia graphics layer.
  - **API Gateway**: Node.js (TypeScript) + PostgreSQL.
  - **Schedule Optimization Layer**: Native C++ microservice (Interval Sweep & Free-Slot Search Algorithm).
  - **AI Engine**: Groq API (serverless Llama-3/Mixtral inference for companion check-ins).
  - **Calendar Sync**: Google Calendar API (OAuth 2.0 bidirectional sync).

---

## 1. Database Schema (PostgreSQL)

```sql
-- 1. Users & OAuth Tokens
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    google_refresh_token TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Career Goals
CREATE TABLE career_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_completion_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DAG Skill Nodes
CREATE TABLE dag_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES career_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_minutes INT DEFAULT 25,
    level INT DEFAULT 1,
    prerequisites UUID[] DEFAULT '{}', -- Array of dag_node UUIDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. User DAG Node Progress States
CREATE TYPE node_status AS ENUM ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'MASTERED');

CREATE TABLE user_node_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES dag_nodes(id) ON DELETE CASCADE,
    status node_status DEFAULT 'LOCKED',
    progress_percent INT DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    mastered_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, node_id)
);

-- 5. Timetable Busy Slots (Google Calendar Mirror)
CREATE TABLE user_schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    external_event_id VARCHAR(255),
    title VARCHAR(255),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_busy BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Daily 25-Minute Habit Instances
CREATE TYPE habit_status AS ENUM ('SCHEDULED', 'COMPLETED', 'SKIPPED', 'RESCHEDULED');

CREATE TABLE scheduled_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES dag_nodes(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status habit_status DEFAULT 'SCHEDULED',
    google_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Task History & AI Check-ins
CREATE TABLE task_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES scheduled_habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groq_ai_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES scheduled_habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_reflection TEXT,
    ai_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. UI Component Breakdown (React Native Minimalist Architecture)

### Design System Tokens ("Quiet Elegance")
- **Backgrounds**: `#FAFAFA` (Soft Neutral Off-White), `#FFFFFF` (Card Surfaces)
- **Typography**: `#171717` (Neutral Dark Primary), `#737373` (Soft Gray Secondary)
- **Strokes & Borders**: `#E5E5E5` (Thin 1px Subtle Lines)
- **Accent Color**: `#2563EB` (Understated Primary Action Accent)
- **DAG Node States**:
  - `LOCKED`: `#F5F5F5` fill, `#E5E5E5` border, `#A3A3A3` text
  - `UNLOCKED`: `#FFFFFF` fill, `#171717` stroke (1px), `#171717` text
  - `IN_PROGRESS`: `#EFF6FF` fill, `#2563EB` stroke (1.5px), `#1E40AF` text
  - `MASTERED`: `#F8FAFC` fill, `#94A3B8` stroke (1px), `#64748B` text (subtle check icon)

### Component Tree
1. **`TechTreeGraph`**: Container rendering the mobile DAG node network using `react-native-svg`.
   - **`DAGNode`**: Rendered as a clean rounded box with thin strokes. Features smooth state transition triggers.
   - **`DAGEdge`**: Clean Bezier curves (`path` element with `stroke="#E5E5E5"` and `strokeWidth=1.5`).
   - **`NodeDetailModal`**: Bottom-sheet overlay with soft blur (`BlurView`) displaying topic overview and button to "Schedule 25-min Habit".
2. **`HabitTimetableCard`**: Hero item on home view showing today's auto-scheduled 25-minute free-period slot.
3. **`TimelineView`**: Vertical daily schedule with generous white space and soft gray time indicators.
4. **`GroqCheckinOverlay`**: Minimalist modal with light backdrop blur for fast post-habit AI reflections.

---

## 3. API Endpoints Architecture

### A. React Native Frontend <-> Node.js Gateway
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/google` | OAuth authentication & token exchange |
| `GET` | `/api/v1/goals` | Fetch user active career goals |
| `GET` | `/api/v1/goals/:id/dag` | Fetch DAG graph structure (nodes, edges, user states) |
| `POST` | `/api/v1/schedule/optimize-habit` | Triggers C++ engine to find next optimal free 25-min slot |
| `PATCH`| `/api/v1/habits/:id/status` | Update habit state (`COMPLETED`, `SKIPPED`) |
| `POST` | `/api/v1/ai/checkin` | Submit post-study reflection to Groq API for feedback |
| `POST` | `/api/v1/calendar/sync` | Trigger Google Calendar fetch and local schedule sync |

### B. Node.js Gateway <-> Native C++ Optimization Engine
- **Interface**: C++ microservice (High-performance HTTP server or Node Native Addon / N-API binding).
- **Endpoint**: `POST /internal/v1/optimize`
- **Request Payload**:
```json
{
  "user_id": "uuid",
  "habit_duration_minutes": 25,
  "time_window": {
    "start": "2026-09-06T08:00:00Z",
    "end": "2026-09-06T20:00:00Z"
  },
  "busy_intervals": [
    { "start": "2026-09-06T09:00:00Z", "end": "2026-09-06T10:30:00Z" },
    { "start": "2026-09-06T13:00:00Z", "end": "2026-09-06T14:15:00Z" }
  ]
}
```
- **Response Payload**:
```json
{
  "optimal_slot": {
    "start": "2026-09-06T10:45:00Z",
    "end": "2026-09-06T11:10:00Z",
    "buffer_before_minutes": 15,
    "buffer_after_minutes": 15
  },
  "alternative_slots": [
    { "start": "2026-09-06T14:30:00Z", "end": "2026-09-06T14:55:00Z" }
  ]
}
```

---

## 4. Confirmed UI/UX Architectural Decisions

Based on initial design alignment:

1. **DAG Tech-Tree Mobile Layout**:
   - **Chosen Strategy**: Infinite interactive SVG canvas (`react-native-svg` + `react-native-gesture-handler`) with smooth pinch-to-zoom, fluid pan gestures, and soft visual boundary constraints.

2. **Google Calendar Conflict Handling**:
   - **Chosen Strategy**: Silent auto-reschedule powered by the native C++ optimization engine. When a calendar update causes an overlap, the C++ service seamlessly shifts the 25-minute habit slot to the next available free period without interrupting user focus.

3. **Groq AI Companion Check-in UX**:
   - **Chosen Strategy**: Automatic soft-blur modal (`BlurView`) overlay triggered immediately upon completion of the 25-minute study habit countdown timer for prompt, frictionless daily reflections.

