from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import date
from typing import List, Optional

from database import get_read_db, get_write_db
from models import Book, Member, Borrowing, User
from schemas import BorrowingCreate, BorrowingUpdate, BorrowingResponse, BorrowingDetailResponse
from auth import get_current_admin, get_current_member

router = APIRouter(prefix="/api/borrowings", tags=["Borrowings"])

@router.get("")
def get_borrowings(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    member_id: Optional[int] = None,
    book_id: Optional[int] = None,
    db: Session = Depends(get_read_db)
):
    """Get all borrowings with optional filters"""
    query = db.query(Borrowing).options(
        joinedload(Borrowing.book),
        joinedload(Borrowing.member)
    )
    
    # Validate status_filter to prevent invalid values (defense in depth)
    if status_filter:
        valid_statuses = ["borrowed", "returned", "overdue"]
        if status_filter not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status_filter. Must be one of: {', '.join(valid_statuses)}"
            )
        query = query.filter(Borrowing.status == status_filter)
    if member_id:
        query = query.filter(Borrowing.member_id == member_id)
    if book_id:
        query = query.filter(Borrowing.book_id == book_id)
    
    borrowings = query.offset(skip).limit(limit).all()
    return borrowings


@router.get("/{borrowing_id}", response_model=BorrowingDetailResponse)
def get_borrowing(borrowing_id: int = Path(...), db: Session = Depends(get_read_db)):
    """Get a specific borrowing by ID"""
    borrowing = db.query(Borrowing).options(
        joinedload(Borrowing.book),
        joinedload(Borrowing.member)
    ).filter(Borrowing.id == borrowing_id).first()
    if not borrowing:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    return borrowing


# Note: This endpoint is handled in members.py router as /api/members/{member_id}/borrowings

@router.post("", status_code=status.HTTP_201_CREATED, response_model=BorrowingResponse)
def create_borrowing(borrowing: BorrowingCreate, current_user: User = Depends(get_current_member), db: Session = Depends(get_write_db)):
    """Record a book borrowing (requires authentication)"""
    book_id = borrowing.book_id
    
    # Verify book exists
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # For members, use their own member_id. Admins can specify any member_id
    member_id = borrowing.member_id
    if current_user.role == "member":
        if current_user.member_id:
            member_id = current_user.member_id
        else:
            raise HTTPException(status_code=400, detail="Member profile not found. Please contact administrator.")
    elif current_user.role == "admin" and not member_id:
        raise HTTPException(status_code=400, detail="member_id is required for admin users")
    
    # Verify member exists
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if book is available
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="Book is not available for borrowing")
    
    # Check if member already has this book borrowed
    active_borrowing = db.query(Borrowing).filter(
        and_(
            Borrowing.book_id == book_id,
            Borrowing.member_id == member_id,
            Borrowing.status == "borrowed"
        )
    ).first()
    if active_borrowing:
        raise HTTPException(status_code=400, detail="Member already has this book borrowed")
    
    # Create borrowing record
    borrowing_data = borrowing.dict()
    borrowing_data['book_id'] = book_id
    borrowing_data['member_id'] = member_id
    db_borrowing = Borrowing(**borrowing_data)
    db.add(db_borrowing)
    
    # Update book availability
    book.available_copies -= 1
    
    db.commit()
    db.refresh(db_borrowing)
    return db_borrowing


@router.put("/{borrowing_id}/return", response_model=BorrowingResponse)
def return_book(borrowing_id: int = Path(...), fine_amount: Optional[float] = None, current_user: User = Depends(get_current_member), db: Session = Depends(get_write_db)):
    """Record a book return (requires authentication)"""
    borrowing = db.query(Borrowing).filter(Borrowing.id == borrowing_id).first()
    if not borrowing:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    
    # Members can only return their own books
    if current_user.role == "member" and current_user.member_id != borrowing.member_id:
        raise HTTPException(status_code=403, detail="You can only return your own books")
    
    if borrowing.status == "returned":
        raise HTTPException(status_code=400, detail="Book has already been returned")
    
    # Update borrowing record
    borrowing.return_date = date.today()
    borrowing.status = "returned"
    
    # Check if overdue and calculate fine
    if borrowing.due_date < date.today():
        days_overdue = (date.today() - borrowing.due_date).days
        # Simple fine calculation: $1 per day overdue
        calculated_fine = days_overdue * 1.0
        borrowing.fine_amount = fine_amount if fine_amount is not None else calculated_fine
        borrowing.status = "returned"  # Still returned, but fine is recorded
    
    # Update book availability
    book = db.query(Book).filter(Book.id == borrowing.book_id).first()
    book.available_copies += 1
    
    db.commit()
    db.refresh(borrowing)
    return borrowing


@router.put("/{borrowing_id}", response_model=BorrowingResponse)
def update_borrowing(borrowing_id: int = Path(...), borrowing_update: BorrowingUpdate = ..., current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Update a borrowing record (admin only)"""
    borrowing = db.query(Borrowing).filter(Borrowing.id == borrowing_id).first()
    if not borrowing:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    
    update_data = borrowing_update.dict(exclude_unset=True)
    
    # Handle return date update
    if 'return_date' in update_data and update_data['return_date']:
        if borrowing.status == "returned":
            raise HTTPException(status_code=400, detail="Book has already been returned")
        
        borrowing.return_date = update_data['return_date']
        borrowing.status = "returned"
        
        # Update book availability
        book = db.query(Book).filter(Book.id == borrowing.book_id).first()
        book.available_copies += 1
    
    # Update other fields
    for field, value in update_data.items():
        if field != 'return_date':
            setattr(borrowing, field, value)
    
    db.commit()
    db.refresh(borrowing)
    return borrowing


@router.delete("/{borrowing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_borrowing(borrowing_id: int = Path(...), current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Delete a borrowing record (admin only)"""
    borrowing = db.query(Borrowing).filter(Borrowing.id == borrowing_id).first()
    if not borrowing:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    
    # If book is still borrowed, restore availability
    if borrowing.status == "borrowed":
        book = db.query(Book).filter(Book.id == borrowing.book_id).first()
        if book:
            book.available_copies += 1
    
    db.delete(borrowing)
    db.commit()
    return None

