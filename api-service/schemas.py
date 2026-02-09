from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import date, datetime


# Book Schemas
class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    isbn: Optional[str] = Field(None, max_length=20)
    published_year: Optional[int] = Field(None, ge=1000, le=2100)
    total_copies: int = Field(1, ge=1)
    available_copies: int = Field(1, ge=0)

    @validator('available_copies')
    def validate_available_copies(cls, v, values):
        if 'total_copies' in values and v > values['total_copies']:
            raise ValueError('available_copies cannot exceed total_copies')
        return v


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    author: Optional[str] = Field(None, min_length=1, max_length=255)
    isbn: Optional[str] = Field(None, max_length=20)
    published_year: Optional[int] = Field(None, ge=1000, le=2100)
    total_copies: Optional[int] = Field(None, ge=1)
    available_copies: Optional[int] = Field(None, ge=0)


class BookResponse(BookBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Member Schemas
class MemberBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    profile_picture: Optional[str] = None


class MemberCreate(MemberBase):
    role: Optional[str] = Field(None, pattern='^(admin|member)$')
    password: Optional[str] = Field(None, min_length=6)
    create_user_account: Optional[bool] = Field(False, description="Whether to create a user account for this member")


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    role: Optional[str] = Field(None, pattern='^(admin|member)$')
    password: Optional[str] = Field(None, min_length=6)
    update_user_account: Optional[bool] = Field(False, description="Whether to update/create user account")


class MemberResponse(MemberBase):
    id: int
    membership_date: date
    created_at: datetime
    updated_at: datetime
    user_role: Optional[str] = None  # Role if member has user account

    class Config:
        from_attributes = True


# Borrowing Schemas
class BorrowingBase(BaseModel):
    book_id: int
    member_id: Optional[int] = None  # Optional - will be set from current user for members
    due_date: date


class BorrowingCreate(BorrowingBase):
    pass


class BorrowingUpdate(BaseModel):
    return_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern='^(borrowed|returned|overdue)$')
    fine_amount: Optional[float] = Field(None, ge=0)


class BorrowingResponse(BorrowingBase):
    id: int
    borrow_date: date
    return_date: Optional[date]
    status: str
    fine_amount: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Borrowing with related data
class BorrowingDetailResponse(BorrowingResponse):
    book: BookResponse
    member: MemberResponse

    class Config:
        from_attributes = True


# Statistics Schema
class LibraryStats(BaseModel):
    total_books: int
    total_members: int
    total_borrowings: int
    active_borrowings: int
    overdue_books: int
    available_books: int


# Authentication Schemas
class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    member_id: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    profile_picture: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)


class ProfileResponse(BaseModel):
    user: UserResponse
    member: Optional[MemberResponse] = None

    class Config:
        from_attributes = True


# Testimonial Schemas
class TestimonialCreate(BaseModel):
    book_id: int
    reader_name: str = Field(..., min_length=1, max_length=255)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=1)
    member_id: Optional[int] = None


class TestimonialUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, min_length=1)
    is_approved: Optional[bool] = None


class TestimonialResponse(BaseModel):
    id: int
    book_id: int
    member_id: Optional[int]
    reader_name: str
    rating: int
    comment: str
    is_approved: bool
    created_at: datetime
    updated_at: datetime
    book: Optional[BookResponse] = None

    class Config:
        from_attributes = True


# Subscription Schemas
class SubscriptionCreate(BaseModel):
    email: EmailStr
    member_id: Optional[int] = None


class SubscriptionResponse(BaseModel):
    id: int
    email: str
    member_id: Optional[int]
    is_active: bool
    subscribed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# Dashboard Schema
class DashboardData(BaseModel):
    stats: LibraryStats
    new_books: List[BookResponse]
    recent_testimonials: List[TestimonialResponse]

