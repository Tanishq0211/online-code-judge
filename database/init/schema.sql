-- Initialize database for Online Code Judge
-- This script runs automatically when the PostgreSQL container starts

-- Create custom schema if needed (optional)
-- CREATE SCHEMA IF NOT EXISTS oj;

-- Users table - stores participant and admin information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- user, admin, moderator
    rating INTEGER DEFAULT 1200,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Problems table - stores programming challenges
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20), -- easy, medium, hard
    time_limit INTEGER NOT NULL DEFAULT 1000, -- in milliseconds
    memory_limit INTEGER NOT NULL DEFAULT 256, -- in MB
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Test cases table - input/output pairs for judging solutions
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input_text TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    order_index INTEGER,
    CONSTRAINT unique_problem_order UNIQUE (problem_id, order_index)
);

-- Submissions table - tracks code submissions and their results
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    problem_id INTEGER NOT NULL REFERENCES problems(id),
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(20), -- pending, accepted, wrong_answer, time_limit_exceeded, etc.
    execution_time INTEGER, -- in milliseconds
    memory_used INTEGER, -- in KB
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_problems_created_by ON problems(created_by);
CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);

-- Insert some sample data for testing (optional)
-- Uncomment and modify as needed

-- INSERT INTO users (username, email, password_hash, role) VALUES
-- ('admin', 'admin@onlinejudge.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S', 'admin'), -- password: admin123
-- ('judge1', 'judge1@onlinejudge.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S', 'user'); -- password: judge123

-- INSERT INTO problems (title, description, difficulty, time_limit, memory_limit, created_by) VALUES
-- ('Hello World', 'Write a program that prints "Hello, World!"', 'easy', 1000, 64, 1),
-- ('Sum of Two Numbers', 'Read two integers and print their sum', 'easy', 1000, 64, 1);

-- INSERT INTO test_cases (problem_id, input_text, expected_output, is_sample, order_index) VALUES
-- (1, '', 'Hello, World!', true, 1),
-- (2, '1 2', '3', true, 1),
-- (2, '5 10', '15', false, 2);