-- ============================================================
-- Online Code Judge Database Schema
-- PostgreSQL 15+
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),

    rating INTEGER NOT NULL DEFAULT 0
        CHECK (rating >= 0),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- LANGUAGES
-- ============================================================

CREATE TABLE languages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(50) NOT NULL UNIQUE,
    version VARCHAR(100),

    docker_image TEXT NOT NULL,

    compile_command TEXT,
    run_command TEXT NOT NULL
);

-- ============================================================
-- PROBLEMS
-- ============================================================

CREATE TABLE problems (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    slug VARCHAR(150) NOT NULL UNIQUE,

    title VARCHAR(255) NOT NULL,

    statement TEXT NOT NULL,

    input_format TEXT,

    output_format TEXT,

    constraints TEXT,

    difficulty VARCHAR(20) NOT NULL
        CHECK (difficulty IN ('easy', 'medium', 'hard')),

    time_limit_ms INTEGER NOT NULL DEFAULT 1000
        CHECK (time_limit_ms > 0),

    memory_limit_mb INTEGER NOT NULL DEFAULT 256
        CHECK (memory_limit_mb > 0),

    created_by BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

    is_public BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TEST CASES
-- ============================================================

CREATE TABLE test_cases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    problem_id BIGINT NOT NULL
        REFERENCES problems(id)
        ON DELETE CASCADE,

    input TEXT NOT NULL,

    expected_output TEXT NOT NULL,

    is_visible BOOLEAN NOT NULL DEFAULT FALSE,

    order_index INTEGER NOT NULL
        CHECK (order_index > 0),

    UNIQUE(problem_id, order_index)
);

-- ============================================================
-- SUBMISSIONS
-- ============================================================

CREATE TABLE submissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    problem_id BIGINT NOT NULL
        REFERENCES problems(id)
        ON DELETE CASCADE,

    language_id BIGINT NOT NULL
        REFERENCES languages(id)
        ON DELETE RESTRICT,

    source_code TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'queued',
                'compiling',
                'running',
                'judging',
                'accepted',
                'wrong_answer',
                'runtime_error',
                'time_limit_exceeded',
                'memory_limit_exceeded',
                'compilation_error',
                'internal_error'
            )
        ),

    runtime_ms INTEGER
        CHECK (runtime_ms IS NULL OR runtime_ms >= 0),

    memory_kb INTEGER
        CHECK (memory_kb IS NULL OR memory_kb >= 0),

    compiler_output TEXT,

    stdout TEXT,

    stderr TEXT,

    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at TIMESTAMP
);

-- ============================================================
-- SUBMISSION TEST RESULTS
-- ============================================================

CREATE TABLE submission_test_results (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    submission_id BIGINT NOT NULL
        REFERENCES submissions(id)
        ON DELETE CASCADE,

    test_case_id BIGINT NOT NULL
        REFERENCES test_cases(id)
        ON DELETE CASCADE,

    status VARCHAR(30) NOT NULL
        CHECK (
            status IN (
                'accepted',
                'wrong_answer',
                'runtime_error',
                'time_limit_exceeded',
                'memory_limit_exceeded',
                'compilation_error',
                'skipped'
            )
        ),

    runtime_ms INTEGER
        CHECK (runtime_ms IS NULL OR runtime_ms >= 0),

    memory_kb INTEGER
        CHECK (memory_kb IS NULL OR memory_kb >= 0),

    stdout TEXT,

    stderr TEXT,

    UNIQUE(submission_id, test_case_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_username
ON users(username);

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_problems_slug
ON problems(slug);

CREATE INDEX idx_problems_difficulty
ON problems(difficulty);

CREATE INDEX idx_problems_public
ON problems(is_public);

CREATE INDEX idx_test_cases_problem
ON test_cases(problem_id);

CREATE INDEX idx_submissions_user
ON submissions(user_id);

CREATE INDEX idx_submissions_problem
ON submissions(problem_id);

CREATE INDEX idx_submissions_status
ON submissions(status);

CREATE INDEX idx_submissions_language
ON submissions(language_id);

CREATE INDEX idx_submissions_submitted
ON submissions(submitted_at DESC);

CREATE INDEX idx_submission_results_submission
ON submission_test_results(submission_id);

CREATE INDEX idx_submission_results_testcase
ON submission_test_results(test_case_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE
ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_problems_updated_at
BEFORE UPDATE
ON problems
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();