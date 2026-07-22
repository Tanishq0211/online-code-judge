-- ============================================================
-- SAMPLE DATA
-- Online Code Judge
-- ============================================================

-- ============================================================
-- USERS
-- Password:
-- admin123
-- password123
-- ============================================================

INSERT INTO users (username, email, password_hash, role, rating)
VALUES
(
    'admin',
    'admin@onlinejudge.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S',
    'admin',
    1500
),
(
    'john_doe',
    'john@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S',
    'user',
    1200
),
(
    'jane_smith',
    'jane@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.F0.w3S',
    'user',
    1100
);

-- ============================================================
-- LANGUAGES
-- ============================================================

INSERT INTO languages
(name, version, docker_image, compile_command, run_command)
VALUES
(
    'C++',
    'GCC 13',
    'gcc:13',
    'g++ main.cpp -std=c++20 -O2 -o main',
    './main'
),
(
    'Python',
    '3.12',
    'python:3.12',
    NULL,
    'python3 main.py'
),
(
    'Java',
    'OpenJDK 21',
    'openjdk:21',
    'javac Main.java',
    'java Main'
);

-- ============================================================
-- PROBLEMS
-- ============================================================

INSERT INTO problems
(
slug,
title,
statement,
input_format,
output_format,
constraints,
difficulty,
time_limit_ms,
memory_limit_mb,
created_by,
is_public
)
VALUES
(
'hello-world',
'Hello World',
'Print "Hello, World!" exactly as shown.',
'No input.',
'Print Hello, World!',
'None',
'easy',
1000,
256,
1,
TRUE
),

(
'sum-of-two-numbers',
'Sum of Two Numbers',
'Read two integers and print their sum.',
'Two integers A and B.',
'Print A + B.',
'-10^9 <= A,B <= 10^9',
'easy',
1000,
256,
1,
TRUE
),

(
'factorial',
'Factorial',
'Given N, print N factorial.',
'Single integer N.',
'Print N!',
'0 <= N <= 20',
'medium',
2000,
256,
1,
TRUE
);

-- ============================================================
-- TEST CASES
-- ============================================================

-- Problem 1 : Hello World

INSERT INTO test_cases
(problem_id,input,expected_output,is_visible,order_index)
VALUES
(1,'','Hello, World!',TRUE,1),
(1,'','Hello, World!',FALSE,2);

-- Problem 2 : Sum of Two Numbers

INSERT INTO test_cases
(problem_id,input,expected_output,is_visible,order_index)
VALUES
(2,'1 2','3',TRUE,1),
(2,'10 20','30',TRUE,2),
(2,'100 200','300',FALSE,3),
(2,'-10 5','-5',FALSE,4);

-- Problem 3 : Factorial

INSERT INTO test_cases
(problem_id,input,expected_output,is_visible,order_index)
VALUES
(3,'0','1',TRUE,1),
(3,'1','1',TRUE,2),
(3,'5','120',TRUE,3),
(3,'10','3628800',FALSE,4);

-- ============================================================
-- SUBMISSIONS
-- ============================================================

INSERT INTO submissions
(
user_id,
problem_id,
language_id,
source_code,
status,
runtime_ms,
memory_kb,
compiler_output,
stdout,
stderr,
submitted_at,
completed_at
)
VALUES
(
2,
1,
1,
'#include<iostream>
int main(){
std::cout<<"Hello, World!";
}',
'accepted',
2,
512,
NULL,
'Hello, World!',
NULL,
CURRENT_TIMESTAMP,
CURRENT_TIMESTAMP
),

(
3,
2,
1,
'#include<iostream>
using namespace std;
int main(){
int a,b;
cin>>a>>b;
cout<<a+b;
}',
'accepted',
3,
640,
NULL,
'3',
NULL,
CURRENT_TIMESTAMP,
CURRENT_TIMESTAMP
),

(
2,
3,
1,
'#include<iostream>
int main(){',
'compilation_error',
NULL,
NULL,
'error: expected ''}'' at end of input',
NULL,
NULL,
CURRENT_TIMESTAMP,
CURRENT_TIMESTAMP
);

-- ============================================================
-- SUBMISSION TEST RESULTS
-- ============================================================

-- Submission 1 (Hello World)

INSERT INTO submission_test_results
(
submission_id,
test_case_id,
status,
runtime_ms,
memory_kb,
stdout,
stderr
)
VALUES
(1,1,'accepted',1,256,'Hello, World!',NULL),
(1,2,'accepted',1,256,'Hello, World!',NULL);

-- Submission 2 (Sum)

INSERT INTO submission_test_results
(
submission_id,
test_case_id,
status,
runtime_ms,
memory_kb,
stdout,
stderr
)
VALUES
(2,3,'accepted',1,300,'3',NULL),
(2,4,'accepted',1,300,'30',NULL),
(2,5,'accepted',1,300,'300',NULL),
(2,6,'accepted',1,300,'-5',NULL);

-- Submission 3 (Compilation Error)

INSERT INTO submission_test_results
(
submission_id,
test_case_id,
status,
runtime_ms,
memory_kb,
stdout,
stderr
)
VALUES
(3,7,'compilation_error',NULL,NULL,NULL,'Compilation failed'),
(3,8,'skipped',NULL,NULL,NULL,NULL),
(3,9,'skipped',NULL,NULL,NULL,NULL),
(3,10,'skipped',NULL,NULL,NULL,NULL);