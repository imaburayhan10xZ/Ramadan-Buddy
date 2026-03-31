import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { IbadahStatus } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../data/locales';

const TrackerScreen: React.FC = () => {
  const { language } = useSettings();
  const strings = t[language];
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

  // Calculate progress
  const completedCount = Object.entries(currentStatus).filter(([k, v]) => k !== 'date' && v === true).length;
  const totalTasks = taskList.length;
  const progress = Math.round((completedCount / totalTasks) * 100);

  return (
    <div className="pb-24 md:pb-8 pt-4 px-3">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{strings.trackerTitle}</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{strings.trackerSubtitle}</p>
 
      {/* Progress Bar */}
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
        <p className="text-[10px] text-center mt-2 text-gray-400 dark:text-gray-500">
          {progress === 100 ? strings.allCompleted : strings.keepTrying}
        </p>
      </div>
 
      {/* List */}
      <div className="space-y-2">
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
                <h3 className={`font-medium text-sm ${isCompleted ? 'text-emerald-900 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {task.label}
                </h3>
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
  );
};

export default TrackerScreen;