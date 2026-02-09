from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_read_db, get_write_db
from models import Member, User
from schemas import UserSignup, UserLogin, Token, UserResponse, ProfileUpdate, ProfileResponse
from auth import create_access_token, get_current_user

# Export get_current_user for use in main.py
__all__ = ['router', 'profile_router', 'get_current_user', 'get_profile', 'update_profile']

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Create a separate router for profile endpoints (without auth prefix)
profile_router = APIRouter(prefix="/api", tags=["Authentication"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignup, db: Session = Depends(get_write_db)):
    """Sign up a new user (creates both user and member)"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Check if member with this email exists
    existing_member = db.query(Member).filter(Member.email == user_data.email).first()
    
    # Create member
    if not existing_member:
        member = Member(
            name=user_data.name,
            email=user_data.email,
            phone=user_data.phone,
            address=user_data.address
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        member_id = member.id
    else:
        member_id = existing_member.id
    
    # Create user
    user = User(
        email=user_data.email,
        role="member",
        member_id=member_id
    )
    user.set_password(user_data.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token (sub must be string for JWT)
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id
    }


@router.post("/login", response_model=Token)
@router.post("/signin", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_write_db)):
    """Login/Sign in existing user or admin"""
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not user.check_password(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token (sub must be string for JWT)
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return current_user


@router.get("/profile", response_model=ProfileResponse)
@profile_router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_read_db)):
    """Get current user profile with member information"""
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.id == current_user.member_id).first()
    
    return ProfileResponse(user=current_user, member=member)


@router.put("/profile", response_model=ProfileResponse)
@profile_router.put("/profile", response_model=ProfileResponse)
def update_profile(
    profile_update: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_write_db)
):
    """Update current user profile"""
    # Update member information if user has a member profile
    if current_user.member_id:
        member = db.query(Member).filter(Member.id == current_user.member_id).first()
        if member:
            if profile_update.name is not None:
                member.name = profile_update.name
            if profile_update.email is not None:
                # Check if email is already taken by another member
                existing_member = db.query(Member).filter(
                    Member.email == profile_update.email,
                    Member.id != member.id
                ).first()
                if existing_member:
                    raise HTTPException(status_code=400, detail="Email already exists")
                member.email = profile_update.email
                # Also update user email
                current_user.email = profile_update.email
            if profile_update.phone is not None:
                member.phone = profile_update.phone
            if profile_update.profile_picture is not None:
                member.profile_picture = profile_update.profile_picture
            db.commit()
            db.refresh(member)
    else:
        # If admin doesn't have member profile, update user email only
        # Note: Admins without member profiles can only update email and password
        # To update name, phone, or profile_picture, they need a member profile
        if profile_update.email is not None:
            existing_user = db.query(User).filter(
                User.email == profile_update.email,
                User.id != current_user.id
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already exists")
            current_user.email = profile_update.email
        
        # If admin tries to update profile fields but has no member profile, create one
        if (profile_update.name is not None or profile_update.phone is not None or 
            profile_update.profile_picture is not None):
            # Create a member profile for the admin
            new_member = Member(
                name=profile_update.name or current_user.email.split('@')[0],
                email=profile_update.email or current_user.email,
                phone=profile_update.phone,
                profile_picture=profile_update.profile_picture
            )
            db.add(new_member)
            db.commit()
            db.refresh(new_member)
            
            # Link user to member
            current_user.member_id = new_member.id
            db.commit()
            db.refresh(current_user)
    
    # Update password if provided
    if profile_update.password:
        current_user.set_password(profile_update.password)
    
    db.commit()
    db.refresh(current_user)
    
    # Get updated member info
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.id == current_user.member_id).first()
    
    return ProfileResponse(user=current_user, member=member)

