# Database Layer - Online Code Judge

This directory contains all database-related files for the Online Code Judge system.

## Structure

```
database/
├── init/                    # Database initialization scripts (run on container startup)
│   └── schema.sql          # Main database schema with tables and indexes
├── seeds/                   # Seed data for development/testing
│   └── sample_data.sql     # Sample users, problems, test cases
├── migrations/              # Database migration scripts (for future use)
│   ├── V1__initial_schema.sql
│   └── V2__add_indexes.sql
├── backups/                 # Database backups (manual or automated)
└── README.md                # This file
```

## Getting Started

### Using Docker Compose (Recommended)

1. Make sure you have Docker and Docker Compose installed
2. Copy the `.env.example` to `.env` and adjust credentials if needed
3. Start the database:
   ```bash
   docker-compose up -d
   ```
4. Wait for the database to be ready (check with `docker-compose logs -f postgres`)
5. Run the test script to verify setup:
   ```bash
   ./test-db-setup.sh
   ```

### Manual PostgreSQL Installation

If you prefer to install PostgreSQL directly:

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database and user:
   ```sql
   CREATE DATABASE online_judge;
   CREATE USER oj_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE online_judge TO oj_user;
   ```
3. Connect to the database and run the schema:
   ```bash
   psql -U oj_user -d online_judge -f database/init/schema.sql
   ```

## Schema Overview

The database includes these core tables:

### Users
- Stores participant and admin account information
- Fields: id, username, email, password_hash, role, rating, timestamps

### Problems
- Programming challenge definitions
- Fields: id, title, description, difficulty, time_limit, memory_limit, creator, timestamps

### Test Cases
- Input/expected output pairs for judging solutions
- Fields: id, problem_id, input_text, expected_output, is_sample, order_index

### Submissions
- Code submissions and their execution results
- Fields: id, user_id, problem_id, code, language, status, execution_time, memory_used, timestamps

## Development Tips

1. **Password Security**: Never use the default passwords in production
2. **Migrations**: As your schema evolves, use migration scripts in `/migrations`
3. **Backups**: Regularly backup your data using `pg_dump`
4. **Performance**: Monitor query performance and add indexes as needed
5. **Environment Variables**: Use `.env` file for configuration (never commit real passwords!)

## Testing Connection

You can test your database connection with:

```bash
# Using Docker
docker-compose exec postgres psql -U $POSTGRES_USER $POSTGRES_DB

# Direct connection (if PostgreSQL installed locally)
psql -h localhost -U your_username -d your_database
```

## Next Steps

After setting up the database:
1. Begin implementing your backend API (Node.js/Python/Java/etc.)
2. Create database connection pools in your service layer
3. Implement CRUD operations for each table
4. Add business logic for problem submission and judging
5. Set up your worker processes for code execution