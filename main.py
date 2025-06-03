from fastapi import FastAPI, HTTPException, Depends, status, Request, WebSocket, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, Dict, List, Any
import os
from datetime import datetime, timedelta
import uuid
import logging
import time
import json
import asyncio
from fastapi.staticfiles import StaticFiles
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import LinearSVC
from sentence_transformers import SentenceTransformer
import traceback
import base64
import pickle
import numpy as np
import cv2
import face_recognition
from fastapi.templating import Jinja2Templates
from starlette.routing import WebSocketRoute

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models and database functions
from models import UserSignup, UserLogin, UserResponse, Token, QuestionRequest
from database import (
    add_user, 
    find_user_by_username, 
    authenticate_user, 
    create_access_token, 
    user_helper,
    init_db,
    add_review,
    get_reviews,
    get_user_reviews,
    get_user_review,
    update_review,
    add_face_encoding,
    get_all_face_encodings
)

# Import answer generator components
from answer_generator import generate_answer, predict_intent, clean_answer
from text_to_speech import text_to_speech
from model_loader import get_translation_components, load_models
from translation import greedy_decode

# Preload model components
# print("Preloading ML components...")
# # Load tokenizers and model
# load_tokenizers()
# load_model()

# print("ML components preloaded successfully!")

# Create app
app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates for serving HTML
templates = Jinja2Templates(directory="templates")

# Add CORS middleware - specifically allow requests from React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Global variables for models and data
model = None
vectorizer = None
label_encoder = None
classifier = None
translate_model = None
word2idx_en = None
word2idx_te = None
idx2word_te = None

# --- Face Recognition Setup ---

@app.on_event("startup")
async def startup_event():
    """Load all models and data during startup"""
    global model, vectorizer, label_encoder, classifier, translate_model, word2idx_en, word2idx_te, idx2word_te
    
    try:
        # Load all models and get the answer generation model
        model = load_models()  # This will load all models and return the answer generation model
        
        # Load translation components
        translate_model, word2idx_en, word2idx_te, idx2word_te = get_translation_components()
        
        # Verify model is loaded
        if model is None:
            raise ValueError("Answer generation model failed to load")
            
        logger.info("All models and data loaded successfully during startup")
    except Exception as e:
        logger.error(f"Error loading models during startup: {str(e)}")
        logger.error(traceback.format_exc())  # Add traceback for better error logging
        raise

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

async def stream_answer(answer: str, translated_answer: str, background_task):
    """Stream English answer word by word, then Telugu translation, and handle audio"""
    try:
        logger.info("Starting to stream English answer...")
        # Stream English answer word by word
        english_words = answer.split()
        current_english = ""
        for word in english_words:
            current_english += word + " "
            message = f"data: {json.dumps({'type': 'english', 'text': current_english})}\n\n"
            logger.debug(f"Sending English chunk: {message}")
            yield message
            await asyncio.sleep(0.1)  # Adjust delay as needed
        
        logger.info("English answer streaming complete, starting Telugu...")
        # Add a small pause between languages
        await asyncio.sleep(0.5)
        
        # Stream Telugu translation word by word
        telugu_words = translated_answer.split()
        current_telugu = ""
        for word in telugu_words:
            current_telugu += word + " "
            message = f"data: {json.dumps({'type': 'telugu', 'text': current_telugu})}\n\n"
            logger.debug(f"Sending Telugu chunk: {message}")
            yield message
            await asyncio.sleep(0.1)  # Adjust delay as needed
        
        logger.info("Telugu translation streaming complete, waiting for audio...")
        # Wait for audio processing to complete
        audio_result = await background_task
        if audio_result:
            message = f"data: {json.dumps(audio_result)}\n\n"
            logger.debug(f"Sending audio result: {message}")
            yield message
    except Exception as e:
        error_msg = f"Error in stream_answer: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"

async def process_audio(translated_answer: str):
    """Process audio generation and return the result"""
    try:
        # Convert answer to speech
        audio_start = time.time()
        audio_path = text_to_speech(translated_answer)
        audio_end = time.time()
        
        # Audio file is already in static directory
        if os.path.exists(audio_path):
            # Calculate total time
            total_time = round(audio_end - audio_start, 2)
            return {
                'type': 'complete',
                'audio_path': f'/static/{os.path.basename(audio_path)}',
            }
        else:
            total_time = round(time.time() - audio_start, 2)
            return {
                'type': 'complete',
                'audio_path': None,
            }
    except Exception as e:
        logger.error(f"Background processing error: {str(e)}")
        return {
            'type': 'error',
            'error': str(e)
        }

@app.post("/ask")
async def ask_question(request: QuestionRequest):
    """Handle question requests"""
    async def generate():
        try:
            start_time = time.time()
            
            # Generate answer and predict intent
            intent_start = time.time()
            intent = predict_intent(request.question)
            answer = generate_answer(model, request.question, intent)
            answer = clean_answer(answer)
            intent_end = time.time()
            
            # Start translation
            translation_start = time.time()
            translation_task = asyncio.create_task(
                asyncio.to_thread(
                    greedy_decode,
                    translate_model,
                    answer,
                    word2idx_en,
                    word2idx_te,
                    idx2word_te
                )
            )
            
            # Stream English answer while translation is happening
            english_words = answer.split()
            current_english = ""
            for word in english_words:
                current_english += word + " "
                yield f"data: {json.dumps({'type': 'english', 'text': current_english})}\n\n"
                await asyncio.sleep(0.1)  # Small delay between words
            
            # Wait for translation to complete
            translated_answer = await translation_task
            translation_end = time.time()
            logger.info(f"Translated answer in {round(translation_end - translation_start, 2)} seconds: {translated_answer}")
            
            # Start audio generation immediately after getting translation
            audio_task = asyncio.create_task(process_audio(translated_answer))
            
            # Stream Telugu translation while audio is being generated
            telugu_words = translated_answer.split()
            current_telugu = ""
            for word in telugu_words:
                current_telugu += word + " "
                yield f"data: {json.dumps({'type': 'telugu', 'text': current_telugu})}\n\n"
                await asyncio.sleep(0.1)  # Small delay between words
            
            # Wait for audio to be ready
            audio_result = await audio_task
            if audio_result:
                yield f"data: {json.dumps(audio_result)}\n\n"
                
        except Exception as e:
            error_msg = f"Error in ask_question: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# Health check endpoint
@app.get("/test")
async def test_endpoint():
    try:
        # Check MongoDB connection
        if not await init_db():
            raise Exception("MongoDB connection failed")
        return {"status": "API is working correctly", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: {str(e)}"
        )

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

# Review endpoints
@app.post("/api/reviews")
async def create_review(review_data: dict, token: str = Depends(oauth2_scheme)):
    try:
        logger.info(f"Received review data: {review_data}")
        logger.info(f"Received token: {token[:10]}...")  # Log first 10 chars of token
        
        # Validate required fields
        required_fields = ['user_id', 'username', 'rating', 'message']
        missing_fields = [field for field in required_fields if field not in review_data]
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )

        # Check if user already has a review
        existing_review = await get_user_review(review_data['user_id'])
        if existing_review:
            logger.info(f"User {review_data['user_id']} already has a review. Updating instead.")
            updated_review = await update_review(existing_review['id'], review_data)
            return {
                "success": True,
                "message": "Review updated successfully",
                "review": updated_review,
                "is_update": True
            }

        # Add new review
        new_review = await add_review(review_data)
        logger.info(f"Successfully added review: {new_review}")
        
        return {
            "success": True,
            "message": "Review submitted successfully",
            "review": new_review,
            "is_update": False
        }
    except HTTPException as he:
        logger.error(f"HTTP error creating review: {str(he)}")
        raise
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": str(e)}
        )

@app.get("/api/reviews")
async def fetch_reviews(
    skip: int = 0,
    limit: int = 10,
    rating_filter: int = 0,
    sort_by: str = "newest"
):
    try:
        logger.info(f"Fetching reviews with params: skip={skip}, limit={limit}, rating_filter={rating_filter}, sort_by={sort_by}")
        
        # Validate sort_by parameter
        valid_sort_options = ["newest", "oldest", "highest_rating", "lowest_rating"]
        if sort_by not in valid_sort_options:
            logger.warning(f"Invalid sort_by parameter: {sort_by}. Using default: newest")
            sort_by = "newest"
        
        # Get reviews from database
        reviews = await get_reviews(skip, limit, rating_filter, sort_by)
        logger.info(f"Found {len(reviews)} reviews")
        
        # Log the first review for debugging
        if reviews:
            logger.info(f"First review sample: {reviews[0]}")
        
        return {
            "success": True,
            "reviews": reviews,
            "total": len(reviews)
        }
    except Exception as e:
        logger.error(f"Error fetching reviews: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": str(e)}
        )

@app.get("/api/reviews/user/{user_id}")
async def get_user_review_endpoint(user_id: str):
    try:
        review = await get_user_review(user_id)
        return {
            "success": True,
            "reviews": [review] if review else []
        }
    except Exception as e:
        print(f"Error getting user review: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Failed to get user review"}
        )

# Serve the main page
@app.get("/", response_class=HTMLResponse)
async def get_home():
    with open("index.html", "r") as f:
        return f.read()

# Serve the chat page
@app.get("/chat", response_class=HTMLResponse)
async def get_chat():
    with open("chat.html", "r") as f:
        return f.read()

# --- Face Recognition Endpoints (Populating existing routes) ---

@app.post('/api/register-face')
async def register_face_fastapi(name: str = Form(...), face_image: UploadFile = File(...)):
    logger.info(f"Received face registration request for user: {name}")
    try:
        # Read the image file
        image_data = await face_image.read()
        
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        logger.info(f"Image decoded. Shape: {img.shape if img is not None else 'None'}")

        if img is None:
            logger.error("Failed to decode image.")
            raise HTTPException(status_code=400, detail="Could not decode image.")

        # Find face locations and encodings
        face_locations = face_recognition.face_locations(img)
        logger.info(f"Found {len(face_locations)} face locations.")

        if not face_locations:
            logger.warning("No face found in the image for registration.")
            raise HTTPException(status_code=400, detail="No face found in the image. Please ensure your face is clearly visible.")

        face_encodings_list = face_recognition.face_encodings(img, face_locations)
        logger.info(f"Found {len(face_encodings_list)} face encodings.")

        if not face_encodings_list:
             logger.warning("Could not generate face encoding for registration.")
             raise HTTPException(status_code=400, detail="Could not process face. Please try again.")

        # Use the first detected face encoding (convert numpy array to list for MongoDB)
        face_encoding = face_encodings_list[0].tolist()

        # Add or update the face encoding in MongoDB
        await add_face_encoding(name, face_encoding)
        
        logger.info(f"Face registered successfully in MongoDB for user: {name}")
        return {"success": True, "message": "Face registered successfully", "user": {"name": name}}
        
    except Exception as e:
        logger.error(f"Error during face registration: {str(e)}")
        logger.error(traceback.format_exc()) # Log traceback for detailed error
        raise HTTPException(status_code=500, detail=f"Internal server error during face registration: {str(e)}")

@app.post('/api/verify-face')
async def verify_face_fastapi(face_image: UploadFile = File(...)):
    logger.info("Received face verification request")
    try:
        # Read the image file
        image_data = await face_image.read()
        
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.error("Failed to decode image.")
            raise HTTPException(status_code=400, detail="Could not decode image.")

        # Find face locations and encodings in the unknown image
        unknown_face_locations = face_recognition.face_locations(img)

        if not unknown_face_locations:
            logger.warning("No face found in the image for verification.")
            raise HTTPException(status_code=400, detail="No face found in the image. Please ensure your face is clearly visible.")

        unknown_face_encodings = face_recognition.face_encodings(img, unknown_face_locations)

        if not unknown_face_encodings:
            logger.warning("Could not generate face encoding for verification.")
            raise HTTPException(status_code=400, detail="Could not process face. Please try again.")

        # Assume only one face in the unknown image for simplicity
        unknown_face_encoding = unknown_face_encodings[0]

        # Retrieve all known face encodings from MongoDB
        all_face_docs = await get_all_face_encodings()
        
        if not all_face_docs:
            logger.warning("No registered faces found in database for verification.")
            raise HTTPException(status_code=404, detail="No registered faces found.")

        # Extract encodings and names from the database documents
        known_face_encodings_db = [doc['encoding'] for doc in all_face_docs]
        known_face_names_db = [doc['username'] for doc in all_face_docs]

        # Convert database encodings (list) back to numpy array for face_recognition library
        known_face_encodings_np = np.array(known_face_encodings_db)

        # Compare unknown face with known faces from the database
        # tolerance: lower is stricter. 0.6 is a common value
        matches = face_recognition.compare_faces(known_face_encodings_np, unknown_face_encoding, tolerance=0.6)
        name = "Unknown"
        
        # Use the known face with the smallest distance to the unknown face
        face_distances = face_recognition.face_distance(known_face_encodings_np, unknown_face_encoding)
        best_match_index = np.argmin(face_distances)
        
        if matches[best_match_index]:
            name = known_face_names_db[best_match_index]
            logger.info(f"Face verified as {name}.")
            # In a real app, you'd fetch more user details here from your main user database
            # For now, we return a simplified user object
            user_details = {"name": name} # Simplified user object
            return {"success": True, "message": "Face verified successfully", "user": user_details}
        else:
            logger.warning("Face not recognized.")
            raise HTTPException(status_code=401, detail="Face not recognized.")
            
    except Exception as e:
        logger.error(f"Error during face verification: {str(e)}")
        logger.error(traceback.format_exc()) # Log traceback for detailed error
        raise HTTPException(status_code=500, detail=f"Internal server error during face verification: {str(e)}")

# --- End Face Recognition Endpoints ---

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=5000) 