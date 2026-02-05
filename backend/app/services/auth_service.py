"""
Authentication service with JWT tokens and password hashing.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..config import settings
from ..models.user import User, UserRole


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


class AuthService:
    """Service for handling authentication operations."""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
        
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @classmethod
    def authenticate_user(cls, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user by email and password."""
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        if not cls.verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
    
    @classmethod
    def get_user_by_email(cls, db: Session, email: str) -> Optional[User]:
        """Get a user by email."""
        return db.query(User).filter(User.email == email).first()
    
    @classmethod
    def get_user_by_id(cls, db: Session, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    @classmethod
    def create_user(
        cls,
        db: Session,
        email: str,
        password: str,
        full_name: str,
        role: UserRole = UserRole.PUBLIC,
        department: Optional[str] = None,
        designation: Optional[str] = None,
    ) -> User:
        """Create a new user."""
        # Check if user exists
        existing = cls.get_user_by_email(db, email)
        if existing:
            raise ValueError("User with this email already exists")
        
        # Create user
        user = User(
            email=email,
            password_hash=cls.get_password_hash(password),
            full_name=full_name,
            role=role,
            department=department,
            designation=designation,
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user


# Create singleton instance
auth_service = AuthService()
