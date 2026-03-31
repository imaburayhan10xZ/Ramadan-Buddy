import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check, Sparkles, RefreshCw, Trash2, ArrowDown, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createChatSession, checkRateLimit, incrementRequestCount } from '../services/ai';
import { ChatMessage } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../data/locales';

const ChatScreen: React.FC = () => {
  const { language, appConfig } = useSettings();
  const { user } = useAuth();
  const strings = t[language];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    chatSessionRef.current = createChatSession(appConfig);
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: strings.chat.welcome,
          timestamp: Date.now()
        }
      ]);
    }
  }, [language, appConfig]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  const handleSend = async (textInput: string = input) => {
    if (!textInput.trim() || isLoading) return;

    // Check rate limit
    const { allowed } = await checkRateLimit();
    if (!allowed) {
      const limitMessage = language === 'bn' 
        ? '⚠️ দুঃখিত, আপনি আজকের জন্য আপনার ৮টি এআই অনুরোধের সীমা অতিক্রম করেছেন। আগামীকাল আবার চেষ্টা করুন।' 
        : '⚠️ Sorry, you have reached your limit of 8 AI requests for today. Please try again tomorrow.';
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: limitMessage,
        timestamp: Date.now()
      }]);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textInput,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Increment count
      await incrementRequestCount();

      const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      const botMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '', 
        timestamp: Date.now()
      }]);

      let fullText = '';
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId ? { ...msg, text: fullText } : msg
          ));
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = language === 'bn' ? 'দুঃখিত, একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন।' : 'Sorry, something went wrong. Please try again.';

      // Robust check for Quota Exceeded (429)
      const errString = JSON.stringify(error || {});
      const isQuotaError = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.error?.code === 429 ||
        error?.error?.status === 'RESOURCE_EXHAUSTED' ||
        errString.includes('RESOURCE_EXHAUSTED') ||
        errString.includes('"code":429');

      if (isQuotaError) {
         errorMessage = language === 'bn' 
           ? '⚠️ দুঃখিত, আজকের মতো AI কোটা শেষ হয়ে গেছে। দয়া করে কিছুক্ষণ পর বা কাল আবার চেষ্টা করুন।' 
           : '⚠️ Sorry, daily AI quota exceeded. Please try again later or tomorrow.';
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: errorMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearHistory = () => {
    if(window.confirm('Clear all chat history?')) {
      setMessages([{
        id: Date.now().toString(),
        role: 'model',
        text: strings.chat.welcome,
        timestamp: Date.now()
      }]);
      chatSessionRef.current = createChatSession(appConfig); // Reset context
    }
  };

  // Advanced Markdown Parser
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, i) => (
      <p key={i} className={`min-h-[1em] ${i > 0 ? 'mt-2' : ''} leading-7`}>
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    ));
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[20%] left-[-10%] w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Modern Header */}
      <header className="z-30 flex items-center justify-between px-5 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 dark:text-white text-base leading-tight">
              {strings.aiTitle}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Gemini 2.0 Flash • Online
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={clearHistory}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95"
            title="Clear History"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => chatSessionRef.current = createChatSession(appConfig)}
            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all active:scale-95"
            title="Reset Context"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 z-10 scroll-smooth space-y-6 no-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            
            return (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[85%] md:max-w-[70%] gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 
                    ${isUser 
                      ? 'bg-slate-200 dark:bg-slate-800 overflow-hidden' 
                      : 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50'
                    }`}
                  >
                    {isUser ? (
                      user?.photoURL ? (
                        <img src={user.photoURL} alt="Me" className="w-full h-full object-cover" />
                      ) : (
                        <User size={14} className="text-slate-500" />
                      )
                    ) : (
                      <Bot size={16} className="text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div className="group relative flex flex-col">
                    <div className={`px-4 py-3 shadow-sm text-sm transition-all duration-300
                      ${isUser 
                        ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-none' 
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      {renderMessageContent(msg.text)}
                    </div>

                    {/* Timestamp & Actions */}
                    <div className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-slate-400 opacity-60 font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {!isUser && msg.text && (
                        <button 
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className={`text-[10px] flex items-center gap-1 transition-all ${copiedId === msg.id ? 'text-emerald-500 font-bold' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-emerald-500'}`}
                        >
                          {copiedId === msg.id ? <Check size={10} /> : <Copy size={10} />}
                          {copiedId === msg.id ? strings.chat.copied : strings.chat.copy}
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-start items-center gap-2.5 pl-1"
          >
             <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center shadow-sm">
                <Bot size={16} className="text-emerald-600 dark:text-emerald-400" />
             </div>
             <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
               <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
             </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-28 right-6 z-40 p-2.5 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all active:scale-90"
          >
            <ArrowDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Docked Input Area */}
      <div className="z-20 px-4 pb-[72px] md:pb-6 pt-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50">
        
        {/* Suggestion Chips */}
        {messages.length < 5 && (
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            {strings.chat.suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug)}
                disabled={isLoading}
                className="flex-shrink-0 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles size={10} className="text-emerald-500" /> {sug}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-3xl border border-slate-200 dark:border-slate-700 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={strings.typeMessage}
            rows={1}
            className="w-full bg-transparent text-slate-800 dark:text-white border-0 px-4 py-3 text-sm focus:ring-0 outline-none resize-none max-h-32 min-h-[44px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-all active:scale-95 shadow-md shadow-emerald-500/20 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send size={18} className={input.trim() ? 'translate-x-0.5' : ''} />
            )}
          </button>
        </div>
        
        <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 mt-2 font-medium uppercase tracking-widest">
           Powered by Google Gemini AI
        </p>
      </div>

    </div>
  );
};

export default ChatScreen;
