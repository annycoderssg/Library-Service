"""
Cron job script to check return due dates and send email reminders to users.
This script should be run daily via cron job.

Usage:
    python email_reminder.py

Cron job example (runs daily at 9 AM):
    0 9 * * * cd /path/to/api-service && /path/to/venv/bin/python email_reminder.py
"""
import os
import sys
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_write_db, ReadSessionLocal
from models import Borrowing, Member, Book

load_dotenv()

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "Neighborhood Library")


def send_email(to_email: str, subject: str, body: str):
    """Send email using SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"Email not configured. Would send to {to_email}: {subject}")
        return False
    
    try:
        message = MIMEMultipart()
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = to_email
        message["Subject"] = subject
        
        message.attach(MIMEText(body, "html"))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {str(e)}")
        return False


def get_due_soon_borrowings(db: Session, days_ahead: int = 1):
    """Get borrowings that are due within specified days"""
    target_date = date.today() + timedelta(days=days_ahead)
    
    borrowings = db.query(Borrowing).join(Member).join(Book).filter(
        and_(
            Borrowing.status == "borrowed",
            Borrowing.due_date <= target_date,
            Borrowing.due_date >= date.today()
        )
    ).all()
    
    return borrowings


def get_overdue_borrowings(db: Session):
    """Get borrowings that are overdue"""
    borrowings = db.query(Borrowing).join(Member).join(Book).filter(
        and_(
            Borrowing.status == "borrowed",
            Borrowing.due_date < date.today()
        )
    ).all()
    
    return borrowings


def create_email_body(borrowing: Borrowing, is_overdue: bool = False) -> str:
    """Create HTML email body for reminder"""
    days_overdue = (date.today() - borrowing.due_date).days if is_overdue else 0
    days_until_due = (borrowing.due_date - date.today()).days if not is_overdue else 0
    
    if is_overdue:
        subject_prefix = "URGENT: "
        urgency_text = f"<p style='color: red; font-weight: bold;'>This book is {days_overdue} day(s) overdue!</p>"
    else:
        subject_prefix = ""
        urgency_text = f"<p>This book is due in {days_until_due} day(s).</p>"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Library Book Reminder</h2>
            <p>Dear {borrowing.member.name},</p>
            
            {urgency_text}
            
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Book Details:</h3>
                <p><strong>Title:</strong> {borrowing.book.title}</p>
                <p><strong>Author:</strong> {borrowing.book.author}</p>
                <p><strong>Borrowed Date:</strong> {borrowing.borrow_date}</p>
                <p><strong>Due Date:</strong> {borrowing.due_date}</p>
            </div>
            
            <p>Please return this book to the library as soon as possible.</p>
            
            {f"<p style='color: red;'><strong>Note:</strong> Overdue books may incur fines.</p>" if is_overdue else ""}
            
            <p>Thank you for using our library service!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
                This is an automated reminder from {FROM_NAME}. 
                Please do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    return body


def send_reminders():
    """Main function to send email reminders"""
    db: Session = ReadSessionLocal()
    
    try:
        # Get due soon borrowings (due in 1 day)
        due_soon = get_due_soon_borrowings(db, days_ahead=1)
        print(f"Found {len(due_soon)} books due soon")
        
        for borrowing in due_soon:
            if borrowing.member.email:
                subject = f"Reminder: Book '{borrowing.book.title}' is due soon"
                body = create_email_body(borrowing, is_overdue=False)
                send_email(borrowing.member.email, subject, body)
        
        # Get overdue borrowings
        overdue = get_overdue_borrowings(db)
        print(f"Found {len(overdue)} overdue books")
        
        for borrowing in overdue:
            if borrowing.member.email:
                subject = f"URGENT: Book '{borrowing.book.title}' is overdue"
                body = create_email_body(borrowing, is_overdue=True)
                send_email(borrowing.member.email, subject, body)
        
        print("Email reminder process completed")
        
    except Exception as e:
        print(f"Error in email reminder process: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting email reminder process...")
    send_reminders()
    print("Email reminder process finished.")

