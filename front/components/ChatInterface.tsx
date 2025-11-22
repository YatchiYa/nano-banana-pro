
import React, { useState, useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import InputArea from './InputArea';
import AdvancedInterface from './AdvancedInterface';
import { Settings, Zap, Palette, Layers, Sparkles } from 'lucide-react';

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

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    difficulty: 'intermediate',
    style: 'photorealistic',
    aspectRatio: '1:1',
    quality: 'hd',
    creativity: 7,
    iterations: 1
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    console.log('Started new chat session');
  };

  const buildEnhancedPrompt = (text: string) => {
    let enhancedPrompt = text;
    
    // Add difficulty context
    const difficultyPrompts = {
      simple: "Create a simple, clean image with basic elements.",
      intermediate: "Generate a detailed image with good composition and lighting.",
      advanced: "Create a highly detailed, professional-quality image with complex elements and advanced techniques.",
      expert: "Generate an ultra-realistic, masterpiece-quality image with perfect composition, lighting, and intricate details."
    };
    
    enhancedPrompt = `${difficultyPrompts[generationOptions.difficulty]} ${enhancedPrompt}`;
    
    // Add style context
    if (generationOptions.style !== 'photorealistic') {
      enhancedPrompt += ` Style: ${generationOptions.style}.`;
    }
    
    // Add quality context
    if (generationOptions.quality === 'ultra') {
      enhancedPrompt += " Ultra high quality, 8K resolution, professional photography.";
    } else if (generationOptions.quality === 'hd') {
      enhancedPrompt += " High definition, crisp details.";
    }
    
    // Add creativity context
    if (generationOptions.creativity > 7) {
      enhancedPrompt += " Be highly creative and imaginative.";
    } else if (generationOptions.creativity < 4) {
      enhancedPrompt += " Keep it realistic and conventional.";
    }
    
    return enhancedPrompt;
  };

  const handleSendMessage = async (text: string, files: File[]) => {
    // Build enhanced prompt with options
    const enhancedText = buildEnhancedPrompt(text);
    
    // Optimistic update
    const userImages = files.map(file => URL.createObjectURL(file));
    const newMessages: Message[] = [...messages, { role: 'user', content: text, images: userImages }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', enhancedText);
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Add generation options
      formData.append('options', JSON.stringify(generationOptions));

      // Add session ID if we have one
      if (sessionId) {
        formData.append('session_id', sessionId);
      }

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await response.json();

      // Store session ID from response
      if (data.session_id) {
        setSessionId(data.session_id);
        console.log('Session ID:', data.session_id);
      }

      let modelText = "";
      const modelImages: string[] = [];

      if (data.parts) {
        data.parts.forEach((part: any) => {
          if (part.type === 'text') {
            modelText += part.content;
          } else if (part.type === 'image') {
            modelImages.push(part.content);
          }
        });
      }

      setMessages((prev) => [
        ...prev,
        { role: 'model', content: modelText, images: modelImages },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdvancedMode) {
    return (
      <AdvancedInterface
        messages={messages}
        isLoading={isLoading}
        sessionId={sessionId}
        generationOptions={generationOptions}
        onSendMessage={handleSendMessage}
        onStartNewChat={startNewChat}
        onOptionsChange={setGenerationOptions}
        onModeToggle={() => setIsAdvancedMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 text-white font-sans selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>
      
      {/* Header */}
      <header className="relative px-6 py-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25 animate-pulse">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl blur opacity-30 animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-200 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Neural Canvas Pro
            </h1>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              AI-Powered Creative Studio
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <button
            onClick={() => setIsAdvancedMode(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 transition-all duration-300 hover:scale-105"
          >
            <Layers className="w-4 h-4" />
            <span className="text-sm font-medium">Advanced</span>
          </button>
          
          {/* Options Toggle */}
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`p-2.5 rounded-xl transition-all duration-300 ${showOptions 
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {sessionId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-300 font-medium">Live Session</span>
            </div>
          )}
          
          <button
            onClick={startNewChat}
            className="px-4 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all duration-300 hover:scale-105"
          >
            + New Canvas
          </button>
        </div>
      </header>

      {/* Options Panel */}
      {showOptions && (
        <div className="relative border-b border-white/10 bg-slate-950/90 backdrop-blur-xl p-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Difficulty
                </label>
                <select
                  value={generationOptions.difficulty}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="simple">Simple</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {/* Style */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Style
                </label>
                <select
                  value={generationOptions.style}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="photorealistic">Photorealistic</option>
                  <option value="artistic">Artistic</option>
                  <option value="anime">Anime</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="vintage">Vintage</option>
                </select>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Quality</label>
                <select
                  value={generationOptions.quality}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Aspect Ratio</label>
                <select
                  value={generationOptions.aspectRatio}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, aspectRatio: e.target.value }))}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="16:9">Landscape (16:9)</option>
                  <option value="9:16">Portrait (9:16)</option>
                  <option value="4:3">Classic (4:3)</option>
                </select>
              </div>

              {/* Creativity */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">
                  Creativity: {generationOptions.creativity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={generationOptions.creativity}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, creativity: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Iterations */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Iterations</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={generationOptions.iterations}
                  onChange={(e) => setGenerationOptions(prev => ({ ...prev, iterations: parseInt(e.target.value) }))}
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-cyan-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="relative flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-slate-800 via-purple-900/50 to-slate-800 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm">
                <div className="relative">
                  <Sparkles className="w-16 h-16 text-cyan-400 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-bounce">
                🎨
              </div>
            </div>
            
            <div className="max-w-lg space-y-4">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-200 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Neural Canvas Awaits
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Transform your imagination into stunning visuals. Upload references, describe your vision, or explore AI-generated masterpieces.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              <button
                onClick={() => handleSendMessage("Create a futuristic cyberpunk cityscape with neon lights and flying vehicles", [])}
                className="group p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 hover:from-purple-800/40 hover:to-pink-800/40 border border-purple-500/30 rounded-2xl text-left transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🌃</span>
                  <span className="font-semibold text-purple-300">Cyberpunk City</span>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-300">Futuristic urban landscapes</p>
              </button>
              
              <button
                onClick={() => handleSendMessage("Generate a mystical forest with glowing mushrooms and magical creatures", [])}
                className="group p-6 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 hover:from-emerald-800/40 hover:to-teal-800/40 border border-emerald-500/30 rounded-2xl text-left transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🧚‍♀️</span>
                  <span className="font-semibold text-emerald-300">Mystical Forest</span>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-300">Enchanted nature scenes</p>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageItem key={idx} role={msg.role} content={msg.content} images={msg.images} />
        ))}

        {isLoading && (
          <div className="flex justify-start w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gradient-to-r from-slate-900/80 to-purple-900/40 border border-purple-500/30 p-6 rounded-2xl rounded-bl-none max-w-[80%] flex items-center gap-4 backdrop-blur-sm">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-gray-300 font-medium">Creating your masterpiece...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="relative bg-slate-950/80 backdrop-blur-xl border-t border-white/10 p-4 md:p-6">
        <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}

