import React, { useState, useEffect } from 'react';
import { Sunrise, Sunset, Moon, Sun, Clock, MapPin, ChevronRight, Timer, ArrowDown, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../data/locales';

const PrayersScreen: React.FC = () => {
  const { language, timings, location } = useSettings();
  const strings = t[language];
  const [nextPrayer, setNextPrayer] = useState<{ id: string; name: string; time: Date | null } | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [activeWaqt, setActiveWaqt] = useState<string | null>(null);

  useEffect(() => {
    if (!timings) return;

    const interval = setInterval(() => {
      // 1. Get "Shifted" Current Time based on timezone
      const timezone = timings.timezone;
      const nowInTzStr = new Date().toLocaleString('en-US', { timeZone: timezone });
      const nowInTz = new Date(nowInTzStr); // Local representation of Target Time

      // 2. Helper to parse prayer times onto the Shifted Current Time
      const parseTime = (timeStr: string, isNextDay = false): Date | null => {
        if (!timeStr) return null;
        const d = new Date(nowInTz); // Clone "Shifted Now"
        if (isNextDay) d.setDate(d.getDate() + 1);
        
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        let h = parseInt(hours);
        if (modifier === 'PM' && h !== 12) h += 12;
        if (modifier === 'AM' && h === 12) h = 0;
        
        d.setHours(h, parseInt(minutes), 0, 0);
        return d;
      };
      
      const times = [
        { id: 'fajr', name: strings.waqt.fajr, time: parseTime(timings.fajr) },
        { id: 'sunrise', name: strings.waqt.sunrise, time: parseTime(timings.sunrise) },
        { id: 'dhuhr', name: strings.waqt.dhuhr, time: parseTime(timings.dhuhr) },
        { id: 'asr', name: strings.waqt.asr, time: parseTime(timings.asr) },
        { id: 'maghrib', name: strings.waqt.maghrib, time: parseTime(timings.maghrib) },
        { id: 'isha', name: strings.waqt.isha, time: parseTime(timings.isha) },
      ];

      // Next Prayer Logic
      const prayers = times.filter(t => t.id !== 'sunrise');
      let next = prayers.find(p => p.time && p.time > nowInTz);
      
      // Determine active waqt
      let active = null;
      for (let i = 0; i < times.length - 1; i++) {
        if (times[i].time && times[i+1].time && nowInTz >= times[i].time! && nowInTz < times[i+1].time!) {
          active = times[i].id;
          break;
        }
      }
      if (!active && times[5].time && nowInTz >= times[5].time!) {
         active = 'isha';
      }

      setActiveWaqt(active);

      if (!next) {
        if (timings.nextSehri) {
             // Try to use Fajr from nextSehri string or just use regular Fajr logic + 1 day
             const d = parseTime(timings.fajr, true); 
             if (d) next = { id: 'fajr', name: strings.waqt.fajr, time: d };
        }
      }

      setNextPrayer(next || null);

      if (next && next.time) {
        const diff = next.time.getTime() - nowInTz.getTime();
        if (diff > 0) {
          const hrs = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown(`${hrs}h ${mins}m ${secs}s`);
        } else {
          setCountdown('Now');
        }
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [timings, strings]);

  if (!timings) {
    return (
      <div className="flex h-full items-center justify-center p-6 flex-col gap-3">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
         <p className="text-gray-400 text-sm">{strings.loading}</p>
      </div>
    );
  }

  const prayerList = [
    { id: 'fajr', label: strings.waqt.fajr, time: timings.fajr, icon: Moon },
    { id: 'sunrise', label: strings.waqt.sunrise, time: timings.sunrise, icon: Sunrise, isSystem: true },
    { id: 'dhuhr', label: strings.waqt.dhuhr, time: timings.dhuhr, icon: Sun },
    { id: 'asr', label: strings.waqt.asr, time: timings.asr, icon: Sun },
    { id: 'maghrib', label: strings.waqt.maghrib, time: timings.maghrib, icon: Sunset },
    { id: 'isha', label: strings.waqt.isha, time: timings.isha, icon: Moon },
  ];

  const currentDate = new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'long', 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const hijriDate = timings.hijri || "Loading...";

  return (
    <div className="pb-24 md:pb-8 pt-4 px-4 min-h-full">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{strings.prayerTimesTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
             <MapPin size={14} className="text-emerald-500" />
             {location?.name || strings.locationPending}
          </p>
        </div>
        <div className="text-right">
           <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold mb-1 inline-block">
             {hijriDate}
           </div>
           <p className="text-xs text-gray-400 dark:text-gray-500">{currentDate}</p>
        </div>
      </div>

      {/* Hero: Next Prayer Countdown */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 dark:from-black dark:via-gray-900 dark:to-black text-white shadow-2xl shadow-emerald-500/10 mb-6 border border-white/10">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>
         
         <div className="relative z-10 p-4 flex flex-col items-center justify-center py-6 text-center">
             <div className="mb-2 flex items-center gap-2 text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 backdrop-blur-md">
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{language === 'bn' ? 'পরবর্তী ওয়াক্ত' : 'Next Prayer'}</span>
             </div>
             
             <h2 className="text-3xl font-bold mb-1 tracking-tight">
               {nextPrayer ? nextPrayer.name : "..."}
             </h2>
             
             <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 my-3 tracking-wider">
               {countdown || "00:00:00"}
             </div>

             {nextPrayer && (
               <div className="text-sm text-gray-400 flex items-center gap-2">
                 Starts at <span className="text-white font-bold">{formatTime12(nextPrayer.time)}</span>
               </div>
             )}
         </div>
      </div>

      {/* Minimal Timeline List */}
      <div className="relative pl-4 space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
        {prayerList.map((prayer) => {
           const isActive = activeWaqt === prayer.id;
           const isNext = nextPrayer?.id === prayer.id;
           
           return (
             <div key={prayer.id} className="relative flex items-center justify-between group">
                
                {/* Timeline Node */}
                <div className={`absolute -left-[19px] w-2 h-2 rounded-full border-2 transition-all z-10 ${
                    isActive 
                      ? 'bg-emerald-500 border-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/30 scale-110' 
                      : isNext 
                        ? 'bg-white dark:bg-gray-900 border-emerald-500' 
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                }`}></div>
 
                {/* Card Content */}
                <div className={`flex-1 ml-4 p-3 rounded-xl border transition-all duration-300 ${
                  isActive 
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 shadow-sm translate-x-1' 
                    : prayer.isSystem 
                       ? 'bg-transparent border-transparent py-1.5 opacity-60' // Sunrise style
                       : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                }`}>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                         <div className={`p-1.5 rounded-full ${
                             isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                         }`}>
                             <prayer.icon size={16} />
                         </div>
                         <div>
                            <h3 className={`font-bold text-xs ${isActive ? 'text-emerald-800 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {prayer.label}
                            </h3>
                            {isActive && (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-medium animate-pulse">
                                   Running Now
                                </span>
                            )}
                         </div>
                      </div>
                      <div className={`text-base font-mono font-bold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {prayer.time}
                      </div>
                   </div>
                </div>
             </div>
           );
        })}
      </div>
      
      {/* Footer Note */}
      <div className="mt-8 text-center bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
         <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
            <AlertCircle size={12} />
            {language === 'bn' ? 'সূর্যোদয়, দ্বিপ্রহর ও সূর্যাস্তের সময় নামাজ পড়া নিষিদ্ধ।' : 'Prayer is forbidden during Sunrise, Zenith & Sunset.'}
         </p>
      </div>

    </div>
  );
};

// Helper for display formatting
const formatTime12 = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default PrayersScreen;