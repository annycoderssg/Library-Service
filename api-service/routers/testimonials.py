from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_read_db, get_write_db
from models import Book, Testimonial, User
from schemas import TestimonialCreate, TestimonialUpdate, TestimonialResponse
from auth import get_current_admin, get_current_member

router = APIRouter(prefix="/api/testimonials", tags=["Testimonials"])


@router.get("", response_model=List[TestimonialResponse])
def get_testimonials(
    skip: int = 0,
    limit: int = 100,
    book_id: Optional[int] = None,
    approved_only: bool = True,
    db: Session = Depends(get_read_db)
):
    """Get all testimonials (optionally filtered by book and approval status)"""
    query = db.query(Testimonial)
    
    if approved_only:
        query = query.filter(Testimonial.is_approved == True)
    
    if book_id:
        query = query.filter(Testimonial.book_id == book_id)
    
    testimonials = query.order_by(Testimonial.created_at.desc()).offset(skip).limit(limit).all()
    return testimonials


@router.get("/{testimonial_id}", response_model=TestimonialResponse)
def get_testimonial(testimonial_id: int, db: Session = Depends(get_read_db)):
    """Get a specific testimonial by ID"""
    testimonial = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return testimonial


@router.post("", response_model=TestimonialResponse, status_code=status.HTTP_201_CREATED)
def create_testimonial(
    testimonial: TestimonialCreate,
    current_user: User = Depends(get_current_member),
    db: Session = Depends(get_write_db)
):
    """Create a new testimonial (requires authentication)"""
    # Verify book exists
    book = db.query(Book).filter(Book.id == testimonial.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Use member_id from current user if available
    member_id = testimonial.member_id or current_user.member_id
    
    db_testimonial = Testimonial(
        book_id=testimonial.book_id,
        member_id=member_id,
        reader_name=testimonial.reader_name,
        rating=testimonial.rating,
        comment=testimonial.comment,
        is_approved=False  # Requires admin approval
    )
    db.add(db_testimonial)
    db.commit()
    db.refresh(db_testimonial)
    return db_testimonial


@router.put("/{testimonial_id}", response_model=TestimonialResponse)
def update_testimonial(
    testimonial_id: int,
    testimonial_update: TestimonialUpdate,
    current_user: User = Depends(get_current_admin),  # Only admin can update
    db: Session = Depends(get_write_db)
):
    """Update a testimonial (admin only)"""
    db_testimonial = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
    if not db_testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    update_data = testimonial_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_testimonial, field, value)
    
    db.commit()
    db.refresh(db_testimonial)
    return db_testimonial


@router.delete("/{testimonial_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_testimonial(
    testimonial_id: int,
    current_user: User = Depends(get_current_admin),  # Only admin can delete
    db: Session = Depends(get_write_db)
):
    """Delete a testimonial (admin only)"""
    db_testimonial = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
    if not db_testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    db.delete(db_testimonial)
    db.commit()
    return None

