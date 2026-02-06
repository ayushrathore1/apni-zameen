"""
Seed script to create an admin user for testing.
Run this after starting the backend: python -m scripts.seed_admin
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models.user import User, UserRole
from app.services.auth_service import auth_service


def seed_admin():
    """Create an admin user if none exists."""
    db = SessionLocal()
    
    try:
        # Check if admin exists
        existing = db.query(User).filter(User.email == "admin@land.gov.in").first()
        
        if existing:
            print(f"Admin user already exists: {existing.email}")
            return
        
        # Create admin user
        admin = User(
            email="admin@land.gov.in",
            password_hash=auth_service.get_password_hash("password123"),
            full_name="System Admin",
            role=UserRole.ADMIN,
            department="Land Records",
            designation="Administrator",
            is_active=True,
        )
        
        db.add(admin)
        db.commit()
        
        print("✅ Admin user created successfully!")
        print(f"   Email: admin@land.gov.in")
        print(f"   Password: password123")
        print(f"   Role: ADMIN")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Initializing database...")
    try:
        init_db()
    except Exception as e:
        print(f"Note: DB init issue (might be normal): {e}")
    
    print("\nSeeding admin user...")
    seed_admin()
