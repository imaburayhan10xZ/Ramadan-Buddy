import React from 'react';
import { Home, MessageCircle, BookOpen, Clock, LayoutGrid, User, Settings, LogOut } from 'lucide-react';
import { Screen } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../data/locales';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
  const { language, appConfig } = useSettings();
  const { user, logout } = useAuth();
  const strings = t[language];

  const navItems = [
    { id: Screen.HOME, icon: Home, label: strings.home },
    { id: Screen.PRAYERS, icon: Clock, label: strings.prayers },
    { id: Screen.DUAS, icon: BookOpen, label: strings.duas },
    { id: Screen.TASBIH, icon: LayoutGrid, label: strings.tools },
    { id: Screen.CHAT, icon: MessageCircle, label: strings.aiChat },
    { id: Screen.PROFILE, icon: User, label: strings.profile },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 transition-colors duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
        {appConfig.appLogo ? (
          <img src={appConfig.appLogo} alt="Logo" className="w-10 h-10 object-contain" />
        ) : (
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            R
          </div>
        )}
        <span className="font-bold text-xl text-gray-800 dark:text-white truncate">
          {appConfig.appName}
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email || 'Guest'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">{strings.signOut}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
