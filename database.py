from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, status
import asyncio
import secrets

# MongoDB connection settings
MONGO_URL = "mongodb://localhost:27017"
DATABASE_NAME = "banking_assistant"

# JWT settings
SECRET_KEY = secrets.token_hex(32)  # Generate a secure random key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# MongoDB client
client = None
db = None

# Initialize database
async def init_db():
    global client, db
    try:
        # Create MongoDB connection
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DATABASE_NAME]
        
        # Create indexes
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        
        print("Successfully connected to MongoDB.")
        return True
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return False

# Get database
def get_db():
    return db

# Get users collection
def get_users_collection():
    return db.users if db else None

# User model helpers
def user_helper(user) -> dict:
    """Convert MongoDB user to dict format"""
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "created_at": user["created_at"],
    }

# Authentication helpers
def hash_password(password: str) -> str:
    """Hash a password for storing"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT token for authentication"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# User database operations
async def add_user(user_data: dict) -> dict:
    """Add a new user to the database"""
    if db is None:
        await init_db()
        
    # Hash the password
    user_data["password"] = hash_password(user_data["password"])
    user_data["created_at"] = datetime.utcnow()
    
    # Insert the user
    try:
        user = await db.users.insert_one(user_data)
        
        # Retrieve and return the new user
        new_user = await db.users.find_one({"_id": user.inserted_id})
        return user_helper(new_user)
    except Exception as e:
        print(f"Error adding user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

async def find_user_by_username(username: str) -> dict:
    """Find a user by username"""
    if db is None:
        await init_db()
        
    user = await db.users.find_one({"username": username})
    if user:
        return user
    return None

async def authenticate_user(username: str, password: str):
    """Authenticate a user by username and password"""
    user = await find_user_by_username(username)
    
    if not user:
        return False
    
    # Check if password field exists
    if "password" not in user:
        print(f"User {username} exists but has no password field. User data: {user}")
        return False
    
    if not verify_password(password, user["password"]):
        return False
    
    return user_helper(user) 