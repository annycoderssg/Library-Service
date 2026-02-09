from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from database import get_read_db, get_write_db
from models import Book, User
from schemas import BookCreate, BookUpdate, BookResponse
from auth import get_current_admin

load_dotenv()

router = APIRouter(prefix="/api/books", tags=["Books"])

# Pagination constants from environment
DEFAULT_BOOKS_PER_PAGE = int(os.getenv("DEFAULT_BOOKS_PER_PAGE"))

class PaginatedBooksResponse(BaseModel):
    items: List[BookResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=PaginatedBooksResponse)
def get_books(skip: int = 0, limit: int = None, db: Session = Depends(get_read_db)):
    """Get all books with pagination"""
    if limit is None:
        limit = DEFAULT_BOOKS_PER_PAGE
    total = db.query(func.count(Book.id)).scalar()
    books = db.query(Book).offset(skip).limit(limit).all()
    return {
        "items": books,
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
    
    db_book = Book(**book.dict())
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
    for field, value in update_data.items():
        setattr(db_book, field, value)
    
    # Ensure available_copies doesn't exceed total_copies
    if 'total_copies' in update_data or 'available_copies' in update_data:
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

