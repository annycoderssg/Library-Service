from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Any, Dict
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from database import get_read_db, get_write_db
from models import Book, User, Borrowing
from schemas import BookCreate, BookUpdate, BookResponse
from auth import get_current_admin

load_dotenv()

router = APIRouter(prefix="/api/books", tags=["Books"])

# Pagination constants from environment
DEFAULT_BOOKS_PER_PAGE = int(os.getenv("DEFAULT_BOOKS_PER_PAGE"))

class BookWithBorrowingCount(BaseModel):
    id: int
    title: str
    author: str
    isbn: Optional[str] = None
    published_year: Optional[int] = None
    total_copies: int
    available_copies: int
    borrowing_count: int  # Active borrowings count
    
    class Config:
        from_attributes = True

class PaginatedBooksResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    skip: int
    limit: int


@router.get("", response_model=PaginatedBooksResponse)
def get_books(skip: int = 0, limit: int = None, search: Optional[str] = None, page: int = None, db: Session = Depends(get_read_db)):
    """Get all books with pagination, search and borrowing count"""
    if limit is None:
        limit = DEFAULT_BOOKS_PER_PAGE
    
    # Handle page parameter (convert to skip)
    if page is not None and page > 0:
        skip = (page - 1) * limit
    
    # Build base query
    query = db.query(Book)
    
    # Apply search filter if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Book.title.ilike(search_term)) |
            (Book.author.ilike(search_term)) |
            (Book.isbn.ilike(search_term))
        )
    
    total = query.count()
    books = query.offset(skip).limit(limit).all()
    
    # Add borrowing count to each book
    result = []
    for book in books:
        # Get active borrowings count (not returned)
        borrowing_count = db.query(func.count(Borrowing.id)).filter(
            Borrowing.book_id == book.id,
            Borrowing.return_date.is_(None)
        ).scalar() or 0
        
        book_dict = {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "isbn": book.isbn,
            "published_year": book.published_year,
            "total_copies": book.total_copies,
            "available_copies": book.available_copies,
            "borrowing_count": borrowing_count,
            "created_at": book.created_at,
            "updated_at": book.updated_at
        }
        result.append(book_dict)
    
    return {
        "items": result,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{book_id}", response_model=BookResponse)
def get_book(book_id: int = Path(...), db: Session = Depends(get_read_db)):
    """Get a specific book by ID"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("", status_code=status.HTTP_201_CREATED, response_model=BookResponse)
def create_book(book: BookCreate, current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Create a new book (admin only)"""
    # Check if ISBN already exists
    if book.isbn:
        existing_book = db.query(Book).filter(Book.isbn == book.isbn).first()
        if existing_book:
            raise HTTPException(status_code=400, detail="Book with this ISBN already exists")
    
    book_data = book.dict()
    # Set available_copies equal to total_copies for new books
    book_data['available_copies'] = book_data.get('total_copies', 1)
    
    db_book = Book(**book_data)
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book


@router.put("/{book_id}", response_model=BookResponse)
def update_book(book_id: int = Path(...), book_update: BookUpdate = ..., current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Update a book (admin only)"""
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Check ISBN uniqueness if being updated
    if book_update.isbn and book_update.isbn != db_book.isbn:
        existing_book = db.query(Book).filter(Book.isbn == book_update.isbn).first()
        if existing_book:
            raise HTTPException(status_code=400, detail="Book with this ISBN already exists")
    
    # Update fields
    update_data = book_update.dict(exclude_unset=True)
    
    # Get actual active borrowings count (not returned books)
    active_borrowings_count = db.query(func.count(Borrowing.id)).filter(
        Borrowing.book_id == book_id,
        Borrowing.return_date.is_(None)  # Only count books that haven't been returned
    ).scalar() or 0
    
    for field, value in update_data.items():
        setattr(db_book, field, value)
    
    # Update available_copies when total_copies changes
    if 'total_copies' in update_data:
        new_total = update_data['total_copies']
        # available = new_total - active_borrowings (not returned)
        db_book.available_copies = max(0, new_total - active_borrowings_count)
    
    # Ensure available_copies doesn't exceed total_copies
    if db_book.available_copies > db_book.total_copies:
        db_book.available_copies = db_book.total_copies
    
    db.commit()
    db.refresh(db_book)
    return db_book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int = Path(...), current_user: User = Depends(get_current_admin), db: Session = Depends(get_write_db)):
    """Delete a book (admin only)"""
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    db.delete(db_book)
    db.commit()
    return None

