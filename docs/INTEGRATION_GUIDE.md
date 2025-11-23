# Video Chat Integration Guide

## Quick Start

### 1. Backend Setup

Your `main.py` already has the video routes added. Ensure you have:

```python
# Required imports (already in main.py)
from google import genai
from google.genai import types

# Environment variable set
GOOGLE_API_KEY=your-api-key
```

### 2. Frontend Integration

Add the `VideoChatInterface` component to your main app:

```tsx
// App.tsx or main routing file
import { useState } from 'react';
import AdvancedInterface from './components/AdvancedInterface';
import VideoChatInterface from './components/VideoChatInterface';

export default function App() {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <>
      {mode === 'image' ? (
        <AdvancedInterface
          // ... existing props
          onModeToggle={() => setMode('video')}
        />
      ) : (
        <VideoChatInterface
          onModeToggle={() => setMode('image')}
          sessionId={sessionId}
        />
      )}
    </>
  );
}
```

### 3. API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/video_chat/generate` | Text-to-video generation |
| POST | `/api/video_chat/generate_with_image` | Image-to-video generation |
| POST | `/api/video_chat/status` | Check generation status |
| GET | `/api/video_chat/operations` | List all operations (debug) |

---

## Architecture Overview

### Backend Flow

```
User Request
    ↓
POST /api/video_chat/generate
    ↓
Validate Parameters
    ↓
Call client.models.generate_videos()
    ↓
Store Operation (async)
    ↓
Return operation_id
    ↓
(Client polls /api/video_chat/status)
    ↓
client.operations.get() checks status
    ↓
When done: Download & Save Video
    ↓
Return video_url to client
```

### Frontend Flow

```
User Input (Prompt + Settings)
    ↓
Click "Generate Video"
    ↓
POST /api/video_chat/generate
    ↓
Receive operation_id
    ↓
Add to videoOperations state
    ↓
Start polling (every 5s)
    ↓
Display status updates
    ↓
When completed: Show video player
    ↓
User can download or delete
```

---

## Component Props

### VideoChatInterface

```tsx
interface VideoChatInterfaceProps {
  onModeToggle: () => void;      // Called when user clicks back button
  sessionId: string | null;       // Optional: link to chat session
}
```

### State Management

```tsx
// Video operations tracking
interface VideoOperation {
  operation_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  prompt: string;
  video_url?: string;
  message?: string;
  elapsed_seconds?: number;
}

// Generation settings
interface VideoGenerationOptions {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  duration: '4' | '6' | '8';
}
```

---

## Key Features Implemented

### 1. Text-to-Video Generation
- Detailed prompt input with guidance
- Customizable generation parameters
- Real-time status polling
- Video player with controls

### 2. Image-to-Video Generation
- Image upload with preview
- Animate images with text guidance
- Same customization options as text-to-video

### 3. Settings Panel
- Aspect ratio selection (16:9 / 9:16)
- Resolution options (720p / 1080p)
- Duration control (4s / 6s / 8s)
- Negative prompt input

### 4. Video Management
- Display all generated videos
- Real-time status indicators
- Download functionality
- Delete/clear videos
- Video player with native controls

### 5. Error Handling
- Parameter validation
- API error messages
- User-friendly notifications
- Graceful fallbacks

---

## Customization Options

### Modify Default Settings

```tsx
// In VideoChatInterface.tsx
const [options, setOptions] = useState<VideoGenerationOptions>({
  aspectRatio: '16:9',    // Change default
  resolution: '720p',      // Change default
  duration: '8'            // Change default
});
```

### Adjust Polling Interval

```tsx
// In useEffect polling logic
pollingIntervalRef.current = setInterval(pollVideoStatus, 5000); // Change 5000ms
```

### Customize UI Colors

```tsx
// Modify Tailwind classes in component
className="bg-gradient-to-r from-cyan-500 to-purple-500"  // Change colors
```

### Add More Video Options

```tsx
// Extend VideoGenerationOptions interface
interface VideoGenerationOptions {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  duration: '4' | '6' | '8';
  // Add new options:
  personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow';
  seed?: number;
}
```

---

## Testing the API

### Test Text-to-Video

```bash
curl -X POST http://localhost:8000/api/video_chat/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A majestic lion walking through the African savanna at sunset, cinematic camera movement, warm golden lighting",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": "8"
  }'
```

Expected response:
```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Video generation started. Poll for status updates."
}
```

### Test Status Polling

```bash
curl -X POST http://localhost:8000/api/video_chat/status \
  -H "Content-Type: application/json" \
  -d '{
    "operation_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Test Image-to-Video

```bash
curl -X POST http://localhost:8000/api/video_chat/generate_with_image \
  -F "prompt=A woman walks through a misty forest" \
  -F "image_file=@/path/to/image.png" \
  -F "aspect_ratio=16:9" \
  -F "resolution=720p" \
  -F "duration=8"
```

---

## Performance Considerations

### Memory Usage
- Videos are stored in `/outputs` directory
- Consider cleanup for old videos (>2 days)
- Each video: ~50-100MB at 720p

### API Rate Limits
- Veo 3.1 has quota limits
- Recommended: Max 5-10 concurrent operations
- Queue additional requests if needed

### Polling Strategy
- Start polling after 15 seconds (minimum latency)
- Poll every 5-10 seconds
- Stop when status changes
- Typical wait: 1-6 minutes

---

## Troubleshooting

### Issue: "Gemini client not initialized"

**Solution:**
```bash
# Check environment variable
echo $GOOGLE_API_KEY

# Set if missing
export GOOGLE_API_KEY=your-api-key-here
```

### Issue: Video generation fails with safety error

**Solution:**
- Review prompt for policy violations
- Avoid explicit content
- Use negative prompts to exclude unwanted elements
- Simplify the prompt

### Issue: Polling returns 404

**Solution:**
- Verify operation_id is correct
- Operations expire after 2 days
- Start a new generation

### Issue: Videos not appearing in gallery

**Solution:**
- Check browser console for errors
- Verify polling is running (check Network tab)
- Ensure backend is running on localhost:8000

---

## Next Steps

### Recommended Enhancements

1. **Database Integration**
   - Store video metadata in database
   - Persist generation history
   - User-specific galleries

2. **Advanced Features**
   - Video extension (extend 8s videos)
   - Reference image support
   - Batch generation
   - Video editing/trimming

3. **Performance**
   - Implement caching
   - Optimize polling
   - Add progress indicators
   - Implement video compression

4. **User Experience**
   - Save favorite prompts
   - Prompt templates
   - Video sharing
   - Social features

---

## File Structure

```
/home/youcef/Bureau/gen_ai/image_generation/
├── back/
│   └── main.py                    # Backend with video routes
├── front/
│   └── components/
│       ├── AdvancedInterface.tsx  # Image generation UI
│       └── VideoChatInterface.tsx # Video generation UI (NEW)
├── outputs/                        # Generated videos saved here
├── uploads/                        # Uploaded images saved here
├── VIDEO_API_DOCS.md              # API documentation (NEW)
└── INTEGRATION_GUIDE.md           # This file (NEW)
```

---

## Support & Resources

- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs/video
- **Veo 3.1 Guide**: https://ai.google.dev/gemini-api/docs/video?hl=fr
- **Prompt Guide**: https://ai.google.dev/gemini-api/docs/video?hl=fr#prompt-guide
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits

---

## License & Attribution

- Uses Google's Veo 3.1 model via Gemini API
- Videos include SynthID watermark (AI-generated content marker)
- Verify videos at: https://www.synthid.ai/verify
