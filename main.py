from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, Dict, List, Any
import os
from datetime import datetime, timedelta
import uuid

# Import models and database functions
from models import UserSignup, UserLogin, UserResponse, Token, QuestionRequest
from database import (
    add_user, 
    find_user_by_username, 
    authenticate_user, 
    create_access_token, 
    user_helper,
    init_db
)

# Import answer generator components - adjust this to match your current setup
from answer_generator import generate_answer, predict_intent, model,clean_answer
from text_to_speech import text_to_speech
from translation import translate_model,greedy_decode,word2idx_en,word2idx_te,idx2word_te

# Preload model components
# print("Preloading ML components...")
# # Load tokenizers and model
# load_tokenizers()
# load_model()
# print("ML components preloaded successfully!")

# Create app
app = FastAPI()

# Add CORS middleware - specifically allow requests from React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to initialize database
@app.on_event("startup")
async def startup_db_client():
    await init_db()

# Create static directory if it doesn't exist
os.makedirs("static", exist_ok=True)

# OAuth2 password bearer scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Authentication endpoints
@app.post("/api/signup", response_model=dict)
async def signup(user_data: UserSignup):
    # Check if username already exists
    existing_user = await find_user_by_username(user_data.username)
    if existing_user:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "Username already exists"}
        )
    
    # Create user document for MongoDB
    user_dict = {
        "username": user_data.username,
        "password": user_data.password,  # Will be hashed in add_user function
        "email": user_data.email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name
    }
    
    # Add user to database
    new_user = await add_user(user_dict)
    
    # Return success response
    return {
        "success": True,
        "message": "Account created successfully",
        "user": new_user
    }

@app.post("/api/login", response_model=dict)
async def login(credentials: UserLogin):
    # Check if user exists
    user_exists = await find_user_by_username(credentials.username)
    if not user_exists:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Username not found. Please check your username or register."}
        )
    
    # Authenticate user (check password)
    user = await authenticate_user(credentials.username, credentials.password)
    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"success": False, "message": "Incorrect password. Please try again."}
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=60 * 24)  # 1 day
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires
    )
    
    # Return success response
    return {
        "success": True,
        "message": "Login successful",
        "user": user,
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/ask")
async def ask_question(request: QuestionRequest):
    try:
        # Simply use the generate_answer function from answer_generator
        intent = predict_intent(request.question)
        answer = generate_answer(model,request.question,intent)
        answer = clean_answer(answer)
        print(f"Generated answer: {answer}")
        translated_answer = greedy_decode(translate_model,answer,word2idx_en,word2idx_te,idx2word_te)
        # Convert answer to speech using original text_to_speech
        audio_path = text_to_speech(translated_answer)
        
        # Move output.mp3 to static directory for serving
        if os.path.exists(audio_path):
            static_file_path = os.path.join("static", os.path.basename(audio_path))
            with open(audio_path, "rb") as src_file:
                with open(static_file_path, "wb") as dst_file:
                    dst_file.write(src_file.read())
            
            # Return response with static path
            return {
                "success": True,
                "answer": answer,
                "audio_path": f"/static/{os.path.basename(audio_path)}"
            }
        else:
            return {
                "success": True,
                "answer": answer,
                "audio_path": None
            }
    except Exception as e:
        print(f"Error in ask_question: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": str(e)}
        )

# Simple test endpoint
@app.get("/test")
async def test_endpoint():
    return {"status": "API is working correctly"}

# Serve static files (for audio playback)
@app.get("/static/{path:path}")
async def serve_static(path: str):
    file_path = os.path.join("static", path)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": "File not found"}
    ) 