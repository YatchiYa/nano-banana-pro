import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Send, Upload, Play, Pause, Download, Trash2, Plus,
  Loader, CheckCircle, AlertCircle, Video, Image as ImageIcon,
  Settings, Maximize2, Volume2
} from 'lucide-react';

interface VideoGenerationOptions {
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  duration: number;  // Changed to number to support any duration
  generationType: 'reference' | 'first_frame' | 'interpolation';
}

interface VideoOperation {
  operation_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  prompt: string;
  video_url?: string;
  message?: string;
  elapsed_seconds?: number;
  // Long video specific fields
  progress_percentage?: number;
  segments?: number[];
  completed_segments?: number[];
  total_duration?: number;
  estimated_time_minutes?: number;
}

interface VideoChatInterfaceProps {
  onModeToggle: () => void;
  sessionId: string | null;
}

export default function VideoChatInterface({
  onModeToggle,
  sessionId
}: VideoChatInterfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoOperations, setVideoOperations] = useState<VideoOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<VideoGenerationOptions>({
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 8,
    generationType: 'reference'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Polling for video status
  useEffect(() => {
    const pollVideoStatus = async () => {
      const pendingOps = videoOperations.filter(
        op => op.status === 'pending' || op.status === 'processing'
      );

      if (pendingOps.length === 0) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        return;
      }

      for (const op of pendingOps) {
        try {
          const response = await fetch('http://localhost:8000/api/video_chat/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation_id: op.operation_id })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          setVideoOperations(prev =>
            prev.map(operation =>
              operation.operation_id === op.operation_id
                ? { ...operation, ...data }
                : operation
            )
          );

          // If completed, stop polling for this operation
          if (data.status === 'completed' || data.status === 'error') {
            console.log(`Operation ${op.operation_id} finished with status: ${data.status}`);
          }
        } catch (error) {
          console.error('Error polling video status:', error);
          // Mark operation as error if polling fails
          setVideoOperations(prev =>
            prev.map(operation =>
              operation.operation_id === op.operation_id
                ? { ...operation, status: 'error', message: 'Polling failed' }
                : operation
            )
          );
        }
      }
    };

    if (videoOperations.some(op => op.status === 'pending' || op.status === 'processing')) {
      pollingIntervalRef.current = setInterval(pollVideoStatus, 5000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [videoOperations]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxImages = getMaxImages();
      
      if (selectedImages.length + files.length > maxImages) {
        alert(`Maximum ${maxImages} images allowed for ${options.generationType} mode`);
        return;
      }
      
      setSelectedImages(prev => [...prev, ...files]);

      // Create previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreviews(prev => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const getMaxImages = () => {
    switch (options.generationType) {
      case 'reference': return 3;
      case 'first_frame': return 1;
      case 'interpolation': return 2;
      default: return 1;
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    const hasImages = selectedImages.length > 0;

    // Auto-validate image count for generation type if images are provided
    if (hasImages) {
      const maxImages = getMaxImages();
      const minImages = options.generationType === 'interpolation' ? 2 : 1;
      
      if (selectedImages.length < minImages) {
        alert(`${options.generationType} mode requires at least ${minImages} image(s)`);
        return;
      }
      
      if (selectedImages.length > maxImages) {
        alert(`${options.generationType} mode allows maximum ${maxImages} image(s)`);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Use unified endpoint for both text-only and image+text generation
      const formData = new FormData();
      formData.append('prompt', prompt);
      
      // Add images if any are selected
      if (hasImages) {
        selectedImages.forEach((image, index) => {
          formData.append('image_files', image);
        });
        formData.append('generation_type', options.generationType);
      }
      
      formData.append('aspect_ratio', options.aspectRatio);
      formData.append('resolution', options.resolution);
      formData.append('duration', options.duration.toString());
      if (negativePrompt) formData.append('negative_prompt', negativePrompt);
      if (sessionId) formData.append('session_id', sessionId);

      const response = await fetch('http://localhost:8000/api/video_chat/generate_unified', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setVideoOperations(prev => [
          {
            operation_id: data.operation_id,
            status: 'pending',
            prompt: prompt,
            message: data.message
          },
          ...prev
        ]);

        // Clear inputs
        setPrompt('');
        setNegativePrompt('');
        if (hasImages) {
          setSelectedImages([]);
          setImagePreviews([]);
        }
      } else {
        alert(`Error: ${data.detail || 'Failed to generate video'}`);
      }
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Failed to generate video. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadVideo = (videoUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = `http://localhost:8000${videoUrl}`;
    link.download = `video_${Date.now()}.mp4`;
    // target blank_
    
    link.click();
  };

  const removeVideo = (operationId: string) => {
    setVideoOperations(prev => prev.filter(op => op.operation_id !== operationId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader className="w-5 h-5 animate-spin text-cyan-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

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
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-xl blur opacity-30 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-200 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Video Studio
              </h1>
              <p className="text-xs text-gray-400">Veo 3.1 Generation Mode</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-col flex-1 pt-20 relative">
        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-20 right-6 z-40 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Generation Settings</h3>

            <div className="space-y-4">
              {/* Generation Type */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Generation Type</label>
                <div className="space-y-2">
                  {(['reference', 'first_frame', 'interpolation'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setOptions({ ...options, generationType: type });
                        // Clear images when switching types
                        setSelectedImages([]);
                        setImagePreviews([]);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                        options.generationType === type
                          ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium">
                        {type === 'reference' && 'Reference Images (1-3)'}
                        {type === 'first_frame' && 'First Frame (1)'}
                        {type === 'interpolation' && 'Interpolation (2)'}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {type === 'reference' && 'Use images to guide video content'}
                        {type === 'first_frame' && 'Animate from single image'}
                        {type === 'interpolation' && 'Animate between two frames'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Aspect Ratio</label>
                <div className="flex gap-2">
                  {(['16:9', '9:16'] as const).map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setOptions({ ...options, aspectRatio: ratio })}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                        options.aspectRatio === ratio
                          ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Resolution</label>
                <div className="flex gap-2">
                  {(['720p', '1080p'] as const).map(res => (
                    <button
                      key={res}
                      onClick={() => setOptions({ ...options, resolution: res })}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                        options.resolution === res
                          ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Duration (seconds)</label>
                <div className="flex gap-2 mb-2">
                  {([4, 6, 8] as const).map(dur => (
                    <button
                      key={dur}
                      onClick={() => setOptions({ ...options, duration: dur })}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                        options.duration === dur
                          ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    max="141"
                    value={options.duration}
                    onChange={(e) => setOptions({ ...options, duration: parseInt(e.target.value) || 8 })}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="Custom duration"
                  />
                  <span className="text-xs text-gray-400">sec</span>
                </div>
                {options.duration > 8 && (
                  <p className="text-xs text-cyan-400 mt-1">
                    Long video: Will auto-extend using {Math.ceil((options.duration - 8) / 7) + 1} segments
                  </p>
                )}
              </div>

              {/* Negative Prompt */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Negative Prompt (optional)</label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="What to avoid in the video..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Input */}
          <div className="w-1/2 border-r border-white/10 bg-slate-950/50 backdrop-blur-sm flex flex-col overflow-hidden w-[500px]">
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Video Generation Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video Generation
                </h3>

                {/* Prompt Input */}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to generate. Include subject, action, style, camera movement, and ambiance..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 resize-none"
                  rows={6}
                />

              {/* Reference Images Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {options.generationType === 'reference' && 'Reference Images'}
                  {options.generationType === 'first_frame' && 'First Frame'}
                  {options.generationType === 'interpolation' && 'First & Last Frame'}
                </h3>

                <div className="text-xs text-gray-500 mb-3">
                  {options.generationType === 'reference' && `Select 1-3 images to guide video content`}
                  {options.generationType === 'first_frame' && `Select 1 image to animate`}
                  {options.generationType === 'interpolation' && `Select 2 images (first and last frame)`}
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-gray-800">
                          <img
                            src={preview}
                            alt={`Selected ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 px-2 py-1 bg-black/60 rounded text-xs text-white">
                          {options.generationType === 'interpolation' && index === 0 && 'First'}
                          {options.generationType === 'interpolation' && index === 1 && 'Last'}
                          {options.generationType === 'reference' && `Ref ${index + 1}`}
                          {options.generationType === 'first_frame' && 'Frame'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Images Button */}
                {imagePreviews.length < getMaxImages() && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-cyan-500/50 transition-colors group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="w-6 h-6 text-gray-400 group-hover:text-cyan-400" />
                      <span className="text-sm text-gray-400 group-hover:text-cyan-400">
                        Add Images ({imagePreviews.length}/{getMaxImages()})
                      </span>
                    </div>
                  </button>
                )}

                {/* Clear All Button */}
                {imagePreviews.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedImages([]);
                      setImagePreviews([]);
                    }}
                    className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 hover:text-red-200 text-sm transition"
                  >
                    Clear All Images
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                  accept="image/*"
                  multiple={options.generationType === 'reference'}
                />

                {/* Unified Generate Button */}
                <button
                  onClick={handleGenerateVideo}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Generate Video {selectedImages.length > 0 && `(${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''})`}
                    </>
                  )}
                </button>
              </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="w-1/2 bg-slate-950/30 backdrop-blur-sm flex flex-col overflow-hidden w-[800px]">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-sm font-semibold text-gray-300">Generated Videos</h3>
              <p className="text-xs text-gray-500 mt-1">
                {videoOperations.length} video{videoOperations.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-6">
              {videoOperations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Video className="w-12 h-12 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400">
                    No videos generated yet
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Generate videos using the controls on the left
                  </p>
                </div>
              ) : (
                videoOperations.map((operation) => (
                  <div
                    key={operation.operation_id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {getStatusIcon(operation.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-300 truncate">
                          {operation.prompt}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {operation.status === 'pending' && 'Queued...'}
                          {operation.status === 'processing' && (
                            operation.progress_percentage !== undefined ? (
                              <>
                                Long video: {operation.progress_percentage}% complete
                                <br />
                                Segment {(operation.completed_segments?.length || 0) + 1}/{operation.segments?.length || 1}
                                {operation.estimated_time_minutes && (
                                  <span> • Est. {operation.estimated_time_minutes}min total</span>
                                )}
                              </>
                            ) : (
                              `Processing... (${Math.round(operation.elapsed_seconds || 0)}s)`
                            )
                          )}
                          {operation.status === 'completed' && (
                            operation.total_duration ? 
                              `Ready to download (${operation.total_duration}s)` : 
                              'Ready to download'
                          )}
                          {operation.status === 'error' && 'Generation failed'}
                        </p>
                        
                        {/* Progress bar for long videos */}
                        {operation.status === 'processing' && operation.progress_percentage !== undefined && (
                          <div className="mt-2">
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                              <div 
                                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${operation.progress_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {operation.status === 'completed' && operation.video_url && (
                      <div className="space-y-3">
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
                          <video
                            src={`http://localhost:8000${operation.video_url}`}
                            className="w-full h-full object-cover"
                            controls
                            preload="metadata"
                            onError={(e) => {
                              console.error('Video load error:', e);
                              console.log('Video URL:', `http://localhost:8000${operation.video_url}`);
                            }}
                            onLoadedData={() => {
                              console.log('Video loaded successfully:', operation.video_url);
                            }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              downloadVideo(operation.video_url!, operation.prompt)
                            }
                            className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-300 hover:text-cyan-200 text-xs font-medium transition flex items-center justify-center gap-2"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                          <button
                            onClick={() => removeVideo(operation.operation_id)}
                            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 hover:text-red-200 text-xs font-medium transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
