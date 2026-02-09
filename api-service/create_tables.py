#!/usr/bin/env python3
"""
Script to create database tables using SQLAlchemy
This will create all tables defined in models.py
"""

from database import engine, Base
from models import Book, Member, Borrowing, User, Testimonial, Subscription
import sys

def create_tables():
    """Create all tables in the database"""
    try:
        print("🔧 Creating database tables...")
        print("")
        
        # Create all tables defined in Base.metadata
        Base.metadata.create_all(bind=engine)
        
        print("✅ Tables created successfully!")
        print("")
        print("Created tables:")
        print("  - books")
        print("  - members")
        print("  - borrowings")
        print("  - users")
        print("  - testimonials")
        print("  - subscriptions")
        print("")
        print("✅ Database schema is ready!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        print("")
        print("Troubleshooting:")
        print("  1. Check PostgreSQL is running (sudo systemctl status postgresql)")
        print("  2. Verify database 'project_assignment' exists")
        print("  3. Check .env file has correct credentials")
        sys.exit(1)

if __name__ == "__main__":
    create_tables()
