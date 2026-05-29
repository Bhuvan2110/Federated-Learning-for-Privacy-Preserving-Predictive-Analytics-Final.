from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
import jwt
from typing import Any
from app.db.session import get_db
from app.db.models import User
from app.core.security import public_pem, ALGORITHM

def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, public_pem, algorithms=[ALGORITHM])
        _sub = payload.get("sub")
        if _sub is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user_id: str = str(_sub)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def require_role(roles: list):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Not enough privileges")
        return current_user
    return role_checker
