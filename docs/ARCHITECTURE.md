# Video Generation System - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                   (VideoChatInterface.tsx)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │  Text-to-Video   │         │ Image-to-Video   │              │
│  │  Input Panel     │         │  Input Panel     │              │
│  └────────┬─────────┘         └────────┬─────────┘              │
│           │                            │                         │
│           └────────────┬───────────────┘                         │
│                        │                                          │
│           ┌────────────▼──────────────┐                         │
│           │   Settings Panel          │                         │
│           │ - Aspect Ratio            │                         │
│           │ - Resolution              │                         │
│           │ - Duration                │                         │
│           │ - Negative Prompt         │                         │
│           └────────────┬──────────────┘                         │
│                        │                                          │
│           ┌────────────▼──────────────┐                         │
│           │  Video Gallery            │                         │
│           │ - Status Polling          │                         │
│           │ - Video Player            │                         │
│           │ - Download/Delete         │                         │
│           └────────────┬──────────────┘                         │
│                        │                                          │
└────────────────────────┼──────────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────▼──────────────────────────────────────────┐
│                    BACKEND API (FastAPI)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ POST /api/video_chat/generate                            │   │
│  │ - Validate parameters                                    │   │
│  │ - Call Veo 3.1 model                                     │   │
│  │ - Store operation reference                              │   │
│  │ - Return operation_id                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ POST /api/video_chat/generate_with_image                 │   │
│  │ - Read image file                                        │   │
│  │ - Validate parameters                                    │   │
│  │ - Call Veo 3.1 with image                                │   │
│  │ - Store operation reference                              │   │
│  │ - Return operation_id                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ POST /api/video_chat/status                              │   │
│  │ - Get operation from storage                             │   │
│  │ - Check status with Gemini API                           │   │
│  │ - If done: Download video, save to /outputs              │   │
│  │ - Return status + video URL                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ GET /api/video_chat/operations                           │   │
│  │ - List all operations (debug)                            │   │
│  │ - Return status and metadata                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Operation Storage (In-Memory Dict)                       │   │
│  │ {                                                        │   │
│  │   "operation_id": {                                      │   │
│  │     "operation": <GeminiOperation>,                      │   │
│  │     "created_at": timestamp,                             │   │
│  │     "prompt": "...",                                     │   │
│  │     "status": "pending|processing|completed|error"       │   │
│  │   }                                                      │   │
│  │ }                                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         │ Google Gemini API
                         │
┌────────────────────────▼──────────────────────────────────────────┐
│                   GOOGLE GEMINI API                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Veo 3.1 Model                                            │   │
│  │ - Text-to-Video Generation                              │   │
│  │ - Image-to-Video Generation                             │   │
│  │ - 8-second video output                                 │   │
│  │ - Native audio generation                               │   │
│  │ - SynthID watermarking                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Operations API                                           │   │
│  │ - Check operation status                                │   │
│  │ - Download generated videos                             │   │
│  │ - Handle async job tracking                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         │ File Storage
                         │
┌────────────────────────▼──────────────────────────────────────────┐
│                    LOCAL FILE SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /outputs/                                                       │
│  ├── gen_video_uuid1.mp4  (Generated videos)                     │
│  ├── gen_video_uuid2.mp4                                         │
│  └── ...                                                         │
│                                                                   │
│  /uploads/                                                       │
│  ├── input_uuid1.png      (Uploaded images)                      │
│  ├── input_uuid2.png                                             │
│  └── ...                                                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Text-to-Video Generation Flow

```
User Input
  │
  ├─ Prompt: "A majestic lion..."
  ├─ Aspect Ratio: "16:9"
  ├─ Resolution: "720p"
  ├─ Duration: "8"
  └─ Negative Prompt: "cartoon, low quality"
  │
  ▼
Frontend: POST /api/video_chat/generate
  │
  ▼
Backend: Validate Parameters
  │
  ├─ Check aspect_ratio ✓
  ├─ Check resolution ✓
  ├─ Check duration ✓
  └─ Check prompt not empty ✓
  │
  ▼
Backend: Call Gemini API
  │
  ├─ client.models.generate_videos(
  │    model="veo-3.1-generate-preview",
  │    prompt=prompt,
  │    config=GenerateVideosConfig(...)
  │  )
  │
  ▼
Backend: Store Operation
  │
  ├─ Generate operation_id (UUID)
  ├─ Store in video_operations dict
  └─ Return operation_id to frontend
  │
  ▼
Frontend: Receive operation_id
  │
  ├─ Add to videoOperations state
  ├─ Start polling interval (5s)
  └─ Display "Pending..." status
  │
  ▼
Frontend: Poll /api/video_chat/status
  │
  ├─ Every 5 seconds
  ├─ Send operation_id
  └─ Check status
  │
  ▼
Backend: Check Operation Status
  │
  ├─ Get operation from storage
  ├─ Call client.operations.get(operation)
  └─ Check if done
  │
  ├─ If processing:
  │  └─ Return { status: "processing", elapsed_seconds: 45 }
  │
  ├─ If completed:
  │  ├─ Download video from Gemini
  │  ├─ Save to /outputs/gen_video_uuid.mp4
  │  ├─ Return { status: "completed", video_url: "/outputs/..." }
  │  └─ Stop polling
  │
  └─ If error:
     └─ Return { status: "error", detail: "..." }
  │
  ▼
Frontend: Display Video
  │
  ├─ Show video player
  ├─ Enable download button
  ├─ Enable delete button
  └─ Stop polling
```

### Image-to-Video Generation Flow

```
User Input
  │
  ├─ Image File: image.png
  ├─ Prompt: "Animate with walking motion"
  ├─ Aspect Ratio: "16:9"
  ├─ Resolution: "720p"
  └─ Duration: "8"
  │
  ▼
Frontend: POST /api/video_chat/generate_with_image (multipart/form-data)
  │
  ▼
Backend: Read Image File
  │
  ├─ Read file content
  ├─ Convert to PIL Image
  ├─ Save to /uploads/input_uuid.png
  └─ Keep in memory for API call
  │
  ▼
Backend: Validate Parameters
  │
  ├─ Check image is valid ✓
  ├─ Check prompt not empty ✓
  ├─ Check aspect_ratio ✓
  ├─ Check resolution ✓
  └─ Check duration ✓
  │
  ▼
Backend: Call Gemini API
  │
  ├─ client.models.generate_videos(
  │    model="veo-3.1-generate-preview",
  │    prompt=prompt,
  │    image=image,  ← Image as starting frame
  │    config=GenerateVideosConfig(...)
  │  )
  │
  ▼
Backend: Store Operation
  │
  ├─ Generate operation_id (UUID)
  ├─ Store operation + input_image path
  └─ Return operation_id to frontend
  │
  ▼
[Same polling flow as text-to-video]
```

### Status Polling Flow

```
Frontend: Poll /api/video_chat/status
  │
  ├─ Every 5 seconds
  ├─ Send operation_id
  └─ Check status
  │
  ▼
Backend: Get Operation Status
  │
  ├─ Retrieve from video_operations[operation_id]
  ├─ Call client.operations.get(operation)
  │
  ├─ Status: pending
  │  └─ Return { status: "pending" }
  │
  ├─ Status: processing
  │  └─ Return { status: "processing", elapsed_seconds: X }
  │
  └─ Status: done
     ├─ Get generated_video from operation.response
     ├─ Download video file
     ├─ Save to /outputs/gen_video_uuid.mp4
     ├─ Update operation status to "completed"
     └─ Return { status: "completed", video_url: "/outputs/..." }
  │
  ▼
Frontend: Update UI
  │
  ├─ If processing:
  │  └─ Update elapsed time display
  │
  ├─ If completed:
  │  ├─ Display video player
  │  ├─ Enable download button
  │  ├─ Stop polling
  │  └─ Show success message
  │
  └─ If error:
     ├─ Show error message
     └─ Stop polling
```

---

## Component Hierarchy

```
App
├── AdvancedInterface (Image Generation)
│   ├── Header
│   ├── Input Panel
│   ├── Output Gallery
│   └── Settings
│
└── VideoChatInterface (Video Generation) ← NEW
    ├── Header
    │   ├── Back Button
    │   ├── Title
    │   └── Settings Button
    │
    ├── Main Content
    │   ├── Left Panel (Input)
    │   │   ├── Text-to-Video Section
    │   │   │   ├── Prompt Textarea
    │   │   │   └── Generate Button
    │   │   │
    │   │   └── Image-to-Video Section
    │   │       ├── Image Upload
    │   │       ├── Image Preview
    │   │       └── Generate Button
    │   │
    │   └── Right Panel (Output)
    │       ├── Gallery Header
    │       └── Video List
    │           ├── Video Item
    │           │   ├── Status Icon
    │           │   ├── Metadata
    │           │   ├── Video Player
    │           │   └── Action Buttons
    │           └── Empty State
    │
    └── Settings Panel (Overlay)
        ├── Aspect Ratio Selector
        ├── Resolution Selector
        ├── Duration Selector
        └── Negative Prompt Input
```

---

## State Management

```
VideoChatInterface State
│
├── prompt: string
│   └─ User's video description
│
├── selectedImage: File | null
│   └─ Uploaded image file
│
├── imagePreview: string | null
│   └─ Data URL for preview
│
├── videoOperations: VideoOperation[]
│   └─ Array of all video generation operations
│       ├── operation_id: string
│       ├── status: "pending" | "processing" | "completed" | "error"
│       ├── prompt: string
│       ├── video_url?: string
│       ├── message?: string
│       └── elapsed_seconds?: number
│
├── isLoading: boolean
│   └─ True while generating
│
├── options: VideoGenerationOptions
│   ├── aspectRatio: "16:9" | "9:16"
│   ├── resolution: "720p" | "1080p"
│   └── duration: "4" | "6" | "8"
│
├── showSettings: boolean
│   └─ Settings panel visibility
│
├── negativePrompt: string
│   └─ What to exclude from video
│
└── playingVideoId: string | null
    └─ Currently playing video ID
```

---

## API Request/Response Examples

### Generate Video Request
```json
{
  "prompt": "A majestic lion walking through the African savanna at sunset, cinematic camera movement, warm golden lighting",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "duration": "8",
  "negative_prompt": "cartoon, low quality, blurry",
  "session_id": "optional-uuid"
}
```

### Generate Video Response
```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Video generation started. Poll for status updates."
}
```

### Status Check Request
```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Status Check Response (Processing)
```json
{
  "status": "processing",
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Video generation in progress...",
  "elapsed_seconds": 45
}
```

### Status Check Response (Completed)
```json
{
  "status": "completed",
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "video_url": "/outputs/gen_video_550e8400.mp4",
  "video_path": "/home/youcef/Bureau/gen_ai/image_generation/outputs/gen_video_550e8400.mp4",
  "prompt": "A majestic lion walking through the African savanna...",
  "duration": 120
}
```

---

## Error Handling Flow

```
User Action
  │
  ▼
Validation
  │
  ├─ Invalid input
  │  └─ Show user-friendly error
  │
  ├─ API call fails
  │  ├─ Log error
  │  ├─ Show error message
  │  └─ Suggest solution
  │
  ├─ Network error
  │  ├─ Retry logic
  │  └─ Show connection error
  │
  └─ Safety filter blocks
     ├─ Show safety warning
     └─ Suggest prompt revision
```

---

## Performance Optimization

### Frontend Optimizations
- Polling interval: 5 seconds (configurable)
- Debounced input handling
- Memoized components
- Lazy video player loading

### Backend Optimizations
- In-memory operation storage (fast lookup)
- Async API calls (non-blocking)
- File streaming for downloads
- UUID-based file naming (no collisions)

### Network Optimizations
- Minimal payload sizes
- Gzip compression
- CORS caching
- HTTP keep-alive

---

## Deployment Architecture

```
Production Environment
│
├── Frontend
│   ├── React App (Vercel/Netlify)
│   └── Static files (CDN)
│
├── Backend
│   ├── FastAPI Server (AWS/GCP)
│   ├── Redis (Operation tracking)
│   └── Database (PostgreSQL)
│
├── Storage
│   ├── Local /outputs (short-term)
│   └── S3/GCS (long-term)
│
└── External
    └── Google Gemini API
```

---

## Monitoring & Logging

```
Metrics to Track
├── Generation time (min/avg/max)
├── Success rate (%)
├── Error rate (%)
├── API quota usage
├── Storage usage
└── User engagement

Logs to Capture
├── API requests/responses
├── Generation status changes
├── Errors and exceptions
├── Performance metrics
└── User actions
```

---

## Security Considerations

```
Input Validation
├── Prompt length limits
├── File size limits
├── File type validation
└── Parameter validation

API Security
├── CORS configuration
├── Rate limiting
├── API key management
└── Error message sanitization

Data Security
├── UUID-based file naming
├── Secure file storage
├── Automatic cleanup (>2 days)
└── No sensitive data in logs
```

---

## Scalability Path

```
Current (Single Server)
│
├─ In-memory operation storage
├─ Local file storage
└─ Single FastAPI instance

Phase 1 (Database)
│
├─ PostgreSQL for operations
├─ Redis for caching
└─ Single FastAPI instance

Phase 2 (Distributed)
│
├─ Multiple FastAPI instances
├─ Load balancer
├─ S3 for file storage
└─ Message queue (RabbitMQ)

Phase 3 (Enterprise)
│
├─ Kubernetes cluster
├─ Auto-scaling
├─ Multi-region deployment
└─ Advanced monitoring
```

---

This architecture is designed to be:
- **Scalable**: From single server to enterprise
- **Maintainable**: Clear separation of concerns
- **Reliable**: Error handling and recovery
- **Performant**: Optimized for speed
- **Secure**: Input validation and data protection
