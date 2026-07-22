#!/bin/bash
# Simple test script to verify PostgreSQL setup

echo "🧪 Testing PostgreSQL setup for Online Code Judge..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Desktop."
    exit 1
fi

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📋 Creating .env from example..."
        cp .env.example .env
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

# Start services
echo "🚀 Starting database services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U $POSTGRES_USER 2>/dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Timeout waiting for PostgreSQL to start"
    docker-compose logs postgres
    exit 1
fi

# Test database connection and run a simple query
echo "🔍 Testing database connection..."
result=$(docker-compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT version();" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    echo "   PostgreSQL version: $result"
else
    echo "❌ Failed to connect to database"
    docker-compose logs postgres
    exit 1
fi

# Check if tables were created
echo "📋 Checking if tables were created..."
tables=$(docker-compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$tables" ]; then
    echo "✅ Tables found:"
    echo "$tables" | while read table; do
        echo "   - $table"
    done
else
    echo "❌ No tables found or error checking tables"
    exit 1
fi

echo ""
echo "🎉 Setup test completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Review the schema in database/init/schema.sql"
echo "   2. Start building your backend API"
echo "   3. Connect your application to:"
echo "      Host: localhost"
echo "      Port: 5432"
echo "      Database: $POSTGRES_DB"
echo "      Username: $POSTGRES_USER"
echo "      Password: [from your .env file]"
echo ""
echo "💡 Tip: You can manage your database with:"
echo "   - Command line: docker-compose exec postgres psql -U $POSTGRES_USER $POSTGRES_DB"
echo "   - GUI (if enabled): http://localhost:5050 (pgAdmin)"