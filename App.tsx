import React, { useState } from 'react';
import BottomNavigation from './components/BottomNavigation';
import HomeScreen from './screens/Home';
import ChatScreen from './screens/Chat';
import TasbihScreen from './screens/Tasbih';
import TrackerScreen from './screens/Tracker';
import DuasScreen from './screens/Duas';
import PrayersScreen from './screens/Prayers'; 
import ProfileScreen from './screens/Profile'; 
import AuthScreen from './screens/Auth'; 
import AdminPanel from './screens/AdminPanel'; // Import Admin
import Sidebar from './components/Sidebar';
import { Screen } from './types';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { t } from './data/locales';
import { Lock, LogIn } from 'lucide-react';

const MainApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const { user, loading, logout } = useAuth();
  const { language, appConfig } = useSettings();
  const strings = t[language];
  
  // State for Guest Restriction Modal
  const [showGuestModal, setShowGuestModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50 dark:bg-gray-900 gap-4">
         {appConfig.appLogo ? (
            <img src={appConfig.appLogo} alt="Logo" className="w-20 h-20 animate-pulse object-contain drop-shadow-lg" />
         ) : (
            <img src="/logo.png" alt="Logo" className="w-20 h-20 animate-pulse object-contain drop-shadow-lg" />
         )}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Screens that require Full Registration
  const RESTRICTED_SCREENS = [Screen.CHAT, Screen.TASBIH, Screen.TRACKER, Screen.DUAS];

  const handleNavigation = (screen: Screen) => {
    if (user.isAnonymous && RESTRICTED_SCREENS.includes(screen)) {
      setShowGuestModal(true);
      return;
    }
    setCurrentScreen(screen);
  };

  const handleLoginRedirect = () => {
    logout(); // This will clear user and automatically show AuthScreen
    setShowGuestModal(false);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.HOME:
        return <HomeScreen onOpenProfile={() => setCurrentScreen(Screen.PROFILE)} onNavigate={handleNavigation} />;
      case Screen.CHAT:
        return <ChatScreen />;
      case Screen.TASBIH:
        return <TasbihScreen />;
      case Screen.TRACKER:
        return <TrackerScreen />;
      case Screen.DUAS:
        return <DuasScreen />;
      case Screen.PRAYERS:
        return <PrayersScreen />;
      case Screen.PROFILE:
        return <ProfileScreen onBack={() => setCurrentScreen(Screen.HOME)} onAdmin={() => setCurrentScreen(Screen.ADMIN)} />;
      case Screen.ADMIN:
        return <AdminPanel onBack={() => setCurrentScreen(Screen.PROFILE)} />;
      default:
        return <HomeScreen onOpenProfile={() => setCurrentScreen(Screen.PROFILE)} onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar for Desktop */}
      <Sidebar currentScreen={currentScreen} onNavigate={handleNavigation} />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <main className={`flex-1 ${[Screen.CHAT, Screen.TASBIH].includes(currentScreen) ? 'h-full flex flex-col' : 'overflow-y-auto no-scrollbar'} md:p-6 lg:p-10`}>
          <div className={`max-w-4xl mx-auto w-full ${[Screen.CHAT, Screen.TASBIH].includes(currentScreen) ? 'flex-1 flex flex-col h-full' : ''}`}>
            {renderScreen()}
          </div>
        </main>
        
        {/* Bottom Navigation for Mobile */}
        {currentScreen !== Screen.PROFILE && currentScreen !== Screen.ADMIN && (
          <BottomNavigation 
            currentScreen={currentScreen} 
            onNavigate={handleNavigation} 
          />
        )}
      </div>

      {/* Guest Restriction Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xs p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-white/10">
            <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-full text-emerald-600 dark:text-emerald-400 mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {strings.guestRestrictionTitle}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {strings.guestRestrictionMessage}
            </p>
            
            <button 
              onClick={handleLoginRedirect}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-3 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <LogIn size={18} />
              {strings.loginToContinue}
            </button>
            
            <button 
              onClick={() => setShowGuestModal(false)}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {strings.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SettingsProvider>
  );
};

export default App;