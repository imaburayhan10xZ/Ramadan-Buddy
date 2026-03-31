import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import * as Auth from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../data/locales';
import { Lock, AlertCircle, User, Calculator, ArrowLeft, Mail, Star, Sparkles, Moon, LogIn, ShieldAlert, Ban, MessageSquare, Send } from 'lucide-react';
import { UserStatus } from '../types';

const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPass, setShowForgotPass] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Captcha State
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaInput, setCaptchaInput] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Blocked/Suspended State
  const [blockedState, setBlockedState] = useState<{ status: UserStatus, reason: string, uid: string } | null>(null);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealForm, setAppealForm] = useState({ message: '', phone: '' });
  const [isSendingAppeal, setIsSendingAppeal] = useState(false);

  const { loginGuest } = useAuth();
  const { language, appConfig } = useSettings();
  const strings = t[language];

  // Initialize Captcha
  useEffect(() => {
    generateCaptcha();
  }, [isLogin]);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1; // 1-10
    const b = Math.floor(Math.random() * 10) + 1; // 1-10
    setCaptcha({ a, b });
    setCaptchaInput('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    // Additional validation for Sign Up
    if (!isLogin) {
      if (!name) {
        setError(strings.name + " required");
        return;
      }

      // Captcha Validation
      const expected = captcha.a + captcha.b;
      if (parseInt(captchaInput) !== expected) {
        setError(strings.wrongCaptcha);
        generateCaptcha(); // Regenerate on failure
        return;
      }
    }

    setError('');
    setIsLoading(true);

    try {
      let userUid = '';

      if (isLogin) {
        const userCredential = await Auth.signInWithEmailAndPassword(auth, email, password);
        userUid = userCredential.user.uid;
      } else {
        // Sign Up Flow
        const userCredential = await Auth.createUserWithEmailAndPassword(auth, email, password);
        userUid = userCredential.user.uid;
        
        // Update Profile with Name (Modular)
        if (userCredential.user) {
            await Auth.updateProfile(userCredential.user, {
              displayName: name
            });
        }

        // Initialize user doc with Active status
        await setDoc(doc(db, "users", userUid), {
            uid: userUid,
            email: email,
            displayName: name,
            createdAt: new Date().toISOString(),
            status: 'active',
            isAnonymous: false
        }, { merge: true });
      }

      // CHECK USER STATUS IN FIRESTORE
      const userDoc = await getDoc(doc(db, "users", userUid));
      if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.status === 'disabled' || userData.status === 'suspended') {
              setBlockedState({
                  status: userData.status,
                  reason: userData.statusReason || 'Violation of terms',
                  uid: userUid
              });
              // Force Sign Out immediately
              await Auth.signOut(auth);
              setIsLoading(false);
              return; 
          }
      }

    } catch (err: any) {
      const expectedErrors = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email', 'auth/email-already-in-use', 'auth/weak-password'];
      
      if (!expectedErrors.includes(err.code)) {
        console.error(err);
      }
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-email') {
        setError(strings.wrongCredentials);
      } else if (err.code === 'auth/email-already-in-use') {
        setError(strings.emailInUse);
      } else if (err.code === 'auth/weak-password') {
         setError(strings.weakPassword);
      } else if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("network"))) {
        setError(strings.networkError);
      } else {
        setError(strings.authError);
      }
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(strings.email + " required");
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await Auth.sendPasswordResetEmail(auth, email);
      setSuccessMsg(strings.resetEmailSent);
      setEmail(''); 
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError(strings.emailNotRegistered);
      } else {
        console.error(err);
        setError(strings.authError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginGuest();
    } catch (err: any) {
      console.error("Guest login error details:", err);
      if (err.code === 'auth/admin-restricted-operation') {
         setError(strings.guestLoginDisabled || "Guest login is disabled on the server.");
      } else if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("network"))) {
        setError(strings.networkError);
      } else {
        setError(strings.authError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAppeal = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!blockedState) return;
      
      setIsSendingAppeal(true);
      try {
          await addDoc(collection(db, "feedback"), {
              userId: blockedState.uid,
              name: name || email, // Fallback
              email: email,
              phone: appealForm.phone,
              message: `[SUSPENSION APPEAL] ${appealForm.message}`,
              createdAt: new Date().toISOString(),
              read: false,
              type: 'appeal'
          });
          setShowAppealModal(false);
          alert('Review request sent successfully. Please check your email later.');
          setBlockedState(null); // Return to login
          setEmail('');
          setPassword('');
      } catch (e) {
          console.error(e);
          alert('Failed to send request.');
      } finally {
          setIsSendingAppeal(false);
      }
  };

  // --- BLOCKED / SUSPENDED VIEW ---
  if (blockedState) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
             {/* Appeal Modal */}
             {showAppealModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-800">Request Review</h3>
                            <button onClick={() => setShowAppealModal(false)}><ArrowLeft size={20} /></button>
                        </div>
                        <form onSubmit={handleSendAppeal} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Email (Registered)</label>
                                <input type="email" value={email} disabled className="w-full bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm text-gray-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Phone Number</label>
                                <input type="tel" required value={appealForm.phone} onChange={e => setAppealForm({...appealForm, phone: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="017..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Reason for Appeal</label>
                                <textarea required rows={4} value={appealForm.message} onChange={e => setAppealForm({...appealForm, message: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Why should we reactivate your account?" />
                            </div>
                            <button type="submit" disabled={isSendingAppeal} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">{isSendingAppeal ? 'Sending...' : 'Submit Request'}</button>
                        </form>
                    </div>
                </div>
             )}

             <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95">
                 <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${blockedState.status === 'disabled' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                     {blockedState.status === 'disabled' ? <Ban size={40} /> : <ShieldAlert size={40} />}
                 </div>
                 
                 <h2 className="text-2xl font-bold text-gray-900 mb-2 capitalize">
                     Account {blockedState.status}
                 </h2>
                 
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-left">
                     <p className="text-xs font-bold text-gray-500 uppercase mb-1">Reason:</p>
                     <p className="text-sm text-gray-800 font-medium">{blockedState.reason}</p>
                 </div>

                 {blockedState.status === 'suspended' ? (
                     <div className="space-y-3">
                         <button 
                            onClick={() => setShowAppealModal(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                         >
                             <MessageSquare size={18} /> Request Review
                         </button>
                         <button 
                            onClick={() => setBlockedState(null)}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold"
                         >
                             Back to Login
                         </button>
                     </div>
                 ) : (
                     <div>
                         <p className="text-xs text-red-500 mb-6">This action is permanent. You cannot login with this account anymore.</p>
                         <button 
                            onClick={() => setBlockedState(null)}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold"
                         >
                             Close
                         </button>
                     </div>
                 )}
             </div>
        </div>
      );
  }

  // --- FORGOT PASSWORD VIEW ---
  if (showForgotPass) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
        {/* Bright Background Accents */}
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-100/50 rounded-full blur-[80px] z-0"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-teal-100/50 rounded-full blur-[80px] z-0"></div>

        <div className="w-full max-w-sm bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-white p-8 relative z-10 animate-in fade-in zoom-in duration-300">
          <button 
            onClick={() => { setShowForgotPass(false); setError(''); setSuccessMsg(''); }}
            className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 mb-6 transition-colors text-sm font-bold"
          >
            <ArrowLeft size={18} /> {strings.backToLogin}
          </button>

          <div className="flex justify-center mb-6">
             <div className="bg-emerald-50 p-4 rounded-full text-emerald-600 border border-emerald-100 shadow-sm">
                <Lock size={32} />
             </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {strings.resetPassword}
          </h2>
          <p className="text-center text-slate-500 text-sm mb-6">Enter your email to receive a reset link</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
              <Mail size={16} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">{strings.email}</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder-slate-400 transition-all text-sm font-medium"
                  placeholder="name@example.com"
                  required
                />
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? strings.loading : strings.sendResetLink}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- LOGIN / SIGNUP VIEW ---
  return (
    <div className="min-h-screen bg-[#F0FDF4] flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
      
      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-[0.03] z-0 pointer-events-none"></div>
      
      {/* Bright Soft Blobs */}
      <div className="absolute top-[-5%] left-[20%] w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[100px] z-0"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-teal-200/30 rounded-full blur-[100px] z-0"></div>
      
      {/* Main Card */}
      <div className="w-full max-w-sm relative z-10 bg-white/90 backdrop-blur-md rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3 group cursor-pointer">
             <div className="absolute inset-0 bg-emerald-300/30 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
             <div className="relative bg-white p-3 rounded-2xl shadow-lg border border-slate-50">
               {appConfig.appLogo ? (
                 <img src={appConfig.appLogo} alt="Logo" className="w-14 h-14 object-contain" />
               ) : (
                 <img src="/logo.png" alt="App" className="w-14 h-14 object-contain" />
               )}
             </div>
             <div className="absolute -top-2 -right-2 bg-amber-100 p-1 rounded-full border border-white shadow-sm">
                <Sparkles className="text-amber-500 fill-amber-500 animate-pulse" size={14} />
             </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {appConfig.appName}
          </h2>
          <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">Islamic Companion</p>
        </div>

        {/* Toggle Switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 relative">
           <div 
             className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white shadow-sm rounded-lg transition-all duration-300 ease-out ${isLogin ? 'left-1' : 'left-[calc(50%+2px)]'}`}
           ></div>
           <button 
             onClick={() => { setIsLogin(true); setError(''); }}
             className={`flex-1 py-2.5 text-xs font-bold text-center z-10 transition-colors ${isLogin ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
           >
             {strings.signIn}
           </button>
           <button 
             onClick={() => { setIsLogin(false); setError(''); }}
             className={`flex-1 py-2.5 text-xs font-bold text-center z-10 transition-colors ${!isLogin ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
           >
             {strings.signUp}
           </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs mb-6 flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Sign Up Name Field */}
          {!isLogin && (
            <div className="space-y-1 animate-in slide-in-from-left-4 fade-in duration-300">
              <label className="text-xs font-bold text-slate-500 ml-1">{strings.name}</label>
              <div className="relative group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all text-sm font-medium"
                  placeholder="Your Name"
                  required
                />
                <User className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">{strings.email}</label>
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all text-sm font-medium"
                placeholder="name@example.com"
                required
              />
              <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
               <label className="text-xs font-bold text-slate-500">{strings.password}</label>
               {isLogin && (
                  <button 
                    type="button"
                    onClick={() => setShowForgotPass(true)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 transition-colors font-bold"
                  >
                    {strings.forgotPassword}
                  </button>
               )}
            </div>
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all text-sm font-medium"
                placeholder="••••••••"
                required
              />
              <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            </div>
          </div>

          {/* Simple Math Captcha for Sign Up */}
          {!isLogin && (
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 animate-in slide-in-from-right-4 fade-in duration-300">
              <label className="block text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
                 <Calculator size={12} /> {strings.securityQuestion}
              </label>
              <div className="flex items-center gap-3">
                <div className="bg-white px-4 py-2 rounded-lg font-mono font-bold text-emerald-600 border border-emerald-200 shadow-sm">
                  {captcha.a} + {captcha.b} = ?
                </div>
                <input
                  type="number"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-800 placeholder-emerald-300 text-center font-bold"
                  placeholder="?"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
                <>
                    {isLogin ? strings.signIn : strings.signUp}
                    <LogIn size={18} />
                </>
            )}
          </button>
        </form>

        <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">{strings.or}</span>
            <div className="flex-grow border-t border-slate-100"></div>
        </div>

        <button 
          onClick={handleGuestLogin}
          disabled={isLoading}
          className="w-full bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-sm hover:shadow-md"
        >
          <User size={18} className="text-slate-400" />
          {strings.guestMode}
        </button>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-6 text-center text-slate-400 text-[10px] font-bold tracking-widest pointer-events-none">
         © 2026 Ramadan Buddy. All rights reserved.
      </div>
    </div>
  );
};

export default AuthScreen;