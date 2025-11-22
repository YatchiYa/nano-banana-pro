
import React, { useState } from 'react';
import { Download, Share2, Heart, Copy, Maximize2, Sparkles, User, Bot } from 'lucide-react';

interface MessageItemProps {
  role: 'user' | 'model';
  content: string;
  images?: string[];
}

export default function MessageItem({ role, content, images }: MessageItemProps) {
  const isUser = role === 'user';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `neural-canvas-${Date.now()}.png`;
    link.click();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
        <div className={`group max-w-[85%] md:max-w-[75%] relative ${isUser ? 'ml-12' : 'mr-12'}`}>
          {/* Avatar */}
          <div className={`absolute ${isUser ? '-right-10' : '-left-10'} top-0 w-8 h-8 rounded-xl flex items-center justify-center ${
            isUser 
              ? 'bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg shadow-cyan-500/25' 
              : 'bg-gradient-to-br from-slate-700 to-purple-800 shadow-lg shadow-purple-500/25'
          }`}>
            {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
          </div>

          {/* Message Bubble */}
          <div
            className={`p-5 rounded-3xl shadow-2xl backdrop-blur-sm border transition-all duration-300 group-hover:shadow-xl ${
              isUser
                ? 'bg-gradient-to-br from-cyan-600/20 via-purple-600/20 to-pink-600/20 text-cyan-50 rounded-br-lg border-cyan-500/30 shadow-cyan-500/10'
                : 'bg-gradient-to-br from-slate-800/60 via-purple-900/30 to-slate-800/60 text-gray-100 rounded-bl-lg border-white/10 shadow-purple-500/10'
            }`}
          >
            {/* Text Content */}
            {content && (
              <div className="relative">
                <div className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed break-words">
                  {content}
                </div>
                
                {/* Copy button for text */}
                {!isUser && (
                  <button
                    onClick={() => copyToClipboard(content)}
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
                    title="Copy text"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Images */}
            {images && images.length > 0 && (
              <div className={`${content ? 'mt-4' : ''}`}>
                <div className={`grid gap-3 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group/image">
                      <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-slate-800">
                        <img
                          src={img}
                          alt="Generated content"
                          className="w-full h-auto max-h-[400px] object-cover transition-all duration-300 group-hover/image:brightness-110"
                          onClick={() => setSelectedImage(img)}
                        />
                        
                        {/* Image overlay with actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-all duration-300 flex items-end p-3">
                          <div className="flex gap-2 w-full justify-between items-end">
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedImage(img);
                                }}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-colors"
                                title="View full size"
                              >
                                <Maximize2 className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(img);
                                }}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4 text-white" />
                              </button>
                            </div>
                            
                            <div className="flex gap-2">
                              <button className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-colors" title="Share">
                                <Share2 className="w-4 h-4 text-white" />
                              </button>
                              <button className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-colors" title="Like">
                                <Heart className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quality indicator */}
                        {!isUser && (
                          <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
                            <div className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span className="text-xs text-white font-medium">AI Generated</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className={`mt-2 text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-6xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full rounded-2xl border border-white/20 shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              ✕
            </button>
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-3">
              <button
                onClick={() => downloadImage(selectedImage)}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm text-white transition-colors flex items-center gap-2 font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm text-white transition-colors flex items-center gap-2 font-medium">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
