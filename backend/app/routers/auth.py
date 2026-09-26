"""
Authentication and User Management Router for VayuBudhi.

Industry pattern:
- Public self-registration always creates public_viewer (no role selection).
- Admin / officer / inspector accounts are provisioned in DB (seed or admin create).
- Login returns JWT; passwords stored only as bcrypt hashes.
"""
import re
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import User
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_roles,
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

VALID_ROLES = ["super_admin", "city_officer", "field_inspector", "public_viewer"]
EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
MIN_PASSWORD_LEN = 8


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class UserRegisterRequest(BaseModel):
    """Public self-registration. Role is NEVER accepted from the client."""
    email: str
    password: str = Field(min_length=MIN_PASSWORD_LEN)
    full_name: str = Field(min_length=2, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=20)


class UserLoginRequest(BaseModel):
    email: str
    password: str


class AdminCreateUserRequest(BaseModel):
    """Privileged user provisioning — only super_admin may call this."""
    email: str
    password: str = Field(min_length=MIN_PASSWORD_LEN)
    full_name: str = Field(min_length=2, max_length=255)
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    assigned_city: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    assigned_city: Optional[str] = None
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserResponse


def _normalize_email(email: str) -> str:
    return email.lower().strip()


def _validate_email(email: str) -> None:
    if not EMAIL_RE.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format.",
        )


def _validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {MIN_PASSWORD_LEN} characters.",
        )


def seed_default_users():
    """
    Provision staff accounts that exist before anyone opens the app.
    Public demo account is also seeded for docs/tests; citizens normally self-register.
    """
    db = SessionLocal()
    try:
        default_accounts = [
            (
                "admin@vayubudhi.gov.in",
                "Admin123!",
                "Super Administrator",
                "super_admin",
                "Central Technical Ops",
                None,
                None,
            ),
            (
                "officer@ghmc.gov.in",
                "Officer123!",
                "GHMC City Officer",
                "city_officer",
                "GHMC Environmental Wing",
                None,
                "Hyderabad",
            ),
            (
                "inspector@ghmc.gov.in",
                "Inspector123!",
                "Ward Field Inspector",
                "field_inspector",
                "Air Enforcement Squad",
                None,
                "Hyderabad",
            ),
            (
                "public@vayubudhi.in",
                "Public123!",
                "Public Citizen",
                "public_viewer",
                "Public",
                None,
                None,
            ),
        ]
        for email, password, full_name, role, dept, phone, city in default_accounts:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                db.add(
                    User(
                        email=email,
                        hashed_password=hash_password(password),
                        full_name=full_name,
                        role=role,
                        department=dept,
                        phone=phone,
                        assigned_city=city,
                        is_active=True,
                    )
                )
            else:
                # Backfill city / audit fields on existing seed rows without resetting passwords
                if city and not existing.assigned_city:
                    existing.assigned_city = city
                    existing.updated_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        print(f"Error seeding default users: {e}")
        db.rollback()
    finally:
        db.close()


def _issue_token_response(user: User) -> TokenResponse:
    token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.full_name,
        }
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Public citizen self-registration.
    Always stores role=public_viewer. Role cannot be chosen by the client.
    Returns JWT so the user is signed in immediately after signup.
    """
    email = _normalize_email(req.email)
    _validate_email(email)
    _validate_password(req.password)

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    now = datetime.now(timezone.utc)
    user = User(
        email=email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        role="public_viewer",
        department="Public",
        phone=(req.phone.strip() if req.phone else None),
        assigned_city=None,
        is_active=True,
        last_login_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Login with email and password. Staff and public users use the same endpoint."""
    email = _normalize_email(req.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    user.last_login_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return _issue_token_response(user)


@router.post("/token", response_model=TokenResponse)
def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password flow compatible token endpoint for Swagger UI."""
    return login(UserLoginRequest(email=form_data.username, password=form_data.password), db)


@router.post(
    "/admin/create-user",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_user(
    req: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(["super_admin"])),
):
    """
    Provision a staff or citizen account. Only super_admin may set privileged roles.
    This is how officers/admins are added in production — never via public register.
    """
    if req.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{req.role}'. Must be one of: {VALID_ROLES}",
        )

    email = _normalize_email(req.email)
    _validate_email(email)
    _validate_password(req.password)

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    now = datetime.now(timezone.utc)
    user = User(
        email=email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        role=req.role,
        department=req.department,
        phone=(req.phone.strip() if req.phone else None),
        assigned_city=req.assigned_city,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Inspect currently authenticated user identity and role."""
    return current_user


@router.get("/verify-role/{role}")
def verify_role_access(role: str, current_user: User = Depends(get_current_user)):
    """Test if current user has permissions for a specific role."""
    has_permission = (current_user.role == role) or (current_user.role == "super_admin")
    return {
        "user_email": current_user.email,
        "assigned_role": current_user.role,
        "tested_role": role,
        "access_granted": has_permission,
    }
