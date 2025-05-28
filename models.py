from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserSignup(BaseModel):
    first_name: str
    last_name: str
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenData(BaseModel):
    username: Optional[str] = None
    exp: Optional[datetime] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: str
    last_name: str

class Token(BaseModel):
    access_token: str
    token_type: str
    
class QuestionRequest(BaseModel):
    question: str
    language: Optional[str] = "en" 