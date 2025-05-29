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
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    try:
        global client, db
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DATABASE_NAME]
        
        # Create indexes
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        await db.reviews.create_index("user_id")  # Add index for user_id
        await db.reviews.create_index("created_at")  # Add index for sorting
        
        # Test the connection
        await db.command('ping')
        logger.info("Successfully connected to MongoDB")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        return False

# Get database
def get_db():
    return db

# Get users collection
def get_users_collection():
    return db.users if db else None

# Get reviews collection
def get_reviews_collection():
    return db.reviews if db else None

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

# Review model helpers
def review_helper(review) -> dict:
    """Convert MongoDB review to dict format"""
    return {
        "id": str(review["_id"]),
        "user_id": str(review["user_id"]),
        "username": review["username"],
        "rating": review["rating"],
        "message": review["message"],
        "created_at": review["created_at"]
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
        logger.error(f"Error adding user: {str(e)}")
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
        logger.warning(f"User {username} exists but has no password field. User data: {user}")
        return False
    
    if not verify_password(password, user["password"]):
        return False
    
    return user_helper(user)

# Review database operations
async def get_user_review(user_id: str):
    """Get a user's review if it exists."""
    try:
        print(f"Getting review for user: {user_id}")
        review = await db.reviews.find_one({"user_id": user_id})
        print(f"Found review: {review}")
        return review
    except Exception as e:
        print(f"Error getting user review: {str(e)}")
        raise e

async def update_review(review_id: str, review_data: dict) -> dict:
    """Update an existing review"""
    if db is None:
        await init_db()
    
    try:
        logger.info(f"Updating review {review_id} with data: {review_data}")
        
        # Add timestamp
        review_data['updated_at'] = datetime.utcnow()
        
        # Update the review
        result = await db.reviews.update_one(
            {'_id': ObjectId(review_id)},
            {'$set': review_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        # Get the updated review
        updated_review = await db.reviews.find_one({'_id': ObjectId(review_id)})
        logger.info(f"Successfully updated review: {updated_review}")
        
        return review_helper(updated_review)
    except Exception as e:
        logger.error(f"Error updating review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update review: {str(e)}"
        )

async def add_review(review_data: dict) -> dict:
    """Add a new review to the database"""
    if db is None:
        await init_db()
    
    try:
        logger.info(f"Adding review to database: {review_data}")
        
        # Check if user already has a review
        existing_review = await get_user_review(review_data['user_id'])
        if existing_review:
            logger.info(f"User {review_data['user_id']} already has a review. Updating instead.")
            return await update_review(existing_review['id'], review_data)
        
        # Add timestamp
        review_data['created_at'] = datetime.utcnow()
        
        # Insert the review
        result = await db.reviews.insert_one(review_data)
        
        # Get the inserted review
        new_review = await db.reviews.find_one({'_id': result.inserted_id})
        logger.info(f"Successfully added review with ID: {result.inserted_id}")
        
        return review_helper(new_review)
    except Exception as e:
        logger.error(f"Error adding review to database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create review: {str(e)}"
        )

async def get_reviews(skip: int = 0, limit: int = 10, rating_filter: int = 0, sort_by: str = "newest") -> list:
    """Get reviews with optional filtering and sorting"""
    if db is None:
        logger.info("Database not initialized. Initializing now...")
        await init_db()
    
    try:
        logger.info(f"Getting reviews from database with params: skip={skip}, limit={limit}, rating_filter={rating_filter}, sort_by={sort_by}")
        
        # Build query
        query = {}
        if rating_filter > 0:
            query['rating'] = rating_filter
            logger.info(f"Filtering by rating: {rating_filter}")
            
        # Build sort
        sort = {}
        if sort_by == "newest":
            sort['created_at'] = -1
        elif sort_by == "oldest":
            sort['created_at'] = 1
        elif sort_by == "highest_rating":
            sort['rating'] = -1
        elif sort_by == "lowest_rating":
            sort['rating'] = 1
        logger.info(f"Sorting by: {sort}")
            
        # Get total count
        total = await db.reviews.count_documents(query)
        logger.info(f"Total reviews found: {total}")
        
        if total == 0:
            logger.info("No reviews found in database")
            return []
        
        # Get reviews
        cursor = db.reviews.find(query).sort(sort).skip(skip).limit(limit)
        reviews = await cursor.to_list(length=limit)
        logger.info(f"Retrieved {len(reviews)} reviews")
        
        # Convert reviews to proper format
        formatted_reviews = [review_helper(review) for review in reviews]
        logger.info(f"First review sample: {formatted_reviews[0] if formatted_reviews else 'No reviews'}")
        
        return formatted_reviews
    except Exception as e:
        logger.error(f"Error getting reviews from database: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get reviews: {str(e)}"
        )

async def get_user_reviews(user_id: str) -> list:
    """Get all reviews by a specific user"""
    if db is None:
        await init_db()
        
    try:
        logger.info(f"Getting reviews for user: {user_id}")
        
        # Get user's reviews
        cursor = db.reviews.find({'user_id': user_id}).sort('created_at', -1)
        reviews = await cursor.to_list(length=None)
        logger.info(f"Found {len(reviews)} reviews for user {user_id}")
        
        return [review_helper(review) for review in reviews]
    except Exception as e:
        logger.error(f"Error getting user reviews from database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user reviews: {str(e)}"
        ) 