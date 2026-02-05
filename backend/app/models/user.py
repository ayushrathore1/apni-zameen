"""
User model for authentication.
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base


class UserRole(str, PyEnum):
    """User roles for access control."""
    PUBLIC = "PUBLIC"
    OFFICIAL = "OFFICIAL"
    ADMIN = "ADMIN"


class User(Base):
    """
    Represents a system user.
    
    Supports three roles:
    - PUBLIC: Citizen users with read-only access
    - OFFICIAL: Government officials with edit access
    - ADMIN: Administrators with full access
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Auth credentials
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Profile
    full_name = Column(String(200), nullable=False)
    department = Column(String(200), nullable=True)
    designation = Column(String(100), nullable=True)
    
    # Role
    role = Column(
        Enum(UserRole, name="user_role_enum"),
        default=UserRole.PUBLIC,
        nullable=False,
        index=True
    )
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<User(email={self.email}, role={self.role.value})>"
    
    def to_dict(self) -> dict:
        """Convert user to dictionary (exclude password)."""
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "department": self.department,
            "designation": self.designation,
            "role": self.role.value,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
