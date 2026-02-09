from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date

from database import get_read_db
from models import Book, Member, Borrowing
from schemas import LibraryStats

router = APIRouter(prefix="/api/stats", tags=["Statistics"])


@router.get("", response_model=LibraryStats)
def get_library_stats(db: Session = Depends(get_read_db)):
    """Get library statistics"""
    total_books = db.query(func.count(Book.id)).scalar()
    total_members = db.query(func.count(Member.id)).scalar()
    total_borrowings = db.query(func.count(Borrowing.id)).scalar()
    active_borrowings = db.query(func.count(Borrowing.id)).filter(Borrowing.status == "borrowed").scalar()
    
    # Count overdue books
    overdue_books = db.query(func.count(Borrowing.id)).filter(
        and_(
            Borrowing.status == "borrowed",
            Borrowing.due_date < date.today()
        )
    ).scalar()
    
    # Count available books
    available_books = db.query(func.sum(Book.available_copies)).scalar() or 0
    
    return LibraryStats(
        total_books=total_books,
        total_members=total_members,
        total_borrowings=total_borrowings,
        active_borrowings=active_borrowings,
        overdue_books=overdue_books,
        available_books=available_books
    )

