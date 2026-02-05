"""
Authentication API Endpoints.

Provides endpoints for:
- User registration
- Login with JWT tokens
- Token refresh
- Get current user
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..services.auth_service import auth_service


router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


# ==========================================
# Pydantic Schemas
# ==========================================

class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr
    password: str
    full_name: str
    department: Optional[str] = None
    designation: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """Schema for user response."""
    id: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool
    created_at: Optional[str] = None


# ==========================================
# Dependencies
# ==========================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get the current user from JWT token."""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = auth_service.decode_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    user = auth_service.get_user_by_id(db, user_id)
    return user


async def require_auth(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """Require authentication - raises 401 if not authenticated."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_official(
    user: User = Depends(require_auth),
) -> User:
    """Require OFFICIAL or ADMIN role."""
    if user.role not in [UserRole.OFFICIAL, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Official access required.",
        )
    return user


async def require_admin(
    user: User = Depends(require_auth),
) -> User:
    """Require ADMIN role."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin access required.",
        )
    return user


# ==========================================
# Endpoints
# ==========================================

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new user.
    
    By default, new users get the PUBLIC role.
    Officials must be upgraded by an admin.
    """
    try:
        user = auth_service.create_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name,
            department=user_data.department,
            designation=user_data.designation,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    # Create token
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return Token(
        access_token=access_token,
        user=user.to_dict(),
    )


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Login with email and password.
    
    Returns a JWT token for authenticated requests.
    """
    user = auth_service.authenticate_user(
        db=db,
        email=credentials.email,
        password=credentials.password,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return Token(
        access_token=access_token,
        user=user.to_dict(),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(require_auth),
):
    """
    Get the current authenticated user.
    """
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        department=user.department,
        designation=user.designation,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    user: User = Depends(require_auth),
):
    """
    Refresh the access token.
    
    Requires a valid current token.
    """
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    
    return Token(
        access_token=access_token,
        user=user.to_dict(),
    )
