# Neighborhood Library Service

A small neighborhood library wants a new App to manage its members, books, and lending operations.

## 🛠️ Technology Stack

This service is built using:
- **Python** for the server implementation (FastAPI)
- **REST API** for the service interface
- **PostgreSQL** as the data store
- **React (Vite)** for the frontend

## ✨ Features

- **Books Management** - Add, update, delete, and search books
- **Members Management** - Register and manage library members
- **Borrowing System** - Track book borrowings and returns
- **Dashboard** - View library statistics and recent activities
- **Role-Based Access** - Admin and Member roles with different permissions
- **JWT Authentication** - Secure token-based authentication

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Database Setup](#database-setup)
- [Backend Setup (API Service)](#backend-setup-api-service)
- [Frontend Setup (View Service)](#frontend-setup-view-service)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Creating Admin User](#creating-admin-user)
- [Testing](#testing)
- [API Documentation](#api-documentation)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.12+** (with `pip` and `venv`)
- **Node.js 18+** (with `npm`)
- **PostgreSQL 12+**
- **Git** (for cloning the repository)

## Project Structure

```
Library-Service/
├── api-service/              # FastAPI backend (Python)
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database connection management
│   ├── auth.py              # JWT authentication
│   ├── models/              # SQLAlchemy models
│   │   ├── book.py          # Book model
│   │   ├── member.py        # Member model
│   │   ├── borrowing.py     # Borrowing model
│   │   └── user.py          # User model
│   ├── routers/             # API route handlers
│   │   ├── books.py         # Books endpoints
│   │   ├── members.py       # Members endpoints
│   │   ├── borrowings.py    # Borrowings endpoints
│   │   ├── auth.py          # Auth endpoints
│   │   └── dashboard.py     # Dashboard endpoints
│   ├── schemas.py           # Pydantic schemas
│   ├── requirements.txt     # Python dependencies
│   ├── schema.sql           # Database schema (PostgreSQL)
│   ├── setup_database.sh    # Database setup script
│   ├── create_tables.py     # Table creation script
│   ├── create_admin.py      # Admin user creation script
│   └── .env                 # Environment variables
│
├── view-service/            # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React Context (Auth)
│   │   ├── pages/           # Page components
│   │   ├── styles/          # CSS styles
│   │   ├── api.js           # API client configuration
│   │   └── App.jsx          # Main application
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.js       # Vite configuration
│   └── .env                 # Frontend environment variables
│
└── README.md                # Project documentation
```

## Database Setup

### Option 1: Using the Setup Script (Recommended)

1. Navigate to the `api-service` directory:
   ```bash
   cd api-service
   ```

2. Make the setup script executable:
   ```bash
   chmod +x setup_database.sh
   ```

3. Run the setup script:
   ```bash
   ./setup_database.sh
   ```

   The script will:
   - Check if PostgreSQL is installed and running
   - Prompt for database credentials
   - Create the database if it doesn't exist
   - Generate a `.env` file with database configuration
   - Create all required tables

### Option 2: Manual Setup

1. **Create PostgreSQL Database:**
   ```bash
   # Connect to PostgreSQL
   sudo -u postgres psql

   # Create database
   CREATE DATABASE project_assignment;

   # Exit PostgreSQL
   \q
   ```

2. **Run Schema SQL:**
   ```bash
   cd api-service
   psql -U postgres -d project_assignment -f schema.sql
   ```

   Or connect and run manually:
   ```bash
   psql -U postgres -d project_assignment
   ```
   Then paste the contents of `schema.sql` and execute.

3. **Create `.env` file** (see [Environment Variables](#environment-variables) section)

### Option 3: Using Docker (Optional)

If you prefer using Docker for PostgreSQL:

```bash
# Run PostgreSQL container
docker run --name library-postgres \
  -e POSTGRES_USER=project \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=project_assignment \
  -p 5432:5432 \
  -d postgres:15

# Then run the schema
psql -h localhost -U project -d project_assignment -f api-service/schema.sql
```

## Backend Setup (API Service)

### 1. Navigate to API Service Directory

```bash
cd api-service
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
```

### 3. Activate Virtual Environment

**Linux/macOS:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file in the `api-service` directory:

```bash
# Database Configuration (REQUIRED)
DATABASE_USER=your_postgres_user
DATABASE_PASSWORD=your_postgres_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=project_assignment

# JWT Configuration (REQUIRED for production)
JWT_SECRET_KEY=your-secret-key-change-in-production

# CORS Configuration (Optional - defaults provided)
ALLOWED_ORIGINS=http://localhost:9001,http://localhost:5173,http://127.0.0.1:9001

# Pagination Settings (Optional)
DEFAULT_BOOKS_PER_PAGE=10
DEFAULT_MEMBERS_PER_PAGE=10

# Email Configuration (Optional - for email reminders)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Neighborhood Library
```

**⚠️ Important:** 
- `DATABASE_USER` and `DATABASE_PASSWORD` are **required** (no defaults for security)
- Change `JWT_SECRET_KEY` to a strong random string in production
- For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833)

### 6. Create Database Tables

If you haven't used the setup script, create tables using:

```bash
python create_tables.py
```

This will create all tables defined in the models:
- `books`
- `members`
- `borrowings`
- `users`
- `testimonials`
- `subscriptions`

## Frontend Setup (View Service)

### 1. Navigate to View Service Directory

```bash
cd view-service
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `view-service` directory:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:9002/api

# Pagination
VITE_ITEMS_PER_PAGE=10

# Cache Configuration
VITE_PROFILE_CACHE_DURATION=5000
```

**Note:** Vite requires the `VITE_` prefix for environment variables to be accessible in the frontend.

## Running the Application

### Start Backend Server

**Option 1: Using the run script (Linux/macOS):**
```bash
cd api-service
chmod +x run.sh
./run.sh
```

**Option 2: Manual start:**
```bash
cd api-service
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows
uvicorn main:app --reload --host 0.0.0.0 --port 9002
```

The API will be available at:
- **API:** http://localhost:9002
- **Interactive API Docs:** http://localhost:9002/docs
- **Alternative Docs:** http://localhost:9002/redoc

### Start Frontend Server

```bash
cd view-service
npm run dev
```

The frontend will be available at:
- **Frontend:** http://localhost:9001

### Build Frontend for Production

```bash
cd view-service
npm run build
```

The production build will be in the `dist/` directory.

## Creating Admin User

After setting up the database, create an admin user:

```bash
cd api-service
source venv/bin/activate  # Linux/macOS
python create_admin.py
```

Or with custom credentials:

```bash
python create_admin.py --email admin@library.com --password Admin123 --name "Admin User"
```

**Default Admin Credentials** (if using interactive script):
- Email: `admin@library.com`
- Password: `Admin123`

## Testing

### Backend API Testing

1. **Using Interactive Docs:**
   - Visit http://localhost:9002/docs
   - Use the Swagger UI to test endpoints interactively

2. **Using curl:**
   ```bash
   # Health check
   curl http://localhost:9002/api/health

   # Login
   curl -X POST http://localhost:9002/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@library.com","password":"Admin123"}'
   ```

### Frontend Testing

1. Open http://localhost:9001 in your browser
2. Login with admin credentials
3. Test all features:
   - Books management (CRUD)
   - Members management
   - Borrowings
   - Dashboard
   - Profile management

## API Documentation

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Main Endpoints

- **Books:** `/api/books`
- **Members:** `/api/members`
- **Borrowings:** `/api/borrowings`
- **Statistics:** `/api/statistics`
- **Auth:** `/api/login`, `/api/signup`, `/api/profile`
- **Testimonials:** `/api/testimonials`
- **Subscriptions:** `/api/subscriptions`
- **Dashboard:** `/api/dashboard`

### Role-Based Access

- **Admin:** Full access to all endpoints
- **Member:** Limited access (own profile, borrowings, testimonials)

## Environment Variables Summary

### Backend (`api-service/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_USER` | ✅ Yes | - | PostgreSQL username |
| `DATABASE_PASSWORD` | ✅ Yes | - | PostgreSQL password |
| `DATABASE_HOST` | No | `localhost` | Database host |
| `DATABASE_PORT` | No | `5432` | Database port |
| `DATABASE_NAME` | No | `project_assignment` | Database name |
| `JWT_SECRET_KEY` | ⚠️ Production | `your-secret-key...` | JWT signing key |
| `ALLOWED_ORIGINS` | No | `http://localhost:9001,...` | CORS allowed origins |
| `DEFAULT_BOOKS_PER_PAGE` | No | `10` | Books per page |
| `DEFAULT_MEMBERS_PER_PAGE` | No | `10` | Members per page |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASSWORD` | No | - | SMTP password |

### Frontend (`view-service/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `http://localhost:9002/api` | Backend API URL |
| `VITE_ITEMS_PER_PAGE` | No | `10` | Items per page |
| `VITE_PROFILE_CACHE_DURATION` | No | `5000` | Profile cache (ms) |

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Verify database exists:**
   ```bash
   psql -U postgres -l | grep project_assignment
   ```

3. **Test connection:**
   ```bash
   psql -U your_user -d project_assignment -h localhost
   ```

### Python Virtual Environment Issues

1. **Recreate virtual environment:**
   ```bash
   rm -rf venv
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Frontend Build Issues

1. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

### Port Already in Use

If ports 9001 or 9002 are already in use:

1. **Find process using port:**
   ```bash
   # Linux/macOS
   lsof -i :9002
   
   # Kill process
   kill -9 <PID>
   ```

2. **Or change ports:**
   - Backend: Edit `run.sh` or uvicorn command
   - Frontend: Edit `vite.config.js` or `.env`

## Security Notes

- ✅ **SQL Injection Protection:** All queries use SQLAlchemy ORM with parameterized statements
- ✅ **Input Validation:** Pydantic schemas validate all input data
- ✅ **Authentication:** JWT tokens with secure password hashing (bcrypt)
- ✅ **CORS:** Configured to allow only specified origins
- ⚠️ **Production:** Change `JWT_SECRET_KEY` to a strong random string
- ⚠️ **Production:** Use environment variables for all sensitive data
- ⚠️ **Production:** Enable HTTPS and use secure database connections

## License

This project is for educational purposes.

## Support

For issues or questions, please check:
- API Documentation: http://localhost:9002/docs
- Database logs: Check PostgreSQL logs
- Application logs: Check terminal output

---
