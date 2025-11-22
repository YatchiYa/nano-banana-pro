import os
import base64
import io
import uuid
import time
from typing import List, Optional, Dict
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

MODELE_NANO_BANANA = "gemini-3-pro-image-preview"
app = FastAPI()

# Directories
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files to serve images if needed (optional, but good for persistence)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

# Initialize Gemini Client
try:
    client = genai.Client()
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

# Session Registry - In-memory storage for active chat sessions
# For production, replace with Redis or database
sessions: Dict[str, any] = {}

# Session cleanup configuration
SESSION_TIMEOUT = 3600  # 1 hour in seconds
last_cleanup = time.time()

def cleanup_old_sessions():
    """Remove sessions older than SESSION_TIMEOUT"""
    global last_cleanup
    current_time = time.time()
    
    # Only run cleanup every 5 minutes
    if current_time - last_cleanup < 300:
        return
    
    last_cleanup = current_time
    expired_sessions = [
        sid for sid, data in sessions.items()
        if current_time - data.get('created_at', 0) > SESSION_TIMEOUT
    ]
    
    for sid in expired_sessions:
        del sessions[sid]
        print(f"Cleaned up expired session: {sid}")

@app.get("/")
async def root():
    return {"message": "Gemini Nano Banana Pro API is running"}

@app.post("/api/chat/create")
async def create_chat_session():
    """Create a new chat session for multi-turn conversations"""
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check GOOGLE_API_KEY.")
    
    try:
        # Create new chat session
        chat = client.chats.create(
            model=MODELE_NANO_BANANA,
            config=types.GenerateContentConfig(
                response_modalities=['TEXT', 'IMAGE'],
                tools=[{"google_search": {}}]  # Enable Google Search grounding
            )
        )
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Store in registry
        sessions[session_id] = {
            'chat': chat,
            'created_at': time.time(),
            'last_used': time.time()
        }
        
        print(f"Created new session: {session_id}")
        
        # Cleanup old sessions
        cleanup_old_sessions()
        
        return {
            "session_id": session_id,
            "message": "Chat session created successfully"
        }
        
    except Exception as e:
        print(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@app.post("/api/chat")
async def chat_endpoint(
    message: str = Form(...),
    files: List[UploadFile] = File(None),
    session_id: Optional[str] = Form(None),
):
    """
    Send a message in a chat session.
    If session_id is provided, continues existing conversation.
    If not, creates a new session automatically.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check GOOGLE_API_KEY.")

    try:
        # Get or create chat session
        chat = None
        current_session_id = session_id
        
        if session_id and session_id in sessions:
            # Use existing session
            chat = sessions[session_id]['chat']
            sessions[session_id]['last_used'] = time.time()
            print(f"Using existing session: {session_id}")
        else:
            # Create new session
            chat = client.chats.create(
                model=MODELE_NANO_BANANA,
                config=types.GenerateContentConfig(
                    response_modalities=['TEXT', 'IMAGE'],
                    tools=[{"google_search": {}}]
                )
            )
            current_session_id = str(uuid.uuid4())
            sessions[current_session_id] = {
                'chat': chat,
                'created_at': time.time(),
                'last_used': time.time()
            }
            print(f"Created new session: {current_session_id}")
        
        # 1. Prepare Content
        contents = [message]
        saved_file_paths = []

        if files:
            for file in files:
                # Read file
                file_content = await file.read()
                
                # Save to disk (Persistence)
                file_ext = file.filename.split('.')[-1] if '.' in file.filename else "png"
                filename = f"{uuid.uuid4()}.{file_ext}"
                filepath = os.path.join(UPLOAD_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(file_content)
                saved_file_paths.append(filepath)

                # Load for Gemini
                image = Image.open(io.BytesIO(file_content))
                contents.append(image)

        # 2. Send message to chat
        print(f"Sending message to session {current_session_id}...")
        response = chat.send_message(contents)
        
        # 3. Process Response
        response_data = []
        if response.parts:
            for part in response.parts:
                # Skip thought parts (internal reasoning, not for display)
                if hasattr(part, 'thought') and part.thought:
                    continue
                
                if part.text:
                    response_data.append({"type": "text", "content": part.text})
                elif part.inline_data:
                    # Convert to image
                    img = Image.open(io.BytesIO(part.inline_data.data))
                    
                    # Save generated image
                    output_filename = f"gen_{uuid.uuid4()}.png"
                    output_path = os.path.join(OUTPUT_DIR, output_filename)
                    img.save(output_path)
                    
                    # Convert to base64 for immediate frontend display
                    buffered = io.BytesIO()
                    img.save(buffered, format="PNG")
                    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                    
                    response_data.append({
                        "type": "image", 
                        "content": f"data:image/png;base64,{img_str}",
                        "path": output_path
                    })
        
        # Cleanup old sessions
        cleanup_old_sessions()
        
        return {
            "parts": response_data,
            "session_id": current_session_id
        }

    except Exception as e:
        print(f"Error in chat: {e}")
        import traceback
        traceback.print_exc()
        # Return a text error to the chat
        return {"parts": [{"type": "text", "content": f"Error: {str(e)}"}]}

@app.get("/api/sessions")
async def list_sessions():
    """List active sessions (for debugging)"""
    return {
        "active_sessions": len(sessions),
        "sessions": [
            {
                "session_id": sid,
                "created_at": data['created_at'],
                "last_used": data['last_used'],
                "age_seconds": time.time() - data['created_at']
            }
            for sid, data in sessions.items()
        ]
    }


