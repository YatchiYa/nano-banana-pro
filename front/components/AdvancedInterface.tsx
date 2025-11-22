import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Settings, Download, Share2, Trash2, Edit3, 
  ZoomIn, ZoomOut, RotateCw, Crop, Palette, Layers,
  Sparkles, Send, Image as ImageIcon, X, Plus, Grid3X3,
  Maximize2, Copy, Heart, Star, Wand2
} from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  content: string;
  images?: string[];
}

interface GenerationOptions {
  difficulty: 'simple' | 'intermediate' | 'advanced' | 'expert';
  style: string;
  aspectRatio: string;
  quality: 'standard' | 'hd' | 'ultra';
  creativity: number;
  iterations: number;
}

interface AdvancedInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  sessionId: string | null;
  generationOptions: GenerationOptions;
  onSendMessage: (message: string, files: File[]) => void;
  onStartNewChat: () => void;
  onOptionsChange: (options: GenerationOptions) => void;
  onModeToggle: () => void;
}

export default function AdvancedInterface({
  messages,
  isLoading,
  sessionId,
  generationOptions,
  onSendMessage,
  onStartNewChat,
  onOptionsChange,
  onModeToggle
}: AdvancedInterfaceProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [secondRowHeight, setSecondRowHeight] = useState(33); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all generated images from messages
  const generatedImages = messages
    .filter(msg => msg.role === 'model' && msg.images)
    .flatMap(msg => msg.images || []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && selectedImages.length === 0) || isLoading) return;

    onSendMessage(message, selectedImages);
    setMessage('');
    //setSelectedImages([]);
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `neural-canvas-${Date.now()}.png`;
    link.click();
  };

  const addImageToInput = async (imageUrl: string) => {
    try {
      // Fetch the image and convert to File object
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const fileName = `generated-image-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      
      // Add to selected images
      setSelectedImages(prev => [...prev, file]);
      
      // Optional: Show success feedback
      console.log('Image added to input panel successfully');
    } catch (error) {
      console.error('Error adding image to input:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onModeToggle}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl blur opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-200 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Advanced Studio
              </h1>
              <p className="text-xs text-gray-400">Professional Creation Mode</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessionId && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-300">Live</span>
            </div>
          )}
          <button
            onClick={onStartNewChat}
            className="px-3 py-1.5 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition"
          >
            + New Project
          </button>
        </div>
      </header>

      {/* Main Content - Two Row Layout */}
      <div className="flex flex-col flex-1 pt-20" ref={containerRef}>
        
        {/* First Row - Dual Panels */}
        <div className="flex border-b border-white/10" style={{ height: `${100 - secondRowHeight}%` }}>
          {/* Left Panel - Input Images */}
          <div className="w-1/2 border-r border-white/10 bg-slate-950/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Reference Images
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-cyan-500/50 transition-colors group"
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus className="w-8 h-8 text-gray-400 group-hover:text-cyan-400" />
                  <span className="text-sm text-gray-400 group-hover:text-cyan-400">Add Images</span>
                </div>
              </button>
              
              {selectedImages.length > 0 && (
                <button
                  onClick={() => setSelectedImages([])}
                  className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-300 hover:text-red-200 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All ({selectedImages.length})
                </button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedImages.map((file, idx) => (
              <div key={idx} className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-gray-800 h-[300px]">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                    <span className="text-xs text-white truncate">{file.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

          {/* Center - Generation Effect */}
          <div className="w-32 flex items-center justify-center border-r border-white/10 bg-gradient-to-b from-slate-950/30 to-purple-950/30 backdrop-blur-sm">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500/30 border-b-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-cyan-400 font-medium">Generating</div>
                  <div className="flex space-x-1 mt-1">
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <Wand2 className="w-8 h-8" />
                <div className="text-xs text-center">Click Generate</div>
              </div>
            )}
          </div>

          {/* Right Panel - Generated Results */}
          <div className="flex-1 bg-slate-950/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generated Results ({generatedImages.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {generatedImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">No images generated yet</p>
                  <p className="text-gray-500 text-xs mt-1">Start creating to see results here</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {generatedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="aspect-square rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-cyan-500/50 transition-colors">
                      <img
                        src={img}
                        alt="Generated"
                        className="w-full h-full object-cover"
                        onClick={() => setSelectedResult(img)}
                      />
                    </div>
                    
                    {/* Image Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                      <button
                        onClick={() => downloadImage(img)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedResult(img)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                        title="View Full Size"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => addImageToInput(img)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                        title="Add to Input Images"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="h-1 bg-white/10 hover:bg-cyan-500/50 cursor-row-resize transition-colors relative group"
          onMouseDown={(e) => {
            setIsResizing(true);
            const startY = e.clientY;
            const startHeight = secondRowHeight;
            
            const handleMouseMove = (e: MouseEvent) => {
              const deltaY = startY - e.clientY;
              const containerHeight = containerRef.current?.clientHeight || window.innerHeight - 80;
              const newHeight = Math.min(Math.max(startHeight + (deltaY / containerHeight) * 100, 15), 75);
              setSecondRowHeight(newHeight);
            };
            
            const handleMouseUp = () => {
              setIsResizing(false);
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-0.5 bg-cyan-400 rounded-full"></div>
          </div>
        </div>

        {/* Second Row - Input and Parameters */}
        <div className="bg-slate-950/30 backdrop-blur-sm flex flex-col overflow-hidden" style={{ height: `${secondRowHeight}%` }}>
          {/* Generation Options */}
          <div className="border-b border-white/10 p-4 relative z-40 flex-shrink-0">
            <div className="grid grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Difficulty</label>
                <select
                  value={generationOptions.difficulty}
                  onChange={(e) => onOptionsChange({ ...generationOptions, difficulty: e.target.value as any })}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white text-xs focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="simple" className="bg-slate-800 text-white">Simple</option>
                  <option value="intermediate" className="bg-slate-800 text-white">Intermediate</option>
                  <option value="advanced" className="bg-slate-800 text-white">Advanced</option>
                  <option value="expert" className="bg-slate-800 text-white">Expert</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Style</label>
                <select
                  value={generationOptions.style}
                  onChange={(e) => onOptionsChange({ ...generationOptions, style: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white text-xs focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="photorealistic" className="bg-slate-800 text-white">Photorealistic</option>
                  <option value="artistic" className="bg-slate-800 text-white">Artistic</option>
                  <option value="anime" className="bg-slate-800 text-white">Anime</option>
                  <option value="cyberpunk" className="bg-slate-800 text-white">Cyberpunk</option>
                  <option value="minimalist" className="bg-slate-800 text-white">Minimalist</option>
                  <option value="vintage" className="bg-slate-800 text-white">Vintage</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Quality</label>
                <select
                  value={generationOptions.quality}
                  onChange={(e) => onOptionsChange({ ...generationOptions, quality: e.target.value as any })}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white text-xs focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="standard" className="bg-slate-800 text-white">Standard</option>
                  <option value="hd" className="bg-slate-800 text-white">HD</option>
                  <option value="ultra" className="bg-slate-800 text-white">Ultra</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ratio</label>
                <select
                  value={generationOptions.aspectRatio}
                  onChange={(e) => onOptionsChange({ ...generationOptions, aspectRatio: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white text-xs focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                >
                  <option value="1:1" className="bg-slate-800 text-white">1:1</option>
                  <option value="16:9" className="bg-slate-800 text-white">16:9</option>
                  <option value="9:16" className="bg-slate-800 text-white">9:16</option>
                  <option value="4:3" className="bg-slate-800 text-white">4:3</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Creativity: {generationOptions.creativity}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={generationOptions.creativity}
                  onChange={(e) => onOptionsChange({ ...generationOptions, creativity: parseInt(e.target.value) })}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Iterations</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={generationOptions.iterations}
                  onChange={(e) => onOptionsChange({ ...generationOptions, iterations: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:border-cyan-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          {/* <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 via-purple-900/50 to-slate-800 rounded-2xl flex items-center justify-center border border-white/10">
                  <Layers className="w-10 h-10 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Advanced Studio Ready</h3>
                  <p className="text-gray-400">Upload references, set your parameters, and create masterpieces</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 text-cyan-100' 
                    : 'bg-gradient-to-r from-slate-800/50 to-purple-900/30 border border-white/10 text-gray-100'
                }`}>
                  {msg.content && <p className="text-sm">{msg.content}</p>}
                  {msg.images && msg.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {msg.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img}
                          alt="Generated"
                          className="rounded-lg border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setSelectedResult(img)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-slate-800/50 to-purple-900/30 border border-purple-500/30 p-4 rounded-2xl flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-gray-300">Generating...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div> */}

          {/* Messages Area - Text Only */}
          <div className="flex-1 overflow-y-auto p-4 border-b border-white/10">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-sm">No messages yet</div>
                    <div className="text-xs mt-1">Start a conversation to see messages here</div>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-100' 
                        : 'bg-slate-800/50 border border-white/10 text-gray-200'
                    }`}>
                      {msg.content && (
                        <div className="leading-relaxed">{msg.content}</div>
                      )}
                      {msg.images && msg.images.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400 italic">
                          Generated {msg.images.length} image{msg.images.length > 1 ? 's' : ''} (view in results panel)
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/50 border border-purple-500/30 p-3 rounded-xl flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gray-300">Generating...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1 relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your creative vision in detail... All parameters will be automatically applied to enhance your prompt."
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 resize-none focus:border-cyan-500/50 focus:outline-none text-base leading-relaxed min-h-[60px] max-h-[100px]"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                {message.length > 0 && (
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-black/30 px-2 py-1 rounded">
                    {message.length} chars
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={(!message.trim() && selectedImages.length === 0) || isLoading}
                  className={`group relative px-8 py-4 rounded-2xl transition-all duration-300 flex items-center gap-3 font-semibold text-lg ${
                    (!message.trim() && selectedImages.length === 0) || isLoading
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                      : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 border border-purple-400/30'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={24} className="group-hover:rotate-12 transition-transform" />
                      <span>Generate</span>
                      <Sparkles size={20} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                    </>
                  )}
                  
                  {!isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity -z-10"></div>
                  )}
                </button>
                
                <div className="text-xs text-gray-400 text-center">
                  <div>Parameters applied:</div>
                  <div className="text-cyan-400">{generationOptions.difficulty} • {generationOptions.style}</div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedResult}
              alt="Full size"
              className="max-w-full max-h-full rounded-xl border border-white/20"
            />
            <button
              onClick={() => setSelectedResult(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-3">
              <button
                onClick={() => downloadImage(selectedResult)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm text-white transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm text-white transition-colors flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
