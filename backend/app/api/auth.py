from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, AuditLog
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, public_pem
from app.api.dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginData(BaseModel):
    email: str
    password: str

class RegisterData(BaseModel):
    email: str
    password: str

class GoogleLoginData(BaseModel):
    email: str
    google_id: str
    name: Optional[str] = None

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
    }

@router.post("/google-login")
def google_login(data: GoogleLoginData, request: Request, db: Session = Depends(get_db)):
    """Register or login a user via Google OAuth (ID token verified on frontend)."""
    # Try to find by google_id first
    user = db.query(User).filter(User.google_id == data.google_id).first()
    if not user:
        # Try by email (link existing account)
        user = db.query(User).filter(User.email == data.email).first()
        if user:
            user.google_id = data.google_id  # type: ignore[assignment]
            db.commit()
        else:
            # Create a new user
            user = User(
                email=data.email,
                google_id=data.google_id,
                hashed_password=None,
                role="User",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            audit = AuditLog(
                user_id=user.id,
                action="google_register",
                details=f"New user registered via Google: {data.email}",
                ip_address=request.client.host if request.client else "unknown"
            )
            db.add(audit)
            db.commit()

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    audit = AuditLog(
        user_id=user.id,
        action="google_login",
        details="User logged in via Google",
        ip_address=request.client.host if request.client else "unknown"
    )
    db.add(audit)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
    }

@router.post("/register")
def register(data: RegisterData, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(data.password)
    user = User(email=data.email, hashed_password=hashed, role="User")
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        user_id=user.id,
        action="register",
        details=f"New user registered: {data.email}",
        ip_address=request.client.host if request.client else "unknown"
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
    }

@router.post("/login")
def login(data: LoginData, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.hashed_password or not verify_password(data.password, str(user.hashed_password)):
        audit = AuditLog(
            action="login_failed",
            details=f"Failed login attempt for email: {data.email}",
            ip_address=request.client.host if request.client else "unknown"
        )
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    audit = AuditLog(
        user_id=user.id,
        action="login_success",
        details="User logged in successfully",
        ip_address=request.client.host if request.client else "unknown"
    )
    db.add(audit)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
    }

@router.get("/public-key")
def get_public_key():
    return {"public_key": public_pem.decode("utf-8")}
