from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from database import get_read_db, get_write_db
from models import Member, User, Borrowing
from schemas import MemberCreate, MemberUpdate, MemberResponse, BorrowingDetailResponse
from auth import get_current_admin

load_dotenv()

router = APIRouter(prefix="/api/members", tags=["Members"])

# Pagination constants from environment
DEFAULT_MEMBERS_PER_PAGE = int(os.getenv("DEFAULT_MEMBERS_PER_PAGE", "10"))

class PaginatedMembersResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    skip: int
    limit: int


@router.get("", response_model=PaginatedMembersResponse)
def get_members(skip: int = 0, limit: int = None, search: Optional[str] = None, page: int = None, db: Session = Depends(get_read_db)):
    """Get all members with pagination and search"""
    if limit is None:
        limit = DEFAULT_MEMBERS_PER_PAGE
    
    # Handle page parameter (convert to skip)
    if page is not None and page > 0:
        skip = (page - 1) * limit
    
    # Build base query
    query = db.query(Member)
    
    # Apply search filter if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Member.name.ilike(search_term)) |
            (Member.email.ilike(search_term)) |
            (Member.phone.ilike(search_term))
        )
    
    total = query.count()
    members = query.offset(skip).limit(limit).all()
    
    # Add user role information to each member
    result = []
    for member in members:
        member_dict = {
            "id": member.id,
            "name": member.name,
            "email": member.email,
            "phone": member.phone,
            "address": member.address,
            "profile_picture": getattr(member, 'profile_picture', None),  # Handle if column doesn't exist yet
            "membership_date": member.membership_date.isoformat() if member.membership_date else None,
            "created_at": member.created_at.isoformat() if member.created_at else None,
            "updated_at": member.updated_at.isoformat() if member.updated_at else None,
            "user_role": None
        }
        
        # Check if member has a user account
        user = db.query(User).filter(User.member_id == member.id).first()
        if user:
            member_dict["user_role"] = user.role
        
        result.append(member_dict)
    
    return {
        "items": result,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: int = Path(...), include_user: bool = False, db: Session = Depends(get_read_db)):
    """Get a specific member by ID. Optionally include user account info."""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # If include_user is True, check if member has a user account
    if include_user:
        user = db.query(User).filter(User.member_id == member_id).first()
        if user:
            # Add user info to response (we'll need to create a new response model for this)
            # For now, just return member
            pass
    
    return member


@router.get("/{member_id}/user")
def get_member_user(member_id: int = Path(...), db: Session = Depends(get_read_db)):
    """Get user account info for a member (if exists)"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    user = db.query(User).filter(User.member_id == member_id).first()
    if not user:
        return {"has_user_account": False}
    
    return {
        "has_user_account": True,
        "role": user.role,
        "is_active": user.is_active
    }


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MemberResponse)
def create_member(member: MemberCreate, current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Create a new member (admin only). Optionally create user account with role."""
    # Check if email already exists
    existing_member = db.query(Member).filter(Member.email == member.email).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="Member with this email already exists")
    
    # Check if user already exists
    if member.create_user_account:
        existing_user = db.query(User).filter(User.email == member.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Extract member data (exclude role, password, create_user_account)
    member_data = member.dict(exclude={'role', 'password', 'create_user_account'})
    db_member = Member(**member_data)
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    # Create user account if requested
    if member.create_user_account:
        if not member.role:
            member.role = "member"  # Default to member
        if not member.password:
            raise HTTPException(status_code=400, detail="Password is required when creating user account")
        
        user = User(
            email=member.email,
            role=member.role,
            member_id=db_member.id,
            is_active=True
        )
        user.set_password(member.password)
        db.add(user)
        db.commit()
    
    return db_member


@router.put("/{member_id}", response_model=MemberResponse)
def update_member(member_id: int = Path(...), member_update: MemberUpdate = ..., current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Update a member (admin only). Optionally update/create user account with role."""
    db_member = db.query(Member).filter(Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check email uniqueness if being updated
    if member_update.email and member_update.email != db_member.email:
        existing_member = db.query(Member).filter(Member.email == member_update.email).first()
        if existing_member:
            raise HTTPException(status_code=400, detail="Member with this email already exists")
    
    # Extract member update data (exclude role, password, update_user_account)
    update_data = member_update.dict(exclude_unset=True, exclude={'role', 'password', 'update_user_account'})
    for field, value in update_data.items():
        setattr(db_member, field, value)
    
    db.commit()
    db.refresh(db_member)
    
    # Handle user account update/creation
    if member_update.update_user_account:
        user = db.query(User).filter(User.email == db_member.email).first()
        
        if user:
            # Update existing user
            if member_update.role:
                user.role = member_update.role
            if member_update.password:
                user.set_password(member_update.password)
            user.member_id = db_member.id
            db.commit()
        else:
            # Create new user account
            if not member_update.role:
                member_update.role = "member"  # Default to member
            if not member_update.password:
                raise HTTPException(status_code=400, detail="Password is required when creating user account")
            
            user = User(
                email=db_member.email,
                role=member_update.role,
                member_id=db_member.id,
                is_active=True
            )
            user.set_password(member_update.password)
            db.add(user)
            db.commit()
    
    return db_member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int = Path(...), current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Delete a member (admin only)"""
    db_member = db.query(Member).filter(Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check for active borrowings (not returned)
    active_borrowings = db.query(Borrowing).filter(
        Borrowing.member_id == member_id,
        Borrowing.return_date == None
    ).count()
    
    if active_borrowings > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete member with {active_borrowings} active borrowing(s). Please return all books first."
        )
    
    # Delete associated user account if exists
    user = db.query(User).filter(User.member_id == member_id).first()
    if user:
        db.delete(user)
    
    # Set member_id to NULL for returned borrowings (historical records)
    db.query(Borrowing).filter(Borrowing.member_id == member_id).update(
        {"member_id": None}, synchronize_session=False
    )
    
    db.delete(db_member)
    db.commit()
    return None


@router.get("/{member_id}/borrowings", response_model=List[BorrowingDetailResponse])
def get_member_borrowings(member_id: int = Path(...), status_filter: Optional[str] = None, db: Session = Depends(get_read_db)):
    """Get all borrowings for a specific member"""
    # Verify member exists
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    query = db.query(Borrowing).options(
        joinedload(Borrowing.book),
        joinedload(Borrowing.member)
    ).filter(Borrowing.member_id == member_id)
    if status_filter:
        query = query.filter(Borrowing.status == status_filter)
    
    borrowings = query.all()
    return borrowings

