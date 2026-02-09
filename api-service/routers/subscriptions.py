from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_read_db, get_write_db
from models import Member, Subscription, User
from schemas import SubscriptionCreate, SubscriptionResponse
from auth import get_current_admin

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    subscription: SubscriptionCreate,
    db: Session = Depends(get_write_db)
):
    """Subscribe to library updates (can be anonymous or authenticated)"""
    # Check if subscription already exists
    existing_subscription = db.query(Subscription).filter(
        Subscription.email == subscription.email,
        Subscription.is_active == True
    ).first()
    
    if existing_subscription:
        raise HTTPException(status_code=400, detail="Email is already subscribed")
    
    # Use member_id from subscription or find by email
    member_id = subscription.member_id
    if not member_id:
        member = db.query(Member).filter(Member.email == subscription.email).first()
        if member:
            member_id = member.id
    
    db_subscription = Subscription(
        email=subscription.email,
        member_id=member_id,
        is_active=True
    )
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription


@router.get("", response_model=List[SubscriptionResponse])
def get_subscriptions(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin),  # Admin only
    db: Session = Depends(get_read_db)
):
    """Get all subscriptions (admin only)"""
    subscriptions = db.query(Subscription).filter(
        Subscription.is_active == True
    ).offset(skip).limit(limit).all()
    return subscriptions

