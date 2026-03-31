import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, CheckCircle2, Circle, Activity, Fingerprint, Calculator, Wallet, Coins, AlertTriangle, BookOpen, Play, Pause, Search, Music, Heart } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../data/locales';
import { IbadahStatus, Surah, Reciter, Dhikr } from '../types';
import { getChapters, getChapterAudioUrl, RECITERS } from '../services/quran';
import { DHIKR_PRESETS } from '../data/staticData';

const ToolsScreen: React.FC = () => {
  const { language } = useSettings();
  const strings = t[language];
  const [activeTab, setActiveTab] = useState<'tasbih' | 'tracker' | 'zakat' | 'quran'>('tasbih');

  // --- TASBIH LOGIC ---
  const [count, setCount] = useLocalStorage<number>('tasbih_count', 0);
  const [selectedDhikr, setSelectedDhikr] = useState<Dhikr | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // If selecting a new Dhikr, reset count
  const handleSelectDhikr = (dhikr: Dhikr) => {
      setSelectedDhikr(dhikr);
      setCount(0);
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const increment = () => {
    // If target reached for specific Dhikr, notify user
    if (selectedDhikr && count >= selectedDhikr.target) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        return;
    }
    
    setCount((prev) => prev + 1);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const requestReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setCount(0);
    setShowResetConfirm(false);
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  // --- TRACKER LOGIC ---
  const today = new Date().toISOString().split('T')[0];
  const [history, setHistory] = useLocalStorage<Record<string, IbadahStatus>>('ibadah_tracker', {});

  const currentStatus: IbadahStatus = history[today] || {
    date: today,
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
    taraweeh: false,
    quran: false,
    fasting: true,
  };

  const toggleStatus = (key: keyof IbadahStatus) => {
    if (key === 'date') return;
    const newStatus = { ...currentStatus, [key]: !currentStatus[key] };
    setHistory({ ...history, [today]: newStatus });
  };

  const taskList = [
    { key: 'fasting', label: strings.trackerTasks.fasting, subtitle: strings.trackerSubtitles.fasting },
    { key: 'fajr', label: strings.trackerTasks.fajr, subtitle: strings.trackerSubtitles.fajr },
    { key: 'dhuhr', label: strings.trackerTasks.dhuhr, subtitle: strings.trackerSubtitles.dhuhr },
    { key: 'asr', label: strings.trackerTasks.asr, subtitle: strings.trackerSubtitles.asr },
    { key: 'maghrib', label: strings.trackerTasks.maghrib, subtitle: strings.trackerSubtitles.maghrib },
    { key: 'isha', label: strings.trackerTasks.isha, subtitle: strings.trackerSubtitles.isha },
    { key: 'taraweeh', label: strings.trackerTasks.taraweeh, subtitle: strings.trackerSubtitles.taraweeh },
    { key: 'quran', label: strings.trackerTasks.quran, subtitle: strings.trackerSubtitles.quran },
  ];

  const completedCount = Object.entries(currentStatus).filter(([k, v]) => k !== 'date' && v === true).length;
  const progress = Math.round((completedCount / taskList.length) * 100);

  // --- ZAKAT LOGIC ---
  const [zakatData, setZakatData] = useLocalStorage('zakat_data', {
    cash: 0,
    gold: 0,
    business: 0,
    debt: 0
  });

  const totalAssets = zakatData.cash + zakatData.gold + zakatData.business;
  const netAssets = Math.max(0, totalAssets - zakatData.debt);
  const zakatPayable = Math.round(netAssets * 0.025);

  const handleZakatChange = (key: keyof typeof zakatData, value: string) => {
    const num = parseFloat(value) || 0;
    setZakatData(prev => ({ ...prev, [key]: num }));
  };

  // --- QURAN LOGIC ---
  const [chapters, setChapters] = useState<Surah[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [quranSearchQuery, setQuranSearchQuery] = useState('');
  const [selectedReciter, setSelectedReciter] = useState<number>(7); // Default Mishary
  
  const [currentSurah, setCurrentSurah] = useState<Surah | null>(null);
  const [quranAudioUrl, setQuranAudioUrl] = useState<string | null>(null);
  const [isQuranPlaying, setIsQuranPlaying] = useState(false);
  const [isLoadingQuranAudio, setIsLoadingQuranAudio] = useState(false);
  
  const quranAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (activeTab === 'quran' && chapters.length === 0) {
      setIsLoadingChapters(true);
      getChapters(language).then(data => {
        setChapters(data);
        setIsLoadingChapters(false);
      });
    }
  }, [activeTab, language]);

  useEffect(() => {
    if (quranAudioUrl) {
      if (!quranAudioRef.current) {
        quranAudioRef.current = new Audio(quranAudioUrl);
        quranAudioRef.current.addEventListener('ended', () => setIsQuranPlaying(false));
      } else {
        quranAudioRef.current.src = quranAudioUrl;
      }

      quranAudioRef.current.onerror = (e) => {
         console.warn("Quran Audio Error:", quranAudioRef.current?.error);
         setIsQuranPlaying(false);
      };

      quranAudioRef.current.play().then(() => {
          setIsQuranPlaying(true);
      }).catch(e => {
          console.warn("Play interrupted or failed:", e);
          setIsQuranPlaying(false);
      });
    }
  }, [quranAudioUrl]);

  const toggleQuranPlay = () => {
    if (quranAudioRef.current) {
      if (isQuranPlaying) {
        quranAudioRef.current.pause();
        setIsQuranPlaying(false);
      } else {
        quranAudioRef.current.play().then(() => {
             setIsQuranPlaying(true);
        }).catch(e => {
             console.warn("Play failed:", e);
             setIsQuranPlaying(false);
        });
      }
    }
  };

  const playSurah = async (surah: Surah) => {
    if (currentSurah?.id === surah.id && isQuranPlaying) {
        toggleQuranPlay();
        return;
    }
    
    setCurrentSurah(surah);
    setIsLoadingQuranAudio(true);
    const url = await getChapterAudioUrl(selectedReciter, surah.id);
    setQuranAudioUrl(url);
    setIsLoadingQuranAudio(false);
  };

  const filteredChapters = chapters.filter(c => 
     c.name_simple.toLowerCase().includes(quranSearchQuery.toLowerCase()) || 
     c.translated_name.name.toLowerCase().includes(quranSearchQuery.toLowerCase()) ||
     c.id.toString().includes(quranSearchQuery)
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 pb-24 md:pb-8">
      
      {/* Tab Switcher */}
      <div className="bg-white dark:bg-gray-800 p-3 pb-0 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('tasbih')}
            className={`flex-1 min-w-[60px] flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'tasbih' 
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Fingerprint size={14} />
            {strings.tasbih}
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 min-w-[60px] flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'tracker' 
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Activity size={14} />
            {strings.tracker}
          </button>
           <button
            onClick={() => setActiveTab('quran')}
            className={`flex-1 min-w-[60px] flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'quran' 
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <BookOpen size={14} />
            {strings.quran}
          </button>
          <button
            onClick={() => setActiveTab('zakat')}
            className={`flex-1 min-w-[60px] flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'zakat' 
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Calculator size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        
        {/* TASBIH VIEW */}
        {activeTab === 'tasbih' && (
          <div className="flex flex-col items-center justify-start min-h-[70vh] p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
             
             {/* Selected Amol Header */}
             <div className="text-center mb-4 w-full">
                {selectedDhikr ? (
                   <div className="animate-in slide-in-from-top-2">
                       <h2 className="text-xl font-bold font-arabic text-emerald-700 dark:text-emerald-400 mb-0.5">{selectedDhikr.arabic}</h2>
                       <p className="text-base font-bold text-gray-800 dark:text-white">{language === 'bn' ? selectedDhikr.bangla : selectedDhikr.english}</p>
                       <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-widest">Target: {selectedDhikr.target}</p>
                   </div>
                ) : (
                    <>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-white">{strings.tasbihTitle}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{strings.tasbihSubtitle}</p>
                    </>
                )}
             </div>
 
             {/* Counter Circle */}
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-[280px] aspect-[3/4] flex flex-col items-center justify-between border border-gray-100 dark:border-gray-700 relative transition-colors overflow-hidden mb-4">
               <div className="w-full bg-emerald-900 dark:bg-black rounded-lg p-4 mb-3 shadow-inner text-right font-mono border border-emerald-800 dark:border-gray-800 relative">
                  <span className={`text-4xl drop-shadow-md font-digital ${selectedDhikr && count >= selectedDhikr.target ? 'text-green-400 animate-pulse' : 'text-emerald-100'}`}>
                    {count.toString().padStart(selectedDhikr ? selectedDhikr.target.toString().length : 4, '0')}
                  </span>
                  {selectedDhikr && (
                      <span className="absolute bottom-1.5 left-2.5 text-[9px] text-emerald-400/50 font-bold">/ {selectedDhikr.target}</span>
                  )}
               </div>
 
               {/* Progress Ring for Target */}
               {selectedDhikr && (
                   <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3 overflow-hidden">
                       <div className="bg-emerald-500 h-full transition-all duration-200" style={{ width: `${Math.min(100, (count / selectedDhikr.target) * 100)}%` }}></div>
                   </div>
               )}
 
               <button 
                 onClick={increment}
                 className={`w-32 h-32 rounded-full shadow-lg active:shadow-inner active:scale-95 transition-all flex items-center justify-center border-4 z-0 ${
                     selectedDhikr && count >= selectedDhikr.target 
                     ? 'bg-green-600 border-green-300 shadow-green-500/50'
                     : 'bg-gradient-to-t from-emerald-600 to-emerald-500 dark:from-emerald-700 dark:to-emerald-600 border-emerald-100 dark:border-emerald-900'
                 }`}
               >
                 {selectedDhikr && count >= selectedDhikr.target ? (
                     <CheckCircle2 size={40} className="text-white animate-bounce" />
                 ) : (
                     <div className="text-white/20 text-5xl select-none pointer-events-none">+</div>
                 )}
               </button>
               
               <button 
                 onClick={requestReset}
                 className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-gray-700 rounded-full z-10"
               >
                 <RotateCcw size={20} />
               </button>

               {showResetConfirm && (
                 <div className="absolute inset-0 z-20 bg-white/95 dark:bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
                   <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-500 mb-4">
                     <AlertTriangle size={32} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{language === 'bn' ? 'রিসেট করবেন?' : 'Reset Counter?'}</h3>
                   <div className="flex gap-3 w-full mt-4">
                     <button 
                       onClick={cancelReset}
                       className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-gray-600 dark:text-gray-300"
                     >
                       {strings.cancel}
                     </button>
                     <button 
                       onClick={confirmReset}
                       className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg"
                     >
                       Confirm
                     </button>
                   </div>
                 </div>
               )}
             </div>

             {/* Quick Amol Presets */}
             <div className="w-full">
                <div className="flex items-center gap-2 mb-3">
                    <Heart size={16} className="text-rose-500" />
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Quick Amol</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                    {/* Free Mode Option */}
                    <button 
                        onClick={() => { setSelectedDhikr(null); setCount(0); }}
                        className={`flex-shrink-0 px-4 py-3 rounded-xl border flex flex-col items-start min-w-[120px] transition-all ${
                            selectedDhikr === null
                            ? 'bg-gray-800 text-white border-gray-800 shadow-lg scale-105'
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        <span className="font-bold text-sm">Free Mode</span>
                        <span className="text-[10px] opacity-70 mt-1">Unlimited</span>
                    </button>

                    {/* Presets */}
                    {DHIKR_PRESETS.map((dhikr) => (
                        <button
                            key={dhikr.id}
                            onClick={() => handleSelectDhikr(dhikr)}
                            className={`flex-shrink-0 px-4 py-3 rounded-xl border flex flex-col items-start min-w-[140px] transition-all ${
                                selectedDhikr?.id === dhikr.id
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105'
                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            <span className="font-bold text-sm truncate w-full text-left">{language === 'bn' ? dhikr.bangla : dhikr.english}</span>
                            <span className="text-[10px] opacity-70 mt-1 bg-black/10 px-1.5 py-0.5 rounded">Target: {dhikr.target}</span>
                        </button>
                    ))}
                </div>
             </div>

          </div>
        )}

        {/* TRACKER VIEW */}
        {activeTab === 'tracker' && (
          <div className="p-3 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{strings.trackerTitle}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{strings.trackerSubtitle}</p>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm mb-4 border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-gray-600 dark:text-gray-300">{strings.dailyProgress}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="space-y-2 pb-8">
              {taskList.map((task) => {
                const isCompleted = (currentStatus as any)[task.key];
                return (
                  <div 
                    key={task.key}
                    onClick={() => toggleStatus(task.key as keyof IbadahStatus)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isCompleted 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-100 dark:hover:border-emerald-900'
                    }`}
                  >
                    <div>
                      <h3 className={`font-medium text-sm ${isCompleted ? 'text-emerald-900 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>{task.label}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{task.subtitle}</p>
                    </div>
                    <div className={isCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'}>
                      {isCompleted ? <CheckCircle2 size={20} fill="currentColor" className="text-white dark:text-emerald-950" /> : <Circle size={20} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QURAN VIEW */}
        {activeTab === 'quran' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
             <div className="p-3 pb-2 sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">{strings.quranTitle}</h1>
                  <select 
                       value={selectedReciter} 
                       onChange={(e) => setSelectedReciter(parseInt(e.target.value))}
                       className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] rounded-lg p-1 outline-none focus:ring-2 focus:ring-emerald-500 max-w-[120px]"
                     >
                       {RECITERS.map(r => (
                         <option key={r.id} value={r.id}>{r.name}</option>
                       ))}
                  </select>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={strings.surahSearch}
                    value={quranSearchQuery}
                    onChange={(e) => setQuranSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  />
                  <Search className="absolute left-3 top-2 text-gray-400" size={14} />
                </div>
             </div>
 
             <div className="flex-1 overflow-y-auto px-3 pb-24">
                 <div className="space-y-1.5">
                   {filteredChapters.map((surah) => {
                     const isPlayingThis = currentSurah?.id === surah.id && isQuranPlaying;
                     const isSelected = currentSurah?.id === surah.id;
                     return (
                       <button
                         key={surah.id}
                         onClick={() => playSurah(surah)}
                         className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all group text-left ${
                           isSelected 
                             ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' 
                             : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-100 dark:hover:border-emerald-900'
                         }`}
                       >
                         <div className="flex items-center gap-3">
                           <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-colors ${
                               isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                           }`}>
                             {surah.id}
                           </div>
                           <div>
                             <h3 className={`font-bold text-xs ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                               {surah.name_simple} 
                             </h3>
                             <p className="text-[9px] text-gray-500 dark:text-gray-400">{strings.verses}: {surah.verses_count}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <p className="font-arabic text-base text-gray-800 dark:text-gray-300">{surah.name_arabic}</p>
                           {isPlayingThis && (
                             <div className="flex items-center gap-0.5">
                               <span className="w-0.5 h-2.5 bg-emerald-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></span>
                               <span className="w-0.5 h-3.5 bg-emerald-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"></span>
                             </div>
                           )}
                         </div>
                       </button>
                     );
                   })}
                 </div>
             </div>
 
             {currentSurah && (
               <div className="absolute bottom-4 left-4 right-4 bg-gray-900 dark:bg-emerald-900 text-white p-3 rounded-2xl shadow-xl border border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2 z-30">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-white/10 rounded-full"><Music size={18} /></div>
                    <div className="min-w-0">
                       <p className="text-[9px] text-gray-300 uppercase font-bold tracking-wider">{strings.nowPlaying}</p>
                       <p className="font-bold truncate text-xs">{currentSurah.name_simple}</p>
                    </div>
                 </div>
                 <button onClick={toggleQuranPlay} className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:bg-emerald-400 shadow-lg">
                    {isQuranPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                 </button>
               </div>
             )}
          </div>
        )}

        {/* ZAKAT VIEW */}
        {activeTab === 'zakat' && (
          <div className="p-3 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="flex items-center gap-2.5 mb-5">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-full text-emerald-600 dark:text-emerald-400">
                   <Calculator size={20} />
                </div>
                <div>
                   <h1 className="text-xl font-bold text-gray-800 dark:text-white">{strings.zakatTitle}</h1>
                   <p className="text-[10px] text-gray-500 dark:text-gray-400">{strings.zakatSubtitle}</p>
                </div>
             </div>
             <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                   <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                     <Wallet size={16} className="text-emerald-500" />
                     {strings.assets}
                   </h3>
                   <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5 ml-1">{strings.cash}</label>
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={zakatData.cash || ''}
                          onChange={(e) => handleZakatChange('cash', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5 ml-1">{strings.goldSilver}</label>
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={zakatData.gold || ''}
                          onChange={(e) => handleZakatChange('gold', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5 ml-1">{strings.businessAssets}</label>
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={zakatData.business || ''}
                          onChange={(e) => handleZakatChange('business', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                   </div>
                </div>
 
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                   <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2 text-sm">
                     <Coins size={16} className="text-red-500" />
                     {strings.liabilities}
                   </h3>
                   <div>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5 ml-1">{strings.debts}</label>
                        <input 
                          type="number" 
                          placeholder="0" 
                          value={zakatData.debt || ''}
                          onChange={(e) => handleZakatChange('debt', e.target.value)}
                          className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                        />
                   </div>
                </div>
 
                {/* Result Section */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-5 text-white shadow-xl">
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="text-emerald-100 text-xs">{strings.totalAssets}</span>
                     <span className="font-bold font-mono text-sm">{strings.currency} {netAssets.toLocaleString()}</span>
                   </div>
                   <div className="h-px bg-white/20 my-1.5"></div>
                   <div className="flex justify-between items-center mt-1.5">
                     <span className="text-white font-bold text-sm">{strings.payableZakat}</span>
                     <span className="text-xl font-bold font-mono">{strings.currency} {zakatPayable.toLocaleString()}</span>
                   </div>
                </div>
 
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed text-center">
                    {strings.zakatNote}
                  </p>
                </div>
 
                <div className="pb-10"></div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsScreen;