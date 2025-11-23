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

# ==================== VIDEO GENERATION ROUTES ====================

class VideoGenerationRequest(BaseModel):
    """Request model for video generation"""
    prompt: str
    aspect_ratio: str = "16:9"  # "16:9" or "9:16"
    resolution: str = "720p"     # "720p" or "1080p"
    duration: int = 8            # Duration in seconds (can be any value, will auto-extend)
    negative_prompt: Optional[str] = None
    session_id: Optional[str] = None

class LongVideoGenerationRequest(BaseModel):
    """Request model for long video generation with automatic extension"""
    prompt: str
    aspect_ratio: str = "16:9"
    resolution: str = "720p"
    duration: int = 8  # Total desired duration in seconds
    negative_prompt: Optional[str] = None
    session_id: Optional[str] = None
    extension_prompts: Optional[List[str]] = None  # Optional prompts for each extension

class VideoOperationRequest(BaseModel):
    """Request model to check video generation status"""
    operation_id: str

# Store video operations for polling
video_operations: Dict[str, any] = {}

# Helper functions for automatic video extension
def calculate_video_segments(total_duration: int) -> List[int]:
    """
    Calculate how to break down a long video into segments.
    First segment: 8 seconds, subsequent extensions: 7 seconds each
    """
    if total_duration <= 8:
        return [total_duration]
    
    segments = [8]  # First segment is always 8 seconds
    remaining = total_duration - 8
    
    while remaining > 0:
        segment_duration = min(7, remaining)  # Extensions are 7 seconds max
        segments.append(segment_duration)
        remaining -= segment_duration
    
    return segments

def generate_extension_prompts(base_prompt: str, segment_index: int, total_segments: int) -> str:
    """
    Generate continuation prompts for video extensions
    """
    if segment_index == 0:
        return base_prompt
    
    # Generate continuation prompts
    continuation_phrases = [
        "Continue the scene",
        "The action continues",
        "Following the previous scene",
        "Continuing from where we left off",
        "The story progresses"
    ]
    
    phrase = continuation_phrases[min(segment_index - 1, len(continuation_phrases) - 1)]
    return f"{phrase}. {base_prompt}"

async def extend_video_automatically(
    base_video_path: str,
    extension_prompt: str,
    aspect_ratio: str = "16:9",
    resolution: str = "720p",
    negative_prompt: Optional[str] = None
) -> str:
    """
    Extend a video using Veo 3.1 extension capability
    Returns the path to the extended video
    """
    if not client:
        raise Exception("Gemini client not initialized")
    
    # Load the base video file
    # For video extension, we need to pass the video file object from a previous generation
    # This is a simplified approach - in practice, the video should come from operation.response.generated_videos[0].video
    with open(base_video_path, 'rb') as f:
        video_data = f.read()
    
    # Create a temporary file object for the video
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
        temp_file.write(video_data)
        temp_file_path = temp_file.name
    
    # Use the file path for video extension (this may need adjustment based on actual API requirements)
    base_video = temp_file_path
    
    # Build config for extension
    config = types.GenerateVideosConfig(
        aspect_ratio=aspect_ratio,
        resolution=resolution,
        duration_seconds="7",  # Extensions are 7 seconds
        number_of_videos=1
    )
    
    if negative_prompt:
        config.negative_prompt = negative_prompt
    
    # Generate extension
    operation = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        video=base_video,
        prompt=extension_prompt,
        config=config,
    )
    
    # Poll until completion
    while not operation.done:
        time.sleep(10)
        operation = client.operations.get(operation)
    
    # Download the extended video
    generated_video = operation.response.generated_videos[0]
    video_file = client.files.download(file=generated_video.video)
    
    # Save extended video
    extended_filename = f"extended_{uuid.uuid4()}.mp4"
    extended_path = os.path.join(OUTPUT_DIR, extended_filename)
    
    with open(extended_path, 'wb') as f:
        f.write(video_file.read() if hasattr(video_file, 'read') else video_file)
    
    return extended_path

@app.post("/api/video_chat/generate_long")
async def generate_long_video(request: LongVideoGenerationRequest):
    """
    Generate a long video by automatically extending shorter segments.
    Handles any duration by breaking it into 8-second + 7-second extensions.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check GOOGLE_API_KEY.")
    
    try:
        # Calculate video segments
        segments = calculate_video_segments(request.duration)
        total_segments = len(segments)
        
        print(f"Generating {request.duration}s video in {total_segments} segments: {segments}")
        
        # Create operation tracking
        operation_id = str(uuid.uuid4())
        video_operations[operation_id] = {
            'type': 'long_video',
            'status': 'processing',
            'created_at': time.time(),
            'prompt': request.prompt,
            'total_duration': request.duration,
            'segments': segments,
            'current_segment': 0,
            'completed_segments': [],
            'current_video_path': None,
            'progress_percentage': 0
        }
        
        # Start background task for long video generation
        import asyncio
        asyncio.create_task(process_long_video_generation(
            operation_id, request, segments
        ))
        
        return {
            "operation_id": operation_id,
            "status": "processing",
            "message": f"Long video generation started. Will create {total_segments} segments totaling {request.duration} seconds.",
            "segments": segments,
            "estimated_time_minutes": total_segments * 2  # Rough estimate: 2 minutes per segment
        }
        
    except Exception as e:
        print(f"Error starting long video generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start long video generation: {str(e)}")

async def process_long_video_generation(
    operation_id: str,
    request: LongVideoGenerationRequest,
    segments: List[int]
):
    """
    Background task to process long video generation with automatic extensions
    """
    try:
        current_video_path = None
        
        for segment_index, segment_duration in enumerate(segments):
            print(f"Processing segment {segment_index + 1}/{len(segments)} ({segment_duration}s)")
            
            # Update progress
            video_operations[operation_id]['current_segment'] = segment_index
            video_operations[operation_id]['progress_percentage'] = int((segment_index / len(segments)) * 100)
            
            if segment_index == 0:
                # Generate initial video
                prompt = request.prompt
                
                # Build config for first segment
                config = types.GenerateVideosConfig(
                    aspect_ratio=request.aspect_ratio,
                    resolution=request.resolution,
                    duration_seconds=str(segment_duration),
                )
                
                if request.negative_prompt:
                    config.negative_prompt = request.negative_prompt
                
                # Generate first video
                operation = client.models.generate_videos(
                    model="veo-3.1-generate-preview",
                    prompt=prompt,
                    config=config,
                )
                
                # Poll until completion
                while not operation.done:
                    await asyncio.sleep(10)
                    operation = client.operations.get(operation)
                
                # Download first video
                generated_video = operation.response.generated_videos[0]
                video_file = client.files.download(file=generated_video.video)
                
                # Save first video
                video_filename = f"long_video_seg0_{uuid.uuid4()}.mp4"
                current_video_path = os.path.join(OUTPUT_DIR, video_filename)
                
                with open(current_video_path, 'wb') as f:
                    f.write(video_file.read() if hasattr(video_file, 'read') else video_file)
                
                print(f"First segment completed: {video_filename}")
                
            else:
                # Extend existing video
                extension_prompt = generate_extension_prompts(request.prompt, segment_index, len(segments))
                
                # Use custom extension prompt if provided
                if request.extension_prompts and segment_index - 1 < len(request.extension_prompts):
                    extension_prompt = request.extension_prompts[segment_index - 1]
                
                print(f"Extending with prompt: {extension_prompt}")
                
                # Extend the video
                current_video_path = await extend_video_automatically(
                    current_video_path,
                    extension_prompt,
                    request.aspect_ratio,
                    request.resolution,
                    request.negative_prompt
                )
                
                print(f"Extension {segment_index} completed")
            
            # Update completed segments
            video_operations[operation_id]['completed_segments'].append(segment_index)
            video_operations[operation_id]['current_video_path'] = current_video_path
        
        # Final completion
        video_operations[operation_id]['status'] = 'completed'
        video_operations[operation_id]['video_path'] = current_video_path
        video_operations[operation_id]['progress_percentage'] = 100
        video_operations[operation_id]['completed_at'] = time.time()
        
        print(f"Long video generation completed: {operation_id}")
        
    except Exception as e:
        print(f"Error in long video generation: {e}")
        import traceback
        traceback.print_exc()
        video_operations[operation_id]['status'] = 'error'
        video_operations[operation_id]['error'] = str(e)

@app.post("/api/video_chat/generate_unified")
async def generate_video_unified(
    prompt: str = Form(...),
    image_files: List[UploadFile] = File(None),
    aspect_ratio: str = Form("16:9"),
    resolution: str = Form("720p"),
    duration: int = Form(8),
    negative_prompt: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    generation_type: str = Form("reference"),  # "reference", "first_frame", "interpolation"
):
    """
    Unified video generation endpoint that handles both text-only and image+text generation.
    Automatically chooses the right method based on whether images are provided.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check GOOGLE_API_KEY.")
    
    try:
        has_images = image_files and len(image_files) > 0 and image_files[0].filename
        
        if has_images:
            # Process images and use image-based generation
            images = []
            input_paths = []
            
            for i, image_file in enumerate(image_files):
                file_content = await image_file.read()
                image = Image.open(io.BytesIO(file_content))
                images.append(image)
                
                # Save input image
                input_filename = f"input_{i}_{uuid.uuid4()}.png"
                input_path = os.path.join(UPLOAD_DIR, input_filename)
                image.save(input_path)
                input_paths.append(input_path)
            
            # Validate image count for generation type
            if generation_type == "reference" and len(images) > 3:
                raise ValueError("Maximum 3 images allowed for reference generation")
            elif generation_type == "first_frame" and len(images) != 1:
                raise ValueError("First frame requires exactly 1 image")
            elif generation_type == "interpolation" and len(images) != 2:
                raise ValueError("Interpolation requires exactly 2 images")
            
            print(f"Starting {generation_type} video generation with {len(images)} images...")
            
        else:
            # Text-only generation
            print(f"Starting text-to-video generation...")
        
        # Check if this requires long video generation (> 8 seconds)
        if duration > 8 and not has_images:
            # Redirect to long video generation for text-only requests > 8 seconds
            long_request = LongVideoGenerationRequest(
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                duration=duration,
                negative_prompt=negative_prompt,
                session_id=session_id
            )
            return await generate_long_video(long_request)
        
        # Validate parameters for standard generation
        valid_aspect_ratios = ["16:9", "9:16"]
        valid_resolutions = ["720p", "1080p"]
        
        if aspect_ratio not in valid_aspect_ratios:
            raise ValueError(f"Invalid aspect_ratio. Must be one of {valid_aspect_ratios}")
        if resolution not in valid_resolutions:
            raise ValueError(f"Invalid resolution. Must be one of {valid_resolutions}")
        if duration > 8:
            raise ValueError(f"Duration > 8 seconds not supported for image-based generation. Use text-only for long videos.")
        if duration < 1:
            raise ValueError(f"Duration must be at least 1 second")
        
        # Build config
        config = types.GenerateVideosConfig(
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            duration_seconds=str(duration),
        )
        
        if negative_prompt:
            config.negative_prompt = negative_prompt
        
        # Generate video based on whether images are provided
        if has_images:
            # Image-based generation
            if generation_type == "reference" and len(images) <= 3:
                # Reference images mode
                reference_images = []
                for image in images:
                    reference_images.append(types.VideoGenerationReferenceImage(
                        image=image,
                        reference_type="asset"
                    ))
                
                config.reference_images = reference_images
                
                operation = client.models.generate_videos(
                    model="veo-3.1-generate-preview",
                    prompt=prompt,
                    config=config,
                )
                
            elif generation_type == "first_frame" and len(images) == 1:
                # Single image as first frame
                operation = client.models.generate_videos(
                    model="veo-3.1-generate-preview",
                    prompt=prompt,
                    image=images[0],
                    config=config,
                )
                
            elif generation_type == "interpolation" and len(images) == 2:
                # First and last frame interpolation
                config.last_frame = images[1]
                
                operation = client.models.generate_videos(
                    model="veo-3.1-generate-preview",
                    prompt=prompt,
                    image=images[0],  # First frame
                    config=config,
                )
            else:
                raise ValueError(f"Invalid combination: {generation_type} with {len(images)} images")
        else:
            # Text-only generation
            operation = client.models.generate_videos(
                model="veo-3.1-generate-preview",
                prompt=prompt,
                config=config,
            )
        
        # Store operation for polling
        operation_id = str(uuid.uuid4())
        video_operations[operation_id] = {
            'operation': operation,
            'created_at': time.time(),
            'prompt': prompt,
            'status': 'pending'
        }
        
        if has_images:
            video_operations[operation_id]['input_images'] = input_paths
            video_operations[operation_id]['generation_type'] = generation_type
        
        if session_id and session_id in sessions:
            sessions[session_id]['last_used'] = time.time()
        
        generation_mode = f"{generation_type} with {len(images)} images" if has_images else "text-to-video"
        print(f"Video generation started with operation_id: {operation_id} ({generation_mode})")
        
        return {
            "operation_id": operation_id,
            "status": "pending",
            "message": f"Video generation started ({generation_mode}). Poll for status updates."
        }
    
    except Exception as e:
        print(f"Error starting video generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start video generation: {str(e)}")

@app.post("/api/video_chat/generate")
async def generate_video(request: VideoGenerationRequest):
    """
    Generate a video using Veo 3.1 model.
    Returns operation_id for polling status.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check GOOGLE_API_KEY.")
    
    try:
        # Validate parameters
        valid_aspect_ratios = ["16:9", "9:16"]
        valid_resolutions = ["720p", "1080p"]
        valid_durations = ["4", "6", "8"]
        
        if request.aspect_ratio not in valid_aspect_ratios:
            raise ValueError(f"Invalid aspect_ratio. Must be one of {valid_aspect_ratios}")
        if request.resolution not in valid_resolutions:
            raise ValueError(f"Invalid resolution. Must be one of {valid_resolutions}")
        if request.duration not in valid_durations:
            raise ValueError(f"Invalid duration. Must be one of {valid_durations}")
        
        # Build config
        config = types.GenerateVideosConfig(
            aspect_ratio=request.aspect_ratio,
            resolution=request.resolution,
            duration_seconds=request.duration,
        )
        
        if request.negative_prompt:
            config.negative_prompt = request.negative_prompt
        
        print(f"Starting video generation with prompt: {request.prompt[:100]}...")
        
        # Start video generation (async operation)
        operation = client.models.generate_videos(
            model="veo-3.1-generate-preview",
            prompt=request.prompt,
            config=config,
        )
        
        # Store operation for polling
        operation_id = str(uuid.uuid4())
        video_operations[operation_id] = {
            'operation': operation,
            'created_at': time.time(),
            'prompt': request.prompt,
            'status': 'pending'
        }
        
        # Update session if provided
        if request.session_id and request.session_id in sessions:
            sessions[request.session_id]['last_used'] = time.time()
        
        print(f"Video generation started with operation_id: {operation_id}")
        
        return {
            "operation_id": operation_id,
            "status": "pending",
            "message": "Video generation started. Poll for status updates."
        }
    
    except Exception as e:
        print(f"Error starting video generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start video generation: {str(e)}")

@app.post("/api/video_chat/status")
async def check_video_status(request: VideoOperationRequest):
    """
    Check the status of a video generation operation.
    Returns video URL when ready.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized.")
    
    try:
        operation_id = request.operation_id
        
        if operation_id not in video_operations:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        operation_data = video_operations[operation_id]
        
        # Handle long video operations differently
        if operation_data.get('type') == 'long_video':
            # Return progress for long video generation
            return {
                "status": operation_data['status'],
                "operation_id": operation_id,
                "message": f"Long video generation: segment {operation_data.get('current_segment', 0) + 1}/{len(operation_data.get('segments', []))}",
                "progress_percentage": operation_data.get('progress_percentage', 0),
                "segments": operation_data.get('segments', []),
                "completed_segments": operation_data.get('completed_segments', []),
                "elapsed_seconds": time.time() - operation_data['created_at'],
                "video_url": f"/outputs/{os.path.basename(operation_data['video_path'])}" if operation_data.get('video_path') else None,
                "video_path": operation_data.get('video_path'),
                "prompt": operation_data['prompt'],
                "total_duration": operation_data.get('total_duration', 0)
            }
        
        operation = operation_data['operation']
        
        # Refresh operation status
        operation = client.operations.get(operation)
        
        if operation.done:
            # Check if we already processed this video
            if video_operations[operation_id]['status'] == 'completed':
                # Already processed, return existing data
                return {
                    "status": "completed",
                    "operation_id": operation_id,
                    "video_url": f"/outputs/{os.path.basename(video_operations[operation_id]['video_path'])}",
                    "video_path": video_operations[operation_id]['video_path'],
                    "prompt": operation_data['prompt'],
                    "duration": video_operations[operation_id].get('completed_at', time.time()) - operation_data['created_at']
                }
            
            # Video is ready - download only once
            try:
                generated_video = operation.response.generated_videos[0]
                
                # Download video
                video_file = client.files.download(file=generated_video.video)
                
                # Save video to outputs directory
                video_filename = f"gen_video_{uuid.uuid4()}.mp4"
                video_path = os.path.join(OUTPUT_DIR, video_filename)
                
                # Write video file
                with open(video_path, 'wb') as f:
                    f.write(video_file.read() if hasattr(video_file, 'read') else video_file)
                
                # Update operation status
                video_operations[operation_id]['status'] = 'completed'
                video_operations[operation_id]['video_path'] = video_path
                video_operations[operation_id]['completed_at'] = time.time()
                
                print(f"Video generation completed: {video_filename}")
                
                return {
                    "status": "completed",
                    "operation_id": operation_id,
                    "video_url": f"/outputs/{video_filename}",
                    "video_path": video_path,
                    "prompt": operation_data['prompt'],
                    "duration": time.time() - operation_data['created_at']
                }
            
            except Exception as e:
                print(f"Error processing completed video: {e}")
                video_operations[operation_id]['status'] = 'error'
                video_operations[operation_id]['error'] = str(e)
                raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")
        
        else:
            # Still processing
            return {
                "status": "processing",
                "operation_id": operation_id,
                "message": "Video generation in progress...",
                "elapsed_seconds": time.time() - operation_data['created_at']
            }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking video status: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")

@app.post("/api/video_chat/generate_with_images")
async def generate_video_with_images(
    prompt: str = Form(...),
    image_files: List[UploadFile] = File(...),
    aspect_ratio: str = Form("16:9"),
    resolution: str = Form("720p"),
    duration: str = Form("8"),
    negative_prompt: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    generation_type: str = Form("reference"),  # "reference", "first_frame", "interpolation"
):
    """
    Generate a video using multiple images (reference images, first/last frame, etc.).
    Supports up to 3 reference images as per Veo 3.1 documentation.
    """
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized.")
    
    try:
        # Validate number of images
        if len(image_files) == 0:
            raise ValueError("At least one image is required")
        if len(image_files) > 3:
            raise ValueError("Maximum 3 images allowed for reference generation")
        
        # Process uploaded images
        images = []
        input_paths = []
        
        for i, image_file in enumerate(image_files):
            file_content = await image_file.read()
            image = Image.open(io.BytesIO(file_content))
            images.append(image)
            
            # Save input image
            input_filename = f"input_{i}_{uuid.uuid4()}.png"
            input_path = os.path.join(UPLOAD_DIR, input_filename)
            image.save(input_path)
            input_paths.append(input_path)
        
        # Validate parameters
        valid_aspect_ratios = ["16:9", "9:16"]
        valid_resolutions = ["720p", "1080p"]
        valid_durations = ["4", "6", "8"]
        valid_generation_types = ["reference", "first_frame", "interpolation"]
        
        if aspect_ratio not in valid_aspect_ratios:
            raise ValueError(f"Invalid aspect_ratio. Must be one of {valid_aspect_ratios}")
        if resolution not in valid_resolutions:
            raise ValueError(f"Invalid resolution. Must be one of {valid_resolutions}")
        if duration not in valid_durations:
            raise ValueError(f"Invalid duration. Must be one of {valid_durations}")
        if generation_type not in valid_generation_types:
            raise ValueError(f"Invalid generation_type. Must be one of {valid_generation_types}")
        
        # Build config
        config = types.GenerateVideosConfig(
            aspect_ratio=aspect_ratio,
            resolution=resolution,
            duration_seconds=duration,
        )
        
        if negative_prompt:
            config.negative_prompt = negative_prompt
        
        print(f"Starting {generation_type} video generation with {len(images)} images...")
        
        # Generate video based on type
        if generation_type == "reference" and len(images) <= 3:
            # Reference images mode (up to 3 images)
            reference_images = []
            for image in images:
                reference_images.append(types.VideoGenerationReferenceImage(
                    image=image,
                    reference_type="asset"
                ))
            
            config.reference_images = reference_images
            
            operation = client.models.generate_videos(
                model="veo-3.1-generate-preview",
                prompt=prompt,
                config=config,
            )
            
        elif generation_type == "first_frame" and len(images) == 1:
            # Single image as first frame
            operation = client.models.generate_videos(
                model="veo-3.1-generate-preview",
                prompt=prompt,
                image=images[0],
                config=config,
            )
            
        elif generation_type == "interpolation" and len(images) == 2:
            # First and last frame interpolation
            config.last_frame = images[1]
            
            operation = client.models.generate_videos(
                model="veo-3.1-generate-preview",
                prompt=prompt,
                image=images[0],  # First frame
                config=config,
            )
            
        else:
            raise ValueError(f"Invalid combination: {generation_type} with {len(images)} images")
        
        # Store operation for polling
        operation_id = str(uuid.uuid4())
        video_operations[operation_id] = {
            'operation': operation,
            'created_at': time.time(),
            'prompt': prompt,
            'input_images': input_paths,
            'generation_type': generation_type,
            'status': 'pending'
        }
        
        if session_id and session_id in sessions:
            sessions[session_id]['last_used'] = time.time()
        
        print(f"{generation_type} video generation started with operation_id: {operation_id}")
        
        return {
            "operation_id": operation_id,
            "status": "pending",
            "message": f"{generation_type} video generation started. Poll for status updates."
        }
    
    except Exception as e:
        print(f"Error starting image-to-video generation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start video generation: {str(e)}")

@app.get("/api/video_chat/operations")
async def list_video_operations():
    """List all video generation operations (for debugging)"""
    return {
        "total_operations": len(video_operations),
        "operations": [
            {
                "operation_id": op_id,
                "status": data['status'],
                "created_at": data['created_at'],
                "prompt": data['prompt'][:100],
                "elapsed_seconds": time.time() - data['created_at']
            }
            for op_id, data in video_operations.items()
        ]
    }

def cleanup_old_video_operations():
    """Remove video operations older than 2 hours"""
    current_time = time.time()
    expired_operations = [
        op_id for op_id, data in video_operations.items()
        if current_time - data.get('created_at', 0) > 7200  # 2 hours
    ]
    
    for op_id in expired_operations:
        # Clean up video file if it exists
        if 'video_path' in video_operations[op_id]:
            video_path = video_operations[op_id]['video_path']
            try:
                if os.path.exists(video_path):
                    os.remove(video_path)
                    print(f"Cleaned up video file: {video_path}")
            except Exception as e:
                print(f"Error cleaning up video file {video_path}: {e}")
        
        del video_operations[op_id]
        print(f"Cleaned up expired video operation: {op_id}")

@app.post("/api/video_chat/cleanup")
async def cleanup_videos():
    """Manual cleanup endpoint"""
    cleanup_old_video_operations()
    return {"message": "Cleanup completed"}


