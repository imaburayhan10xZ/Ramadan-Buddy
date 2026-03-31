import React from 'react';
import { Home, MessageCircle, BookOpen, Clock, LayoutGrid } from 'lucide-react';
import { Screen } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../data/locales';

interface BottomNavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentScreen, onNavigate }) => {
  const { language } = useSettings();
  const strings = t[language];

  const navItems = [
    { id: Screen.HOME, icon: Home, label: strings.home },
    { id: Screen.PRAYERS, icon: Clock, label: strings.prayers },
    { id: Screen.DUAS, icon: BookOpen, label: strings.duas },
    { id: Screen.TASBIH, icon: LayoutGrid, label: strings.tools }, // Renamed to Tools, Icon changed to LayoutGrid
    { id: Screen.CHAT, icon: MessageCircle, label: strings.aiChat },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-1.5 pb-4 shadow-lg z-50 transition-colors duration-300">
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-full space-y-0.5 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <item.icon
                size={22}
                fill={isActive && item.id !== Screen.TASBIH && item.id !== Screen.CHAT && item.id !== Screen.PRAYERS ? "currentColor" : "none"}
                className="transition-all duration-200"
              />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;