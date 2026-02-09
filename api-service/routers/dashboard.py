from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from datetime import date
from typing import List

from database import get_read_db
from models import Book, Member, Borrowing, Testimonial
from schemas import LibraryStats, BorrowingDetailResponse, DashboardData
from auth import get_current_member

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(db: Session = Depends(get_read_db)):
    """Get dashboard data including stats, new books, and testimonials"""
    try:
        # Get stats - handle None values
        total_books = db.query(func.count(Book.id)).scalar() or 0
        total_members = db.query(func.count(Member.id)).scalar() or 0
        total_borrowings = db.query(func.count(Borrowing.id)).scalar() or 0
        active_borrowings = db.query(func.count(Borrowing.id)).filter(Borrowing.status == "borrowed").scalar() or 0
        
        overdue_books = db.query(func.count(Borrowing.id)).filter(
            and_(
                Borrowing.status == "borrowed",
                Borrowing.due_date < date.today()
            )
        ).scalar() or 0
        
        available_books = db.query(func.sum(Book.available_copies)).scalar() or 0
        
        stats = LibraryStats(
            total_books=total_books,
            total_members=total_members,
            total_borrowings=total_borrowings,
            active_borrowings=active_borrowings,
            overdue_books=overdue_books,
            available_books=available_books
        )
        
        # Get new books (last 10)
        new_books = db.query(Book).order_by(Book.created_at.desc()).limit(10).all()
        
        # Get recent approved testimonials (last 5) with book relationship
        recent_testimonials = db.query(Testimonial).options(
            joinedload(Testimonial.book)
        ).filter(
            Testimonial.is_approved == True
        ).order_by(Testimonial.created_at.desc()).limit(5).all()
        
        # Create DashboardData object to ensure proper serialization
        dashboard_data = DashboardData(
            stats=stats,
            new_books=new_books,
            recent_testimonials=recent_testimonials
        )
        return dashboard_data
    except Exception as e:
        # Return default data structure if there's an error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading dashboard data: {str(e)}"
        )


@router.get("/user/dashboard", response_model=List[BorrowingDetailResponse])
def get_user_dashboard(current_user = Depends(get_current_member), db: Session = Depends(get_read_db)):
    """Get current user's borrowed books"""
    if not current_user.member_id:
        return []
    
    borrowings = db.query(Borrowing).options(
        joinedload(Borrowing.book),
        joinedload(Borrowing.member)
    ).filter(
        Borrowing.member_id == current_user.member_id,
        Borrowing.status == "borrowed"
    ).order_by(Borrowing.due_date.asc()).all()
    
    return borrowings

