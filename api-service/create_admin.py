"""
Script to create an admin user for the library management system.

Usage:
    python create_admin.py
    
Or with custom credentials:
    python create_admin.py --email admin@library.com --password Admin123 --name "Admin User"
"""
import sys
import os
import argparse
from sqlalchemy.orm import Session

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_write_db, WriteSessionLocal
from models import User, Member

def create_admin_user(email: str, password: str, name: str = "Admin User"):
    """Create an admin user"""
    db: Session = WriteSessionLocal()
    
    try:
        # Check if admin user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            if existing_user.role == "admin":
                print(f"❌ Admin user with email '{email}' already exists!")
                return False
            else:
                print(f"❌ User with email '{email}' already exists but is not an admin!")
                print(f"   Current role: {existing_user.role}")
                return False
        
        # Check if member exists
        existing_member = db.query(Member).filter(Member.email == email).first()
        
        if existing_member:
            member_id = existing_member.id
            print(f"✓ Using existing member profile (ID: {member_id})")
        else:
            # Create member
            member = Member(
                name=name,
                email=email,
                phone=None,
                address=None
            )
            db.add(member)
            db.commit()
            db.refresh(member)
            member_id = member.id
            print(f"✓ Created member profile (ID: {member_id})")
        
        # Create admin user
        admin_user = User(
            email=email,
            role="admin",
            member_id=member_id,
            is_active=True
        )
        admin_user.set_password(password)
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"\n✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: admin")
        print(f"   User ID: {admin_user.id}")
        print(f"\n📝 You can now login with:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {str(e)}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create an admin user for the library management system")
    parser.add_argument("--email", default="admin@library.com", help="Admin email address")
    parser.add_argument("--password", default="admin123", help="Admin password")
    parser.add_argument("--name", default="Admin User", help="Admin full name")
    
    args = parser.parse_args()
    
    print("🔐 Creating admin user...")
    print(f"   Email: {args.email}")
    print(f"   Name: {args.name}\n")
    
    success = create_admin_user(args.email, args.password, args.name)
    
    if not success:
        sys.exit(1)
