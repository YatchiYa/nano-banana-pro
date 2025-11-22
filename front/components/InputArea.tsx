import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, X, Paperclip, Wand2, Sparkles } from 'lucide-react';

interface InputAreaProps {
    onSendMessage: (message: string, files: File[]) => void;
    isLoading: boolean;
}

export default function InputArea({ onSendMessage, isLoading }: InputAreaProps) {
    const [message, setMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!message.trim() && selectedFiles.length === 0) || isLoading) return;

        onSendMessage(message, selectedFiles);
        setMessage('');
        setSelectedFiles([]);
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* File Previews */}
            {selectedFiles.length > 0 && (
                <div className="flex gap-4 mb-6 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-purple-500/30">
                    {selectedFiles.map((file, idx) => (
                        <div key={idx} className="relative group shrink-0 animate-in zoom-in duration-300">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/20 bg-slate-800 shadow-xl backdrop-blur-sm">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="preview"
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"
                                />
                            </div>
                            <button
                                onClick={() => removeFile(idx)}
                                className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full p-1.5 shadow-lg hover:shadow-red-500/40 transition-all transform hover:scale-110 active:scale-95"
                            >
                                <X size={14} />
                            </button>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-end p-2">
                                <span className="text-xs text-white font-medium truncate">{file.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-end gap-4 bg-gradient-to-r from-slate-900/90 via-purple-900/20 to-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl focus-within:border-cyan-500/50 focus-within:shadow-cyan-500/20 transition-all duration-300">
                    {/* Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="group p-3 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-2xl transition-all duration-300 active:scale-95 border border-white/5 hover:border-cyan-500/30"
                        disabled={isLoading}
                        title="Upload Reference Images"
                    >
                        <ImageIcon size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                    
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                        accept="image/*"
                    />

                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe your creative vision... Be as detailed as you want!"
                            className="w-full bg-transparent text-white placeholder-gray-400 p-4 max-h-40 min-h-[60px] resize-none focus:outline-none text-base leading-relaxed border border-white/5 rounded-2xl focus:border-cyan-500/30 transition-colors"
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        
                        {/* Character count or AI suggestions */}
                        {message.length > 0 && (
                            <div className="absolute bottom-2 right-3 text-xs text-gray-500">
                                {message.length} chars
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <button
                        type="submit"
                        disabled={(!message.trim() && selectedFiles.length === 0) || isLoading}
                        className={`group relative px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-3 font-medium ${
                            (!message.trim() && selectedFiles.length === 0) || isLoading
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                                : 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 active:scale-95 border border-purple-400/30'
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
                                <Wand2 size={20} className="group-hover:rotate-12 transition-transform" />
                                <span>Generate</span>
                                <Sparkles size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                            </>
                        )}
                        
                        {/* Animated background */}
                        {!isLoading && (
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity -z-10"></div>
                        )}
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between mt-4 px-2">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMessage("Create a photorealistic portrait of ")}
                            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-all"
                        >
                            Portrait
                        </button>
                        <button
                            type="button"
                            onClick={() => setMessage("Generate a landscape scene with ")}
                            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-all"
                        >
                            Landscape
                        </button>
                        <button
                            type="button"
                            onClick={() => setMessage("Design a futuristic ")}
                            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-all"
                        >
                            Futuristic
                        </button>
                    </div>
                    
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Sparkles size={12} />
                        Press Enter to generate
                    </div>
                </div>
            </form>
        </div>
    );
}
