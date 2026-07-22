-- Sample data for development and testing
-- Uncomment and execute these INSERT statements to add sample data

-- Sample Users
-- INSERT INTO users (username, email, password_hash, role, rating) VALUES
-- ('admin', 'admin@onlinejudge.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S', 'admin', 1500), -- password: admin123
-- ('john_doe', 'john@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S', 'user', 1200), -- password: password123
-- ('jane_smith', 'jane@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S', 'user', 1150); -- password: password123

-- Sample Problems
-- INSERT INTO problems (title, description, difficulty, time_limit, memory_limit, created_by) VALUES
-- ('Hello World', 'Write a program that prints "Hello, World!" to standard output.', 'easy', 1000, 64, 1),
-- ('Sum of Two Numbers', 'Read two integers and print their sum.', 'easy', 1000, 64, 1),
-- ('Factorial Calculator', 'Calculate the factorial of a given number.', 'medium', 2000, 128, 2);

-- Sample Test Cases for Hello World (problem_id = 1)
-- INSERT INTO test_cases (problem_id, input_text, expected_output, is_sample, order_index) VALUES
-- (1, '', 'Hello, World!', true, 1),
-- (1, '', 'Hello, World!', false, 2);

-- Sample Test Cases for Sum of Two Numbers (problem_id = 2)
-- INSERT INTO test_cases (problem_id, input_text, expected_output, is_sample, order_index) VALUES
-- (2, '1 2', '3', true, 1),
-- (2, '5 10', '15', true, 2),
-- (2, '-1 1', '0', false, 3),
-- (2, '0 0', '0', false, 4);

-- Sample Test Cases for Factorial Calculator (problem_id = 3)
-- INSERT INTO test_cases (problem_id, input_text, expected_output, is_sample, order_index) VALUES
-- (3, '0', '1', true, 1),
-- (3, '1', '1', true, 2),
-- (3, '5', '120', true, 3),
-- (3, '10', '3628800', false, 4);