# Video Generation API Documentation

## Overview

The Video Chat API integrates Google's Veo 3.1 model for generating high-fidelity 8-second videos. It supports:
- **Text-to-Video**: Generate videos from text prompts
- **Image-to-Video**: Animate images with text guidance
- **Async Operations**: Long-running jobs with polling status

## Backend Routes

### 1. Generate Video (Text-to-Video)

**Endpoint:** `POST /api/video_chat/generate`

**Request Body:**
```json
{
  "prompt": "A cinematic shot of a majestic lion in the savannah",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "duration": "8",
  "negative_prompt": "cartoon, low quality",
  "session_id": "optional-session-uuid"
}
```

**Parameters:**
- `prompt` (string, required): Detailed description of the video
- `aspect_ratio` (string): "16:9" or "9:16" (default: "16:9")
- `resolution` (string): "720p" or "1080p" (default: "720p")
- `duration` (string): "4", "6", or "8" seconds (default: "8")
- `negative_prompt` (string, optional): What to avoid in the video
- `session_id` (string, optional): Link to chat session

**Response:**
```json
{
  "operation_id": "uuid-string",
  "status": "pending",
  "message": "Video generation started. Poll for status updates."
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:8000/api/video_chat/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. A man murmurs, '\''This must be it.'\''. The woman looks at him and whispers, '\''What did you find?'\''",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": "8"
  }'
```

---

### 2. Generate Video from Image (Image-to-Video)

**Endpoint:** `POST /api/video_chat/generate_with_image`

**Request Body (FormData):**
```
prompt: "A hyperrealistic macro photo of tiny surfers riding ocean waves inside a bathroom sink"
image_file: <binary-image-data>
aspect_ratio: "16:9"
resolution: "720p"
duration: "8"
negative_prompt: "blurry, low quality"
session_id: "optional-session-uuid"
```

**Parameters:**
- `prompt` (string, required): Description of the video animation
- `image_file` (file, required): Input image (PNG, JPG, etc.)
- `aspect_ratio` (string): "16:9" or "9:16" (default: "16:9")
- `resolution` (string): "720p" or "1080p" (default: "720p")
- `duration` (string): "4", "6", or "8" seconds (default: "8")
- `negative_prompt` (string, optional): What to avoid
- `session_id` (string, optional): Link to chat session

**Response:**
```json
{
  "operation_id": "uuid-string",
  "status": "pending",
  "message": "Image-to-video generation started. Poll for status updates."
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:8000/api/video_chat/generate_with_image \
  -F "prompt=A woman walks through a forest" \
  -F "image_file=@/path/to/image.png" \
  -F "aspect_ratio=16:9" \
  -F "resolution=720p" \
  -F "duration=8"
```

---

### 3. Check Video Generation Status

**Endpoint:** `POST /api/video_chat/status`

**Request Body:**
```json
{
  "operation_id": "uuid-string-from-generate-endpoint"
}
```

**Response (Processing):**
```json
{
  "status": "processing",
  "operation_id": "uuid-string",
  "message": "Video generation in progress...",
  "elapsed_seconds": 45
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "operation_id": "uuid-string",
  "video_url": "/outputs/gen_video_uuid.mp4",
  "video_path": "/full/path/to/gen_video_uuid.mp4",
  "prompt": "Original prompt text",
  "duration": 120
}
```

**Response (Error):**
```json
{
  "status": "error",
  "operation_id": "uuid-string",
  "detail": "Error message"
}
```

**Polling Strategy:**
- Poll every 5-10 seconds
- Stop polling when `status` is "completed" or "error"
- Expected wait time: 11 seconds to 6 minutes

---

### 4. List Video Operations (Debug)

**Endpoint:** `GET /api/video_chat/operations`

**Response:**
```json
{
  "total_operations": 3,
  "operations": [
    {
      "operation_id": "uuid-1",
      "status": "completed",
      "created_at": 1700000000.0,
      "prompt": "A majestic lion in the savannah...",
      "elapsed_seconds": 120
    },
    {
      "operation_id": "uuid-2",
      "status": "processing",
      "created_at": 1700000050.0,
      "prompt": "A woman walking on the beach...",
      "elapsed_seconds": 70
    }
  ]
}
```

---

## Frontend Integration

### VideoChatInterface Component

The `VideoChatInterface.tsx` component provides:

1. **Text-to-Video Input**
   - Large textarea for detailed prompts
   - Generate button triggers `/api/video_chat/generate`

2. **Image-to-Video Input**
   - Image upload with preview
   - Generate button triggers `/api/video_chat/generate_with_image`

3. **Settings Panel**
   - Aspect ratio selection (16:9 / 9:16)
   - Resolution selection (720p / 1080p)
   - Duration selection (4s / 6s / 8s)
   - Negative prompt input

4. **Video Gallery**
   - Real-time status updates via polling
   - Video player with controls
   - Download button
   - Delete button

### Usage Example

```tsx
import VideoChatInterface from './components/VideoChatInterface';

export default function App() {
  return (
    <VideoChatInterface 
      onModeToggle={() => {/* handle mode switch */}}
      sessionId="optional-session-id"
    />
  );
}
```

---

## Prompt Writing Guide

### Effective Prompt Structure

Include these elements for best results:

1. **Subject**: What's in the video (person, animal, object, scenery)
2. **Action**: What the subject is doing
3. **Style**: Creative direction (sci-fi, horror, animated, cinematic)
4. **Camera**: Movement and positioning (aerial, tracking, dolly, POV)
5. **Composition**: Framing (wide shot, close-up, two-shot)
6. **Ambiance**: Lighting and color (warm tones, sunset, cool blue)

### Example Prompts

**Simple:**
```
A cute creature with snow leopard-like fur is walking in winter forest, 3D cartoon style render.
```

**Detailed:**
```
A close-up cinematic shot follows a desperate man in a weathered green trench coat as he dials a rotary phone mounted on a gritty brick wall, bathed in the eerie glow of a green neon sign. The camera dollies in, revealing the tension in his jaw and the desperation etched on his face. Shallow depth of field focuses on his furrowed brow and the black rotary phone, blurring the background into a sea of neon colors and indistinct shadows, creating a sense of urgency and isolation.
```

**With Audio Cues:**
```
A close up of two people staring at a cryptic drawing on a wall, torchlight flickering. A man murmurs, "This must be it. That's the secret code." The woman looks at him and whispering excitedly, "What did you find?" A rough bark, snapping twigs, footsteps on the damp earth. A lone bird chirps.
```

### Negative Prompt Examples

```
cartoon, drawing, low quality, blurry, distorted, watermark
```

---

## Error Handling

### Common Errors

| Status Code | Error | Solution |
|------------|-------|----------|
| 500 | Gemini client not initialized | Check `GOOGLE_API_KEY` environment variable |
| 400 | Invalid aspect_ratio | Use "16:9" or "9:16" |
| 400 | Invalid resolution | Use "720p" or "1080p" |
| 400 | Invalid duration | Use "4", "6", or "8" |
| 404 | Operation not found | Check operation_id validity |
| 500 | Video generation blocked | Safety filters triggered; revise prompt |

### Retry Strategy

```javascript
async function pollWithRetry(operationId, maxRetries = 60) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/video_chat/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation_id: operationId })
      });
      
      const data = await response.json();
      
      if (data.status === 'completed' || data.status === 'error') {
        return data;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error('Poll error:', error);
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

---

## Model Specifications

### Veo 3.1 Features

| Feature | Support |
|---------|---------|
| Text-to-Video | ✅ Yes |
| Image-to-Video | ✅ Yes |
| Video Extension | ✅ Yes (not yet implemented) |
| Reference Images | ✅ Yes (up to 3) |
| First/Last Frame | ✅ Yes |
| Audio Generation | ✅ Native (8-second videos) |
| Resolution | 720p, 1080p (8s only) |
| Aspect Ratio | 16:9, 9:16 |
| Frame Rate | 24fps |
| Watermarking | SynthID (AI-generated content marker) |

### Limitations

- **Request Latency**: 11 seconds to 6 minutes
- **Video Retention**: 2 days (download within this window)
- **Regional**: EU/UK/CH/MENA have restricted person generation
- **Safety**: Videos pass through safety filters
- **Watermark**: All videos include SynthID watermark

---

## Environment Setup

### Required Environment Variables

```bash
GOOGLE_API_KEY=your-gemini-api-key-here
```

### Installation

```bash
# Backend dependencies
pip install google-genai fastapi python-multipart pillow python-dotenv

# Frontend dependencies
npm install lucide-react
```

---

## Performance Optimization

### Caching Strategy

Store completed videos locally:
```python
# Videos are automatically saved to /outputs directory
# Served via StaticFiles mount at /outputs/{filename}
```

### Polling Optimization

- Initial poll: After 15 seconds (minimum latency)
- Subsequent polls: Every 5-10 seconds
- Stop polling: When status changes from "processing"

### Batch Generation

For multiple videos, queue them sequentially:
```javascript
const operations = [];
for (const prompt of prompts) {
  const response = await fetch('/api/video_chat/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
  operations.push(response.json());
}

// Poll all operations
await Promise.all(operations.map(op => pollWithRetry(op.operation_id)));
```

---

## Troubleshooting

### Video Generation Fails Immediately

**Cause**: Safety filters or invalid parameters
**Solution**: 
- Review prompt for policy violations
- Check aspect_ratio, resolution, duration values
- Simplify the prompt

### Polling Returns 404

**Cause**: Operation ID invalid or expired
**Solution**:
- Verify operation_id from initial response
- Operations expire after 2 days
- Start a new generation

### Video Quality Issues

**Cause**: Low-quality prompt or settings
**Solution**:
- Use detailed, descriptive prompts
- Enable 1080p resolution (if available)
- Add specific style keywords
- Use negative prompts to exclude unwanted elements

---

## API Rate Limits

- **Requests**: Based on Gemini API quota
- **Concurrent Operations**: Recommended max 5-10
- **Video Retention**: 2 days on server

---

## Future Enhancements

- [ ] Video extension support (extend 8s videos)
- [ ] Reference image support (up to 3 images)
- [ ] First/last frame interpolation
- [ ] Batch generation with progress tracking
- [ ] Video editing/trimming
- [ ] Custom watermark removal
