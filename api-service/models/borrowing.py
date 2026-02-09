from sqlalchemy import Column, Integer, Date, DateTime, DECIMAL, ForeignKey, CheckConstraint, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Borrowing(Base):
    __tablename__ = "borrowings"
    
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    borrow_date = Column(Date, nullable=False, server_default=func.current_date())
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    status = Column(String(20), default="borrowed")
    fine_amount = Column(DECIMAL(10, 2), default=0.00)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    book = relationship("Book", back_populates="borrowings")
    member = relationship("Member", back_populates="borrowings")
    
    __table_args__ = (
        CheckConstraint("status IN ('borrowed', 'returned', 'overdue')", name="check_status"),
    )

