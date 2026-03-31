import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import * as Auth from 'firebase/auth';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../data/locales';
import { User, LogOut, Moon, Sun, Globe, Edit2, Check, X, Camera, Info, Wifi, MapPin, Smartphone, Server, Code, Mail, ExternalLink, Heart, Copy, ShieldCheck, FileText, CreditCard, Facebook, Linkedin, Github, MessageCircle, MessageSquare, Phone, Clock, Reply, Instagram, Twitter, Youtube, Send } from 'lucide-react';
import { UserFeedback } from '../types';

const ProfileScreen: React.FC<{ onBack: () => void; onAdmin?: () => void }> = ({ onBack, onAdmin }) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, theme, setTheme, appConfig } = useSettings();
  const strings = t[language];

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // IP Info State
  const [showIpInfo, setShowIpInfo] = useState(false);
  const [ipData, setIpData] = useState<any>(null);
  const [loadingIp, setLoadingIp] = useState(false);
  const [ipError, setIpError] = useState(false);
  
  // Developer Info State
  const [showDevDetails, setShowDevDetails] = useState(false);

  // Donation State
  const [showDonation, setShowDonation] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Feedback State
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState<'send' | 'history'>('send');
  const [feedbackForm, setFeedbackForm] = useState({
      name: user?.displayName || '',
      email: user?.email || '',
      phone: '',
      message: ''
  });
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<UserFeedback[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Legal Modal State
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // Admin Check
  const isAdmin = user?.email && appConfig.adminEmails.includes(user.email);

  // Cloudinary Configuration
  const CLOUD_NAME = "dkd5jmq2d";
  const UPLOAD_PRESET = "Ramadan Buddy"; 

  const handleSaveName = async () => {
    if (!user || !newName.trim()) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      await Auth.updateProfile(user, { displayName: newName });
      setMessage({ type: 'success', text: strings.updateSuccess });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: strings.authError });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setMessage(null);

    try {
      // Create FormData for Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET); 

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, 
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Cloudinary Error:", data);
        throw new Error(data.error?.message || 'Upload failed');
      }
      
      // Update Firebase Auth Profile with Cloudinary URL using modular SDK
      await Auth.updateProfile(user, { photoURL: data.secure_url });
      
      setMessage({ type: 'success', text: strings.photoUpdateSuccess });
    } catch (error: any) {
      console.error("Upload error:", error);
      setMessage({ type: 'error', text: error.message || strings.photoUpdateError });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (!isUploading && !user?.isAnonymous) {
        fileInputRef.current?.click();
    }
  };

  const handleSendFeedback = async () => {
      if (!feedbackForm.message.trim()) {
          alert("Please describe your problem or feedback.");
          return;
      }
      setIsSendingFeedback(true);
      try {
          await addDoc(collection(db, "feedback"), {
              userId: user?.uid || 'anonymous',
              name: feedbackForm.name,
              email: feedbackForm.email,
              phone: feedbackForm.phone,
              message: feedbackForm.message,
              createdAt: new Date().toISOString(),
              read: false
          });
          setFeedbackForm({ name: user?.displayName || '', email: user?.email || '', phone: '', message: '' });
          alert('Feedback sent successfully! Check history for replies.');
          setFeedbackTab('history'); // Switch to history to show it
          fetchFeedbackHistory();
      } catch (error) {
          console.error("Feedback error:", error);
          alert("Failed to send feedback. Check internet connection.");
      } finally {
          setIsSendingFeedback(false);
      }
  };

  const fetchFeedbackHistory = async () => {
      if (!user) return;
      setLoadingHistory(true);
      try {
          // Removed orderBy("createdAt") to avoid "Missing Index" error.
          // Sorting is done client-side below.
          const q = query(
              collection(db, "feedback"), 
              where("userId", "==", user.uid)
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as UserFeedback));
          
          // Client-side Sort: Newest First
          data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setMyFeedbacks(data);
      } catch (e) {
          console.error("History fetch error:", e);
      } finally {
          setLoadingHistory(false);
      }
  };

  // Fetch history when tab changes
  useEffect(() => {
      if (showFeedback && feedbackTab === 'history') {
          fetchFeedbackHistory();
      }
  }, [showFeedback, feedbackTab]);

  const fetchIpInfo = async () => {
    setShowIpInfo(true);
    // Remove early return to allow refreshing
    // if (ipData) return; 
    
    setLoadingIp(true);
    setIpError(false);

    const tryPrimary = async () => {
      const response = await fetch('https://ipwho.is/');
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to retrieve IP data");
      return {
        ip: data.ip,
        org: data.connection?.isp || data.connection?.org || 'N/A',
        country_name: data.country,
        city: data.city,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
        userAgent: navigator.userAgent
      };
    };

    const trySecondary = async () => {
       const response = await fetch('https://ipapi.co/json/');
       if (!response.ok) throw new Error("Secondary API failed");
       const data = await response.json();
       if (data.error) throw new Error("Secondary API Error");
       return {
         ip: data.ip,
         org: data.org || 'N/A',
         country_name: data.country_name,
         city: data.city,
         region: data.region,
         latitude: data.latitude,
         longitude: data.longitude,
         userAgent: navigator.userAgent
       };
    };

    try {
      let finalData;
      try {
        finalData = await tryPrimary();
      } catch (e) {
        console.warn("Primary IP API failed, using fallback...", e);
        finalData = await trySecondary();
      }
      setIpData(finalData);
    } catch (error) {
      console.error("Failed to fetch IP info from all sources", error);
      setIpError(true);
    } finally {
      setLoadingIp(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to get icon for social links
  const getSocialIcon = (label: string) => {
      const l = label.toLowerCase();
      if (l.includes('facebook')) return <Facebook size={18} className="text-blue-600" />;
      if (l.includes('linkedin')) return <Linkedin size={18} className="text-blue-700" />;
      if (l.includes('github')) return <Github size={18} className="text-gray-800 dark:text-white" />;
      if (l.includes('whatsapp')) return <MessageCircle size={18} className="text-green-500" />;
      if (l.includes('instagram')) return <Instagram size={18} className="text-pink-600" />;
      if (l.includes('twitter') || l.includes('x.com')) return <Twitter size={18} className="text-sky-500" />;
      if (l.includes('youtube')) return <Youtube size={18} className="text-red-600" />;
      if (l.includes('telegram')) return <Send size={18} className="text-sky-500" />; 
      if (l.includes('web') || l.includes('site')) return <Globe size={18} className="text-emerald-500" />;
      return <ExternalLink size={18} className="text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-0 md:flex-1 bg-white dark:bg-gray-950 flex flex-col animate-in slide-in-from-right duration-300 md:animate-none">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
        <button onClick={onBack} className="text-gray-500 font-medium">← Back</button>
        <h1 className="font-bold text-lg text-gray-800 dark:text-white">{strings.profile}</h1>
        
        {/* Theme Toggle Button in Header */}
        <button 
           onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
           className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
           {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        
        {/* User Card */}
        <div className="flex flex-col items-center mb-4">
          
          {/* Profile Image & Upload */}
          <div 
            className="relative mb-3 group cursor-pointer"
            onClick={triggerFileInput}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md overflow-hidden bg-emerald-100 dark:bg-emerald-900 ${isUploading ? 'opacity-50' : ''}`}>
               {user?.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User size={32} className="text-emerald-600 dark:text-emerald-400" />
               )}
            </div>
            
            {!user?.isAnonymous && (
              <div className="absolute bottom-0 right-0 bg-emerald-600 p-1.5 rounded-full border-2 border-white dark:border-gray-900 shadow-sm z-10">
                <Camera size={12} className="text-white" />
              </div>
            )}
            
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          
          {/* Name & Edit */}
          <div className="flex items-center gap-2 mb-1 justify-center w-full">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-center font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 w-36 text-sm"
                  autoFocus
                />
                <button 
                  onClick={handleSaveName} 
                  disabled={isLoading}
                  className="p-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200"
                >
                  <Check size={14} />
                </button>
                <button 
                  onClick={() => { setIsEditing(false); setNewName(user?.displayName || ''); }}
                  className="p-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                   {user?.displayName || (user?.isAnonymous ? 'Guest User' : 'User')}
                </h2>
                {!user?.isAnonymous && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || (user?.isAnonymous ? 'Anonymous' : '')}</p>

          {message && (
             <p className={`text-xs mt-2 font-medium ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
               {message.text}
             </p>
          )}
        </div>

        {/* ADMIN CONTROL BUTTON */}
        {isAdmin && (
          <button 
            onClick={onAdmin}
            className="w-full mb-4 flex items-center justify-between p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 group"
          >
             <div className="flex items-center gap-3">
               <ShieldCheck size={20} className="text-emerald-400 dark:text-emerald-600" />
               <div className="text-left">
                  <h3 className="font-bold text-base">{strings.adminControl}</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Manage App Settings</p>
               </div>
             </div>
             <div className="bg-gray-800 dark:bg-gray-100 p-1.5 rounded-full group-hover:bg-gray-700 dark:group-hover:bg-gray-200 transition-colors">
               <ExternalLink size={16} />
             </div>
          </button>
        )}
 
        {/* Settings Section */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 space-y-3 mb-4">
           {/* Language */}
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Globe className="text-gray-400" size={18} />
               <span className="text-xs text-gray-700 dark:text-gray-200">{strings.language}</span>
             </div>
             <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-100 dark:border-gray-700">
               <button 
                 onClick={() => setLanguage('bn')}
                 className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${language === 'bn' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400'}`}
               >
                 বাংলা
               </button>
               <button 
                 onClick={() => setLanguage('en')}
                 className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${language === 'en' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400'}`}
               >
                 EN
               </button>
             </div>
           </div>
           
           {/* IP Info Button */}
           <div className="flex items-center justify-between cursor-pointer" onClick={fetchIpInfo}>
             <div className="flex items-center gap-3">
               <Info className="text-gray-400" size={18} />
               <span className="text-xs text-gray-700 dark:text-gray-200">{strings.ipInfo}</span>
             </div>
             <div className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-300">
               <Wifi size={16} />
             </div>
           </div>
        </div>
 
        {/* About Section */}
        <div className="mt-6 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
            <h3 className="px-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {strings.about}
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                
                {/* Donation Option */}
                {appConfig.donation.enabled && (
                  <div 
                     onClick={() => setShowDonation(true)}
                     className="p-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                      <div className="flex items-center gap-3">
                          <Heart size={16} className="text-rose-500 fill-current" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{strings.donate}</span>
                      </div>
                      <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/30">
                          Support Us
                      </span>
                  </div>
                )}
 
                {/* Feedback Option */}
                <div 
                   onClick={() => setShowFeedback(true)}
                   className="p-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <MessageSquare size={16} className="text-blue-500" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Feedback & Support</span>
                    </div>
                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                        Contact Admin
                    </span>
                </div>
 
                <div className="p-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{strings.version}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-mono">v{appConfig.version}</span>
                </div>
                <div 
                   className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                   onClick={() => setShowDevDetails(true)}
                >
                    <span className="text-xs text-gray-600 dark:text-gray-300">{strings.developer}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{appConfig.developer.name}</span>
                        <Code size={12} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-6">
                <button 
                  onClick={() => setActiveLegalModal('privacy')}
                  className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {strings.privacyPolicy}
                </button>
                <button 
                  onClick={() => setActiveLegalModal('terms')}
                  className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {strings.terms}
                </button>
            </div>
            
            <p className="text-[10px] text-center text-gray-300 dark:text-gray-600 mt-6">
              {appConfig.legal?.copyrightText || `© ${new Date().getFullYear()} ${strings.appName}. All rights reserved.`}
            </p>
        </div>

        {/* Logout Button (Moved to Bottom) */}
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-2.5 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors mt-6 text-sm"
        >
          <LogOut size={16} />
          {strings.signOut}
        </button>
        <div className="h-6"></div> 

      </div>

      {/* FEEDBACK MODAL */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm h-[70vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-white/10">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <MessageSquare size={20} className="text-blue-500" /> Feedback
                    </h2>
                    <button onClick={() => setShowFeedback(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500"><X size={18} /></button>
                </div>

                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button onClick={() => setFeedbackTab('send')} className={`flex-1 py-3 text-sm font-bold ${feedbackTab === 'send' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-500'}`}>Send New</button>
                    <button onClick={() => setFeedbackTab('history')} className={`flex-1 py-3 text-sm font-bold ${feedbackTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-500'}`}>My History</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                    {feedbackTab === 'send' ? (
                        <div className="space-y-3">
                            <input type="text" className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={feedbackForm.name} onChange={(e) => setFeedbackForm({...feedbackForm, name: e.target.value})} placeholder="Your Name" />
                            <input type="tel" className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={feedbackForm.phone} onChange={(e) => setFeedbackForm({...feedbackForm, phone: e.target.value})} placeholder="Phone Number" />
                            <input type="email" className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={feedbackForm.email} onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})} placeholder="Email" />
                            <textarea rows={3} className="w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={feedbackForm.message} onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})} placeholder="Describe your issue..." />
                            <button onClick={handleSendFeedback} disabled={isSendingFeedback} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 mt-2">{isSendingFeedback ? 'Sending...' : 'Send Feedback'}</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {loadingHistory ? <div className="text-center text-gray-400 py-4">Loading...</div> : myFeedbacks.length === 0 ? <div className="text-center text-gray-400 py-4">No history yet.</div> : (
                                myFeedbacks.map(item => (
                                    <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.reply ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{item.reply ? 'REPLIED' : 'SENT'}</span>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {new Date(item.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">{item.message}</p>
                                        {item.reply && (
                                            <div className="mt-2 pl-3 border-l-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-r-lg">
                                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1"><Reply size={10} /> Admin Response</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{item.reply}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* IP Info Modal */}
      {showIpInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-white/10 max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setShowIpInfo(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-400">
                <Wifi size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {strings.networkDetails}
              </h2>
            </div>

            {loadingIp ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-sm text-gray-500">{strings.loading}</p>
              </div>
            ) : ipError ? (
                <div className="text-center py-8">
                    <p className="text-red-500 text-sm font-medium mb-2">Network Error</p>
                    <p className="text-gray-500 text-xs">{strings.networkError}</p>
                    <button 
                        onClick={fetchIpInfo}
                        className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-200"
                    >
                        Try Again
                    </button>
                </div>
            ) : ipData ? (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                   <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
                     <Wifi size={12} /> {strings.ip}
                   </div>
                   <p className="font-mono text-lg font-bold text-gray-800 dark:text-white break-all">{ipData.ip}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
                      <Server size={12} /> {strings.isp}
                    </div>
                    <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{ipData.org}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
                      <Globe size={12} /> {strings.country}
                    </div>
                    <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{ipData.country_name}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                   <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
                     <MapPin size={12} /> {strings.coordinates} ({strings.city})
                   </div>
                   <p className="font-mono text-sm font-bold text-gray-800 dark:text-white">
                      {ipData.latitude}, {ipData.longitude}
                   </p>
                   <p className="text-xs text-gray-500 mt-1">{ipData.city}, {ipData.region}</p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                   <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
                     <Smartphone size={12} /> {strings.device}
                   </div>
                   <p className="text-xs text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                     {ipData.userAgent}
                   </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-red-500 text-sm">
                No data available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Developer Details Modal */}
      {showDevDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden">
                <button 
                  onClick={() => setShowDevDetails(false)}
                  className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors z-10"
                >
                  <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center mt-2">
                    {/* Developer Image */}
                    {appConfig.developer.image ? (
                        <div className="w-24 h-24 rounded-full border-4 border-emerald-100 dark:border-emerald-900 shadow-md overflow-hidden mb-4">
                            <img src={appConfig.developer.image} alt={appConfig.developer.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full text-emerald-600 dark:text-emerald-400 mb-4">
                            <Code size={32} />
                        </div>
                    )}
                    
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                        {strings.aboutDeveloper}
                    </h2>
                    <h3 className="text-emerald-600 dark:text-emerald-400 font-bold text-lg mb-4">
                        {appConfig.developer.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        {appConfig.developer.mission}
                    </p>

                    <div className="w-full space-y-3 max-h-[200px] overflow-y-auto pr-1">
                        {appConfig.developer.showEmail && (
                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                <Mail size={18} className="text-gray-400" />
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">{strings.emailLabel}</p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{appConfig.developer.email}</p>
                                </div>
                            </div>
                        )}

                        {appConfig.developer.showWebsite && (
                            <a 
                               href={appConfig.developer.website.startsWith('http') ? appConfig.developer.website : `https://${appConfig.developer.website}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                            >
                                <Globe size={18} className="text-gray-400" />
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">{strings.websiteLabel}</p>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {appConfig.developer.website}
                                    </p>
                                </div>
                                <ExternalLink size={14} className="text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                            </a>
                        )}

                        {/* Dynamic Social Links */}
                        {(appConfig.developer.socialLinks || []).map(link => {
                            // Fix: Ensure URL has protocol
                            const safeUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                            return (
                                <a 
                                key={link.id}
                                href={safeUrl}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                                >
                                    {getSocialIcon(link.label)}
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 dark:text-gray-200 font-bold truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {link.label}
                                        </p>
                                    </div>
                                    <ExternalLink size={14} className="text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Donation Modal (DYNAMIC) */}
      {showDonation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-white/10">
                <button 
                  onClick={() => setShowDonation(false)}
                  className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="bg-rose-100 dark:bg-rose-900/30 p-4 rounded-full text-rose-600 dark:text-rose-400 mb-4">
                        <Heart size={32} className="fill-current" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {appConfig.donation.title}
                    </h2>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                        {appConfig.donation.description}
                    </p>

                    <div className="w-full space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {(appConfig.donation.methods || []).map((method) => (
                           <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden">
                                    {method.logoUrl ? (
                                        <img src={method.logoUrl} alt={method.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-sm font-bold text-gray-600 dark:text-gray-300">{method.name.charAt(0)}</div>
                                    )}
                                 </div>
                                 <div className="text-left">
                                    <p className="font-bold text-gray-800 dark:text-white text-sm">{method.name}</p>
                                    <p className="text-[10px] text-gray-500">Tap copy button</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="font-mono font-medium text-gray-700 dark:text-gray-300 text-sm select-all">{method.number}</span>
                                 <button 
                                   onClick={() => copyToClipboard(method.number, method.id)}
                                   className="p-1.5 bg-white dark:bg-gray-700 rounded-md text-gray-500 hover:text-emerald-600 transition-colors border border-gray-200 dark:border-gray-600"
                                 >
                                   {copiedIndex === method.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                 </button>
                              </div>
                           </div>
                        ))}
                        
                        {(!appConfig.donation.methods || appConfig.donation.methods.length === 0) && (
                            <p className="text-xs text-gray-400 py-4">No payment methods available yet.</p>
                        )}
                    </div>

                    <p className="text-[10px] text-gray-400 mt-4">
                       JazakAllah Khair for your support.
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* LEGAL MODAL (Privacy & Terms) */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-white/10 max-h-[85vh] relative">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
                 <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FileText size={20} className="text-emerald-600" />
                    {activeLegalModal === 'privacy' ? strings.privacyPolicy : strings.terms}
                 </h2>
                 <button 
                   onClick={() => setActiveLegalModal(null)}
                   className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>
              <div className="p-6 overflow-y-auto">
                  <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {activeLegalModal === 'privacy' 
                         ? (appConfig.legal?.privacyPolicyText || "Privacy Policy not available.") 
                         : (appConfig.legal?.termsText || "Terms & Conditions not available.")
                      }
                  </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default ProfileScreen;