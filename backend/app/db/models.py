from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, JSON, DateTime, LargeBinary, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for Google OAuth users
    google_id = Column(String, unique=True, nullable=True, index=True)
    role = Column(String, default="User")  # Super Admin, Admin, User
    is_active = Column(Boolean, default=True)

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, index=True)
    status = Column(String, default="offline")

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=True)   # kept for legacy rows; new uploads use csv_content
    csv_content = Column(Text, nullable=True)  # stores the raw CSV text in DB (survives redeploys)
    metadata_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Experiment(Base):
    __tablename__ = "experiments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, index=True)
    status = Column(String, default="pending")
    algorithm = Column(String)  # FedAvg, FedProx, etc.
    config_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class ModelWeight(Base):
    __tablename__ = "model_weights"
    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    round_number = Column(Integer)
    weights_json = Column(JSON, nullable=True) # Used if encryption is off
    encrypted_weights = Column(LargeBinary, nullable=True)
    encryption_iv = Column(LargeBinary, nullable=True)
    encryption_tag = Column(LargeBinary, nullable=True)
    metrics_json = Column(JSON)
    
class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("model_weights.id"))
    input_data = Column(JSON)
    output_result = Column(JSON)
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, index=True)
    details = Column(String)
    ip_address = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
