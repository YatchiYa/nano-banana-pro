# Quick Start Guide - Video Generation

## 5-Minute Setup

### 1. Verify Backend Routes Added ✅

Check that `main.py` has these new endpoints:
```python
POST /api/video_chat/generate
POST /api/video_chat/generate_with_image
POST /api/video_chat/status
GET /api/video_chat/operations
```

### 2. Add Frontend Component ✅

Copy `VideoChatInterface.tsx` to your components folder.

### 3. Integrate into App

```tsx
import VideoChatInterface from './components/VideoChatInterface';

// Add mode toggle
<VideoChatInterface 
  onModeToggle={() => setMode('image')}
  sessionId={sessionId}
/>
```

### 4. Start Backend

```bash
cd /home/youcef/Bureau/gen_ai/image_generation/back
python main.py
```

### 5. Test

Visit: `http://localhost:3000` and toggle to Video mode

---

## API Quick Reference

### Generate Video (Text)
```bash
curl -X POST http://localhost:8000/api/video_chat/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A majestic lion in the African savanna at sunset",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": "8"
  }'
```

### Generate Video (Image)
```bash
curl -X POST http://localhost:8000/api/video_chat/generate_with_image \
  -F "prompt=Animate this image" \
  -F "image_file=@image.png" \
  -F "aspect_ratio=16:9" \
  -F "resolution=720p" \
  -F "duration=8"
```

### Check Status
```bash
curl -X POST http://localhost:8000/api/video_chat/status \
  -H "Content-Type: application/json" \
  -d '{"operation_id": "your-operation-id"}'
```

---

## Component Props

```tsx
<VideoChatInterface
  onModeToggle={() => {}}        // Called when user clicks back
  sessionId="optional-uuid"       // Link to chat session
/>
```

---

## Settings Options

| Setting | Values | Default |
|---------|--------|---------|
| Aspect Ratio | 16:9, 9:16 | 16:9 |
| Resolution | 720p, 1080p | 720p |
| Duration | 4s, 6s, 8s | 8s |
| Negative Prompt | Any text | Empty |

---

## Prompt Template

```
[SUBJECT] [ACTION] in [SETTING], [STYLE], [CAMERA], [LIGHTING]
```

### Example
```
A majestic lion walking through tall golden grass in the African savanna 
at golden hour, cinematic tracking shot, warm sunlight creating dramatic 
shadows, realistic documentary-style cinematography.
```

---

## Status Flow

```
pending → processing → completed
                    ↓
                  error
```

**Polling**: Every 5 seconds  
**Timeout**: ~6 minutes max  
**Typical**: 1-3 minutes

---

## File Locations

| File | Purpose |
|------|---------|
| `main.py` | Backend routes (updated) |
| `VideoChatInterface.tsx` | Frontend component (new) |
| `VIDEO_API_DOCS.md` | Full API reference |
| `INTEGRATION_GUIDE.md` | Integration details |
| `PROMPT_EXAMPLES.md` | 20+ prompt examples |
| `/outputs/` | Generated videos saved here |

---

## Troubleshooting

### "Gemini client not initialized"
```bash
export GOOGLE_API_KEY=your-api-key
```

### "Invalid aspect_ratio"
Use: `"16:9"` or `"9:16"`

### "Operation not found"
Operation expired (>2 days) or invalid ID

### Video not appearing
Check browser console for errors, verify backend is running

---

## Key Features

✅ Text-to-video generation  
✅ Image-to-video generation  
✅ Real-time status polling  
✅ Video player with controls  
✅ Download functionality  
✅ Settings customization  
✅ Error handling  
✅ Responsive UI  

---

## Performance

- **Generation Time**: 11 seconds to 6 minutes
- **Video Size**: 50-120MB
- **Duration**: 4-8 seconds
- **Resolution**: 720p or 1080p
- **Frame Rate**: 24fps

---

## Next Steps

1. ✅ Add component to app
2. ✅ Test text-to-video
3. ✅ Test image-to-video
4. ✅ Customize prompts
5. ✅ Integrate with sessions
6. 📋 Add database for history
7. 📋 Implement video extension
8. 📋 Add reference images

---

## Documentation

- **Full API**: `VIDEO_API_DOCS.md`
- **Integration**: `INTEGRATION_GUIDE.md`
- **Prompts**: `PROMPT_EXAMPLES.md`
- **Summary**: `VIDEO_IMPLEMENTATION_SUMMARY.md`

---

## Support

- **Gemini API**: https://ai.google.dev/gemini-api/docs/video
- **Veo 3.1**: https://ai.google.dev/gemini-api/docs/video?hl=fr
- **Prompts**: https://ai.google.dev/gemini-api/docs/prompt-design

---

## Environment Variables

```bash
# Required
GOOGLE_API_KEY=your-gemini-api-key

# Optional
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

---

## Common Prompts

### Cinematic
```
A cinematic shot of a majestic lion in the African savanna, 
warm golden sunlight, tracking camera movement, realistic.
```

### Animation
```
A cute 3D animated creature with snow leopard fur prancing 
through a whimsical winter forest, bright cheerful colors.
```

### Product
```
A sleek smartphone rotating on a reflective surface, 
premium design, soft studio lighting, minimalist aesthetic.
```

### Nature
```
A smooth cinematic shot of a Hawaiian waterfall in a lush 
rainforest, misty atmosphere, peaceful and serene.
```

---

## Tips

1. **Be Descriptive**: More details = better results
2. **Use Negative Prompts**: Exclude unwanted elements
3. **Specify Camera**: Describe camera movement
4. **Add Lighting**: Include color and lighting details
5. **Choose Style**: Specify creative direction
6. **Test & Iterate**: Refine based on results

---

## Checklist

- [ ] Backend running
- [ ] API key set
- [ ] Component added
- [ ] Mode toggle working
- [ ] Text-to-video works
- [ ] Image-to-video works
- [ ] Polling updates
- [ ] Downloads work
- [ ] Settings panel works
- [ ] Error handling works

---

**Ready to generate videos!** 🎬
