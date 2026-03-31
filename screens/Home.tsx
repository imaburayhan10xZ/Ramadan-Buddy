import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Moon, Sun, Clock, UserCircle, X, Search, Navigation, Calendar, Sparkles, ChevronRight, ChevronLeft, Timer, Bell, Info } from 'lucide-react';
import { DUAS, ALLAH_NAMES } from '../data/staticData';
import { getRamadanTip } from '../services/ai';
import { searchCity, LocationSearchResult } from '../services/location';
import useLocalStorage from '../hooks/useLocalStorage';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { t } from '../data/locales';
import { Screen, AppNotification } from '../types';

interface HomeScreenProps {
  onOpenProfile?: () => void;
  onNavigate?: (screen: Screen) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenProfile, onNavigate }) => {
  const { language, timings, location, useGPSLocation, setLocationManual, appConfig } = useSettings();
  const { user } = useAuth();
  const [tip, setTip] = useLocalStorage<string>('daily_tip', '');
  const [lastTipDate, setLastTipDate] = useLocalStorage<string>('tip_date', '');
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Location Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);

  // Time & Countdown State
  const [displayTime, setDisplayTime] = useState<string>('');
  const [displayDate, setDisplayDate] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');
  const [nextEventLabel, setNextEventLabel] = useState<string>('');

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readNotifIds, setReadNotifIds] = useLocalStorage<string[]>('read_notifications', []);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  const strings = t[language];
  // Use dynamic hijri date or fallback
  const hijriDate = timings?.hijri || "Loading..."; 

  // --- Notification Listener ---
  useEffect(() => {
    // Basic notification sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    const notifRef = collection(db, "notifications");
    // We fetch global notifications and individual ones for this user
    const qGlobal = query(notifRef, where("type", "==", "all"), limit(50));
    
    const unsubGlobal = onSnapshot(qGlobal, (snapshot) => {
      const globalNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      mergeNotifications(globalNotifs, 'global');
    });

    let unsubIndividual = () => {};
    if (user?.uid) {
        const qIndividual = query(notifRef, where("targetUserId", "==", user.uid), limit(50));
        unsubIndividual = onSnapshot(qIndividual, (snapshot) => {
            const indNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
            mergeNotifications(indNotifs, 'individual');
        });
    }

    return () => {
        unsubGlobal();
        unsubIndividual();
    };
  }, [user]);

  const mergeNotifications = (newItems: AppNotification[], source: string) => {
      setNotifications(prev => {
          // Combine previous and new, remove duplicates
          const combined = [...prev, ...newItems];
          const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
          // Sort by date desc (Client-side sort)
          const sorted = unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          // Check if we have a NEW notification at the top that isn't read and wasn't in prev
          if (!isFirstLoad.current && newItems.length > 0) {
             const latest = newItems[0];
             // If this latest item wasn't in prev list
             if (!prev.find(p => p.id === latest.id)) {
                 playNotificationSound();
             }
          }
          return sorted;
      });
      isFirstLoad.current = false;
  };

  const playNotificationSound = () => {
      if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play failed (interaction required)", e));
      }
  };

  const markAsRead = (id: string) => {
      if (!readNotifIds.includes(id)) {
          setReadNotifIds([...readNotifIds, id]);
      }
  };

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

  // --- Clock & Countdown Logic with Timezone Support ---
  useEffect(() => {
    if (!timings) return;

    const timer = setInterval(() => {
      // 1. Current Time in Target Timezone
      // We use current system time, but formatted to the target timezone
      const now = new Date();
      const timezone = timings.timezone;

      // Format for Clock Display
      const timeStr = now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
        timeZone: timezone,
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      });
      
      const dateStr = now.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        timeZone: timezone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      setDisplayTime(timeStr);
      setDisplayDate(dateStr);

      // 2. Countdown Logic (Shifted Date Approach)
      const nowInTzStr = now.toLocaleString('en-US', { timeZone: timezone });
      const nowInTz = new Date(nowInTzStr); 

      const parsePrayerTime = (timeStr: string): Date => {
         const [time, modifier] = timeStr.split(' ');
         let [hours, minutes] = time.split(':');
         let h = parseInt(hours);
         if (modifier === 'PM' && h !== 12) h += 12;
         if (modifier === 'AM' && h === 12) h = 0;
         
         const d = new Date(nowInTz);
         d.setHours(h, parseInt(minutes), 0, 0);
         return d;
      };

      const sehriDate = parsePrayerTime(timings.sehri);
      const iftarDate = parsePrayerTime(timings.iftar);
      const nextSehriDate = parsePrayerTime(timings.nextSehri);
      
      if (nextSehriDate < nowInTz) {
          nextSehriDate.setDate(nextSehriDate.getDate() + 1);
      }

      let targetDate = sehriDate;
      let label = strings.sehriEnds;

      if (nowInTz > sehriDate && nowInTz < iftarDate) {
         targetDate = iftarDate;
         label = strings.iftarStarts;
      } else if (nowInTz > iftarDate) {
         targetDate = nextSehriDate;
         label = strings.nextSehri;
      } else {
         targetDate = sehriDate;
         label = strings.sehriEnds;
      }

      setNextEventLabel(label);

      const diff = targetDate.getTime() - nowInTz.getTime();
      
      if (diff > 0) {
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hrs}h ${mins}m ${secs}s`);
      } else {
        setCountdown("00h 00m 00s");
      }

    }, 1000);

    return () => clearInterval(timer);
  }, [timings, strings, language]);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    if (lastTipDate !== todayStr) {
      getRamadanTip().then(newTip => {
        setTip(newTip);
        setLastTipDate(todayStr);
      });
    }
  }, [lastTipDate, setTip, setLastTipDate]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchCity(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const selectCity = (result: LocationSearchResult) => {
    const name = result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0];
    setLocationManual(parseFloat(result.lat), parseFloat(result.lon), name);
    setShowLocationModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUseGPS = () => {
    useGPSLocation();
    setShowLocationModal(false);
  };

  // Asma-ul-Husna Logic
  const [nameIndex, setNameIndex] = useState(0);
  
  const handleNextName = () => {
    setNameIndex((prev) => (prev + 1) % ALLAH_NAMES.length);
  };

  const handlePrevName = () => {
    setNameIndex((prev) => (prev - 1 + ALLAH_NAMES.length) % ALLAH_NAMES.length);
  };

  return (
    <div className="pb-24 md:pb-8 pt-3 px-3 space-y-4 relative min-h-screen overflow-x-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-emerald-50/80 to-transparent dark:from-emerald-950/30 dark:to-transparent -z-10" />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-400/30 dark:bg-emerald-600/20 rounded-full blur-[80px] -z-10 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-400/30 dark:bg-teal-600/20 rounded-full blur-[80px] -z-10 animate-pulse" style={{ animationDuration: '6s' }} />

      {/* Header - Minimal Clean UI (UPDATED) */}
      <div className="relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-100/50 dark:border-slate-800 shadow-sm rounded-xl p-3 flex justify-between items-center mb-4">
        <div 
          onClick={() => setShowLocationModal(true)}
          className="cursor-pointer active:opacity-70 transition-opacity flex items-center gap-2.5"
        >
          {appConfig.appLogo ? (
            <img src={appConfig.appLogo} alt="Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
          ) : (
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
              <Sparkles size={18} className="text-emerald-600" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white drop-shadow-sm leading-none">{appConfig.appName}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 font-medium">
              <MapPin size={12} className="text-emerald-500 dark:text-emerald-400" /> 
              {location ? (
                <span className="truncate max-w-[140px]">{location.name}</span>
              ) : strings.locationPending}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {/* Notification Bell */}
           <button 
             onClick={() => setShowNotifModal(true)}
             className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 relative hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
           >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
           </button>
           
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide hidden sm:block">
            {hijriDate}
          </div>
          <button 
            onClick={onOpenProfile}
            className="w-10 h-10 rounded-full shadow-sm border-2 border-white dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center hover:scale-105 transition-transform"
          >
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).onerror = null; 
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
               <UserCircle size={28} className="text-slate-400 dark:text-slate-500" />
            )}
             {user?.photoURL && <UserCircle size={28} className="hidden" />}
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/20 dark:shadow-black/50 group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-800 dark:from-slate-900 dark:to-slate-950 z-0"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/30 transition-all duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>
        <div className="absolute inset-0 bg-white/5 dark:bg-white/5 backdrop-blur-[1px] z-0"></div>

        <div className="relative z-10 p-4 text-white">
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-white/10">
            <div>
               <div className="flex items-center gap-1.5 text-emerald-100 text-[10px] font-medium mb-1">
                 <Calendar size={10} />
                 <span>{displayDate || "Loading..."}</span>
               </div>
               <div className="text-2xl font-bold font-digital tracking-wide drop-shadow-sm">
                 {displayTime || "--:-- --"}
               </div>
               {timings && <div className="text-[9px] text-emerald-200 mt-0.5">{timings.timezone}</div>}
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider font-bold text-emerald-200 mb-1">
                {nextEventLabel} Remaining
              </div>
              <div className="flex items-center justify-end gap-1 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10">
                 <Timer size={12} className="text-emerald-300" />
                 <span className="font-mono font-bold text-base">{countdown || "00h 00m 00s"}</span>
              </div>
            </div>
          </div>

          {timings ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 dark:bg-slate-800/50 rounded-xl p-3 border border-white/10 backdrop-blur-sm hover:bg-black/30 transition-colors">
                <div className="flex items-center gap-2 text-emerald-200 mb-1">
                  <Moon size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{strings.sehriEnds}</span>
                </div>
                <p className="text-2xl font-bold">{timings.sehri}</p>
              </div>

              <div className="bg-white/10 dark:bg-slate-700/50 rounded-xl p-3 border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-amber-200 mb-1">
                  <Sun size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{strings.iftarStarts}</span>
                </div>
                <p className="text-2xl font-bold">{timings.iftar}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-pulse flex flex-col items-center gap-2">
                 <div className="h-4 w-32 bg-white/20 rounded"></div>
                 <div className="h-8 w-48 bg-white/20 rounded"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 99 Names Widget with Slider */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group transition-all">
         <div className="absolute top-0 right-0 p-3 opacity-10">
            <Sparkles size={48} className="text-emerald-500" />
         </div>
         
         <div className="flex items-center justify-between mb-2 relative z-10">
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-2">
               <Sparkles size={12} className="text-amber-500" /> Asma-ul-Husna
            </h3>
            <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
               {nameIndex + 1}/99
            </span>
         </div>
         
         <div className="relative">
             {/* Nav Buttons */}
             <button 
                onClick={handlePrevName} 
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 transition-all shadow-sm -ml-1"
             >
                <ChevronLeft size={18} />
             </button>
             
             <button 
                onClick={handleNextName} 
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 transition-all shadow-sm -mr-1"
             >
                <ChevronRight size={18} />
             </button>

             {/* Content */}
             <div className="text-center py-3 relative z-10 transition-all duration-500 px-8">
                <h2 className="text-3xl font-arabic font-bold text-emerald-600 dark:text-emerald-400 mb-1 drop-shadow-sm select-none">
                   {ALLAH_NAMES[nameIndex].arabic}
                </h2>
                <p className="text-base font-bold text-slate-800 dark:text-white select-none">
                   {ALLAH_NAMES[nameIndex].transliteration}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 select-none">
                   {language === 'bn' ? ALLAH_NAMES[nameIndex].meaningBn : ALLAH_NAMES[nameIndex].meaning}
                </p>
             </div>
         </div>
      </div>

      {/* AI Tip */}
      <div className="bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-indigo-800 dark:text-indigo-400 font-bold text-xs mb-1.5 flex items-center gap-2">
          ✨ {strings.todaysTip}
        </h3>
        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium">
          "{tip || strings.loading}"
        </p>
      </div>

      {/* Daily Dua */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <div 
          onClick={() => onNavigate && onNavigate(Screen.DUAS)}
          className="flex justify-between items-center mb-3 cursor-pointer group"
        >
          <h3 className="text-slate-800 dark:text-slate-200 text-sm font-bold border-l-4 border-emerald-500 pl-3">
            {strings.todaysDua}
          </h3>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-bold">
            {strings.viewAll} <ChevronRight size={12} />
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
           <p className="text-center font-arabic text-xl text-slate-800 dark:text-slate-200 leading-loose mb-2">
             {DUAS[0].arabic}
           </p>
           <p className="text-xs text-center text-slate-600 dark:text-slate-400">
             {language === 'bn' ? DUAS[0].meaning : DUAS[0].meaningEn}
           </p>
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-slate-800 dark:text-white">{strings.selectLocation}</h2>
               <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                 <X size={24} />
               </button>
            </div>

            {/* Option 1: GPS */}
            <button 
              onClick={handleUseGPS}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold mb-6 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-100 dark:border-emerald-900/30"
            >
              <Navigation size={20} />
              {strings.useGPS}
            </button>

            <div className="relative flex py-2 items-center mb-6">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-sm font-medium">{strings.or}</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            {/* Option 2: Search */}
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="relative">
                <input
                  type="text"
                  placeholder={strings.searchCity}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-emerald-500 border border-transparent dark:border-slate-700"
                />
                <button 
                  onClick={handleSearch}
                  className="absolute right-2 top-2 p-1.5 bg-white dark:bg-slate-700 rounded-lg text-emerald-600 dark:text-emerald-400 shadow-sm"
                >
                  <Search size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[150px]">
                {isSearching && (
                  <div className="flex justify-center py-4">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                  </div>
                )}
                
                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectCity(result)}
                        className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors group"
                      >
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {result.display_name}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-slate-400 py-4 text-sm">{strings.noResults}</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* NOTIFICATIONS LIST MODAL */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm h-[70vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-white/10 relative overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-slate-900">
                 <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <Bell size={18} className="text-emerald-600" /> Notifications
                 </h2>
                 <button onClick={() => setShowNotifModal(false)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                    <X size={18} />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                 {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                       <Bell size={40} className="opacity-20" />
                       <p className="text-sm">No notifications yet</p>
                    </div>
                 ) : (
                    <div className="space-y-2">
                       {notifications.map((notif) => {
                          const isRead = readNotifIds.includes(notif.id);
                          return (
                             <button
                                key={notif.id}
                                onClick={() => {
                                   setSelectedNotif(notif);
                                   markAsRead(notif.id);
                                }}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${
                                   isRead 
                                   ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-gray-700 opacity-70' 
                                   : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm'
                                }`}
                             >
                                <div className="flex justify-between items-start mb-1">
                                   <h4 className={`text-sm font-bold ${isRead ? 'text-gray-700 dark:text-gray-300' : 'text-slate-900 dark:text-white'}`}>
                                      {notif.title}
                                   </h4>
                                   {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 mt-1"></span>}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{notif.body}</p>
                                <p className="text-[10px] text-gray-400 mt-2 text-right">
                                   {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                             </button>
                          );
                       })}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* NOTIFICATION DETAIL POPUP */}
      {selectedNotif && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 border border-white/10">
               <button 
                 onClick={() => setSelectedNotif(null)}
                 className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"
               >
                 <X size={20} />
               </button>
               
               <div className="mb-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                     <Info size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight mb-2">
                     {selectedNotif.title}
                  </h2>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                     {new Date(selectedNotif.createdAt).toLocaleString()}
                  </p>
               </div>
               
               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                     {selectedNotif.body}
                  </p>
               </div>

               <button 
                  onClick={() => setSelectedNotif(null)}
                  className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
               >
                  Close
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default HomeScreen;