import os
import threading
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class DatabaseConnectionManager:
    """
    Singleton pattern implementation for database connections.
    Ensures only one instance of read and write engines exists.
    """
    _instance = None
    _lock = threading.Lock()
    _read_engine = None
    _write_engine = None
    _read_session_local = None
    _write_session_local = None
    _initialized = False

    def __new__(cls):
        """Ensure only one instance is created (Singleton pattern)"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DatabaseConnectionManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize database connections only once"""
        if not self._initialized:
            with self._lock:
                if not self._initialized:
                    self._initialize_connections()
                    DatabaseConnectionManager._initialized = True

    def _initialize_connections(self):
        """Initialize database engines and session makers"""
        # Database connection configuration - all values must be set via environment variables
        DATABASE_USER = os.getenv('DATABASE_USER')
        DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD')
        DATABASE_HOST = os.getenv('DATABASE_HOST', 'localhost')
        DATABASE_PORT = os.getenv('DATABASE_PORT', '5432')
        DATABASE_NAME = os.getenv('DATABASE_NAME', 'project_assignment')
        
        # Validate required credentials
        if not DATABASE_USER:
            raise ValueError(
                "DATABASE_USER environment variable must be set. "
                "No default values allowed for security."
            )
        if not DATABASE_PASSWORD:
            raise ValueError(
                "DATABASE_PASSWORD environment variable must be set. "
                "No default values allowed for security."
            )

        # URL-encode the password to handle special characters
        encoded_password = quote_plus(DATABASE_PASSWORD)
        DATABASE_URL = f"postgresql://{DATABASE_USER}:{encoded_password}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

        # Create read engine: Optimized for read-only queries
        # (can point to read replica in production)
        if self._read_engine is None:
            self._read_engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,  # Verify connections before using
                pool_recycle=3600,   # Recycle connections after 1 hour
                pool_size=5,         # Smaller pool for reads
                max_overflow=10,     # Allow overflow connections
                echo=False           # Set to True for SQL query logging
            )

        # Create write engine: Optimized for write operations
        # (always uses primary database)
        if self._write_engine is None:
            self._write_engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,  # Verify connections before using
                pool_recycle=3600,   # Recycle connections after 1 hour
                pool_size=10,       # Larger pool for writes
                max_overflow=20,    # More overflow for write operations
                echo=False           # Set to True for SQL query logging
            )

        # Create separate session makers for read and write
        if self._read_session_local is None:
            self._read_session_local = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self._read_engine
            )

        if self._write_session_local is None:
            self._write_session_local = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self._write_engine
            )

    @property
    def read_engine(self):
        """Get read engine instance (singleton)"""
        if not self._initialized:
            self.__init__()
        return self._read_engine

    @property
    def write_engine(self):
        """Get write engine instance (singleton)"""
        if not self._initialized:
            self.__init__()
        return self._write_engine

    @property
    def read_session_local(self):
        """Get read session maker (singleton)"""
        if not self._initialized:
            self.__init__()
        return self._read_session_local

    @property
    def write_session_local(self):
        """Get write session maker (singleton)"""
        if not self._initialized:
            self.__init__()
        return self._write_session_local


# Initialize singleton instance
_db_manager = DatabaseConnectionManager()

# Expose engines and session makers for backward compatibility
read_engine = _db_manager.read_engine
write_engine = _db_manager.write_engine
ReadSessionLocal = _db_manager.read_session_local
WriteSessionLocal = _db_manager.write_session_local

# For backward compatibility and table creation, use write engine
engine = write_engine
SessionLocal = WriteSessionLocal


# Dependency to get read-only DB session (for GET requests)
def get_read_db():
    """Get a read-only database session for GET operations"""
    db = ReadSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Dependency to get write DB session (for POST, PUT, DELETE operations)
def get_write_db():
    """Get a write database session for POST, PUT, DELETE operations"""
    db = WriteSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Legacy dependency for backward compatibility (defaults to write)
def get_db():
    """Legacy dependency - defaults to write session"""
    return get_write_db()

