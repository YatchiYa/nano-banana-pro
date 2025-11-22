# Gemini Image Generation Chat Application

A full-stack AI-powered chat application that leverages Google's Gemini API for multi-turn conversations with image generation and processing capabilities. Built with **Next.js** frontend and **FastAPI** backend.

## 🎯 Project Overview

This application enables users to:
- Engage in multi-turn chat conversations with Google's Gemini AI
- Upload and process images within conversations
- Generate images using AI
- Maintain persistent chat sessions
- View generated outputs in real-time

## 📁 Project Structure

```
image_generation/
├── front/                 # Next.js Frontend Application
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── back/                 # FastAPI Backend Server
│   ├── main.py          # Main FastAPI application
│   ├── requirements.txt  # Python dependencies
│   ├── .env.example      # Environment variables template
│   ├── uploads/         # Uploaded files storage
│   └── outputs/         # Generated images storage
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ (for frontend)
- **Python** 3.8+ (for backend)
- **Google API Key** (Gemini API access)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd back
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Google API keys:
   ```
   GOOGLE_API_KEY="your-api-key-here"
   GEMINI_API_KEY="your-api-key-here"
   ```

5. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd front
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```
   Frontend will be available at `http://localhost:3000`

## 🔌 API Endpoints

### Chat Endpoints

#### Create Chat Session
```
POST /api/chat/create
```
Creates a new multi-turn chat session.

**Response:**
```json
{
  "session_id": "uuid-string",
  "message": "Chat session created successfully"
}
```

#### Send Message
```
POST /api/chat
```
Send a message with optional file uploads to an existing or new session.

**Parameters:**
- `message` (string, required): The chat message
- `files` (file, optional): Image files to process
- `session_id` (string, optional): Existing session ID

**Response:**
```json
{
  "parts": [
    {
      "type": "text",
      "content": "Response text"
    },
    {
      "type": "image",
      "content": "data:image/png;base64,...",
      "path": "outputs/gen_uuid.png"
    }
  ],
  "session_id": "uuid-string"
}
```

#### List Active Sessions
```
GET /api/sessions
```
Lists all active chat sessions (for debugging).

**Response:**
```json
{
  "active_sessions": 2,
  "sessions": [
    {
      "session_id": "uuid-string",
      "created_at": 1234567890,
      "last_used": 1234567890,
      "age_seconds": 120
    }
  ]
}
```

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 14+ (React)
- **Styling:** CSS/TailwindCSS
- **HTTP Client:** Fetch API
- **Language:** TypeScript/JavaScript

### Backend
- **Framework:** FastAPI
- **Server:** Uvicorn
- **AI API:** Google Gemini API
- **Image Processing:** Pillow (PIL)
- **File Handling:** Python multipart
- **Environment:** python-dotenv

### Key Dependencies

**Backend (`requirements.txt`):**
```
fastapi
uvicorn
google-genai
python-multipart
pillow
dotenv
```

## 📋 Features

### Backend Features
- ✅ Multi-turn chat sessions with persistent storage
- ✅ Automatic session cleanup (1-hour timeout)
- ✅ Image upload and processing
- ✅ AI-generated image output
- ✅ CORS support for frontend integration
- ✅ Static file serving for uploads and outputs
- ✅ Google Search grounding for accurate responses
- ✅ Error handling and logging

### Frontend Features
- ✅ Real-time chat interface
- ✅ File upload support
- ✅ Message history display
- ✅ Image preview and rendering
- ✅ Session management
- ✅ Responsive design

## 🔐 Environment Variables

Create a `.env` file in the `back/` directory with:

```env
GOOGLE_API_KEY="your-google-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

**⚠️ Security Note:** Never commit `.env` files to version control. Use `.env.example` as a template.

## 📂 File Storage

- **Uploads:** `back/uploads/` - User-uploaded files
- **Outputs:** `back/outputs/` - Generated images from AI

Both directories are automatically created on first run.

## 🔄 Session Management

- Sessions are stored in-memory (suitable for development)
- **For production:** Replace with Redis or database
- Sessions auto-cleanup after 1 hour of inactivity
- Cleanup runs every 5 minutes to optimize performance

## 🐛 Troubleshooting

### Backend Issues

**Error: "Gemini client not initialized"**
- Ensure `GOOGLE_API_KEY` is set in `.env`
- Verify API key has Gemini API access

**Port 8000 already in use:**
```bash
uvicorn main:app --reload --port 8001
```

### Frontend Issues

**Cannot connect to backend:**
- Verify backend is running on `http://localhost:8000`
- Check CORS configuration in `main.py`
- Ensure frontend API calls use correct backend URL

**Port 3000 already in use:**
```bash
npm run dev -- -p 3001
```

## 📦 Building for Production

### Backend
```bash
cd back
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd front
npm install
npm run build
npm start
```

## 🚀 Deployment

### Vercel (Frontend)
```bash
cd front
vercel deploy
```

### Cloud Run / App Engine (Backend)
```bash
cd back
gcloud app deploy
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Gemini API](https://ai.google.dev/)
- [Pillow Documentation](https://pillow.readthedocs.io/)

## 📝 License

This project is open source and available under the MIT License.

## 👤 Author

Created as an AI-powered image generation and chat application.

---

**Last Updated:** November 2025
