from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
from dotenv import load_dotenv

from database import get_read_db, get_write_db, engine, Base
from routers import books, members, borrowings, statistics, auth, testimonials, subscriptions, dashboard

# Load environment variables
load_dotenv()

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Neighborhood Library Service API",
    description="REST API for managing library books, members, and lending operations",
    version="1.0.0"
)

# CORS middleware configuration from environment variables
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:9001,http://localhost:5173,http://127.0.0.1:9001")
# Split comma-separated origins into a list
origins_list = [origin.strip() for origin in ALLOWED_ORIGINS.split(",")] if ALLOWED_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,  # Can be True when using specific origins
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include all routers
app.include_router(books.router)
app.include_router(members.router)
app.include_router(borrowings.router)
app.include_router(statistics.router)
app.include_router(auth.router)
app.include_router(auth.profile_router)  # Profile endpoints at /api/profile
app.include_router(testimonials.router)
app.include_router(subscriptions.router)
app.include_router(dashboard.router)

# ==================== HEALTH CHECK ====================

@app.get("/", tags=["Health"])
def root():
    """Health check endpoint"""
    return {"message": "Neighborhood Library Service API is running", "version": "1.0.0"}


@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_read_db)):
    """Detailed health check with database connection"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
