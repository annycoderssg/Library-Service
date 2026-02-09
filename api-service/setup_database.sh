#!/bin/bash

# Database Setup Script for Neighborhood Library Service

echo "🔧 Setting up PostgreSQL database for Neighborhood Library Service"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed!"
    echo ""
    echo "📦 Install PostgreSQL:"
    echo "   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "   CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL is installed"
echo ""

# Check if PostgreSQL service is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "⚠️  PostgreSQL service is not running"
    echo "🚀 Starting PostgreSQL service..."
    sudo systemctl start postgresql
    sleep 2
fi

if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL service is running"
else
    echo "❌ Failed to start PostgreSQL service"
    echo "   Try: sudo systemctl start postgresql"
    exit 1
fi

echo ""

# Prompt for database credentials
read -p "Enter PostgreSQL username (default: project): " DB_USER
DB_USER=${DB_USER:-project}

read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""

read -p "Enter database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter database port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

DB_NAME="project_assignment"

echo ""
echo "🔍 Checking if database '$DB_NAME' exists..."

# Check if database exists
export PGPASSWORD="$DB_PASSWORD"
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -w "$DB_NAME" | wc -l)

if [ "$DB_EXISTS" -gt 0 ]; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "📝 Creating database '$DB_NAME'..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Database '$DB_NAME' created successfully"
    else
        echo "❌ Failed to create database"
        echo "   Please check your PostgreSQL credentials"
        echo "   You may need to create the database manually:"
        echo "   psql -U $DB_USER -d postgres -c 'CREATE DATABASE $DB_NAME;'"
        exit 1
    fi
fi

unset PGPASSWORD

echo ""

# Create .env file
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " OVERWRITE
    if [[ ! $OVERWRITE =~ ^[Yy]$ ]]; then
        echo "Skipping .env file creation"
        exit 0
    fi
fi

echo "📝 Creating .env file..."
cat > "$ENV_FILE" << EOF
# PostgreSQL Database Configuration
DATABASE_USER=$DB_USER
DATABASE_PASSWORD=$DB_PASSWORD
DATABASE_HOST=$DB_HOST
DATABASE_PORT=$DB_PORT
DATABASE_NAME=$DB_NAME
EOF

echo "✅ .env file created"
echo ""

# Create tables using Python script
echo "🔧 Creating database tables..."
source venv/bin/activate
python create_tables.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Verify connection: python test_db_connection.py"
    echo "   2. Start the server: ./run.sh"
else
    echo ""
    echo "❌ Failed to create tables"
    echo "   Try running manually: python create_tables.py"
    exit 1
fi
