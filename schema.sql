-- PostgreSQL Database Schema for NavaDish Career-Goal Learning App

-- 1. Users & OAuth Settings
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    google_refresh_token TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Career Goals
CREATE TABLE IF NOT EXISTS career_goals (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DAG Skill Nodes
CREATE TABLE IF NOT EXISTS dag_nodes (
    id VARCHAR(36) PRIMARY KEY,
    goal_id VARCHAR(36) REFERENCES career_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_minutes INT DEFAULT 25,
    level INT DEFAULT 1,
    prerequisites TEXT DEFAULT '[]', -- JSON array of parent node IDs
    pos_x FLOAT DEFAULT 0.0,
    pos_y FLOAT DEFAULT 0.0
);

-- 4. User Progress State per Node
CREATE TABLE IF NOT EXISTS user_node_states (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    node_id VARCHAR(36) REFERENCES dag_nodes(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'MASTERED')),
    progress_percent INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, node_id)
);

-- 5. Timetable Schedule & Busy Slots
CREATE TABLE IF NOT EXISTS schedule_slots (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_busy BOOLEAN DEFAULT TRUE,
    source VARCHAR(50) DEFAULT 'GOOGLE_CALENDAR'
);

-- 6. Scheduled 25-Minute Habits
CREATE TABLE IF NOT EXISTS scheduled_habits (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    node_id VARCHAR(36) REFERENCES dag_nodes(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    status VARCHAR(20) CHECK (status IN ('SCHEDULED', 'COMPLETED', 'SKIPPED', 'RESCHEDULED')),
    google_event_id VARCHAR(255)
);

-- 7. AI Companion Reflection Logs
CREATE TABLE IF NOT EXISTS groq_ai_checkins (
    id VARCHAR(36) PRIMARY KEY,
    habit_id VARCHAR(36) REFERENCES scheduled_habits(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    user_reflection TEXT NOT NULL,
    ai_feedback TEXT NOT NULL,
    sentiment VARCHAR(20) DEFAULT 'POSITIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
