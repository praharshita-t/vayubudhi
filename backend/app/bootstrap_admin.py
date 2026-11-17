"""Explicit first-admin provisioning: docker compose run --rm backend python -m app.bootstrap_admin."""
from getpass import getpass
from app.database import SessionLocal
from app.models import User
from app.auth import hash_password
from app.routers.auth import UserRegisterRequest

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Provision a staff account on the host")
    parser.add_argument("--role", choices=["super_admin", "city_officer", "field_inspector"], default="super_admin")
    role = parser.parse_args().role
    email = input("Admin email: ").strip().lower()
    name = input("Full name: ").strip()
    password = getpass("Password (12+ characters): ")
    if password != getpass("Confirm password: "):
        raise SystemExit("Passwords do not match")
    request = UserRegisterRequest(email=email, full_name=name, password=password)
    with SessionLocal() as db:
        if db.query(User).filter(User.email == request.email).first():
            raise SystemExit("Account already exists; no changes made")
        db.add(User(email=request.email, full_name=request.full_name,
                    hashed_password=hash_password(request.password), role=role, is_active=True))
        db.commit()
    print("Staff account created")

if __name__ == "__main__":
    main()
