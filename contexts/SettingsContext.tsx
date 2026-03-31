import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, Theme, LocationData, AppConfig } from '../types';
import { getPrayerTimes, PrayerTiming } from '../services/prayer';
import { getCityName } from '../services/location';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Default Config Fallback
const DEFAULT_CONFIG: AppConfig = {
  appName: "Ramadan Buddy",
  appLogo: "/logo.png",
  version: "1.0.0",
  // Removed specific admin email as requested
  adminEmails: [], 
  developer: {
    name: "Islamic Tech BD",
    image: "", // Default empty
    email: "contact@islamictechbd.com",
    showEmail: true,
    website: "www.islamictechbd.com",
    showWebsite: true,
    mission: "আমরা মুসলিম উম্মাহর জন্য আধুনিক ও মানসম্মত ডিজিটাল সেবা প্রদানে অঙ্গীকারবদ্ধ।",
    socialLinks: []
  },
  donation: {
    enabled: true,
    title: "Support Us",
    subtitle: "Help keep the app ad-free",
    description: "এই অ্যাপটি সম্পূর্ণ বিজ্ঞাপনমুক্ত এবং জনকল্যাণমূলক। সার্ভার খরচ এবং ডেভেলপমেন্ট চালিয়ে যেতে আপনার সহযোগিতা একান্ত কাম্য।",
    methods: [
      { id: '1', name: 'Bkash', number: '01700000000', logoUrl: 'https://freepnglogo.com/images/all_img/1701670291bkash-app-logo-png.png' },
      { id: '2', name: 'Nagad', number: '01800000000', logoUrl: 'https://freepnglogo.com/images/all_img/1701672323nagad-logo-transparent.png' }
    ]
  },
  legal: {
    privacyPolicyUrl: "#",
    privacyPolicyText: "This is the default Privacy Policy. Admin can update this text from the Admin Panel.",
    termsUrl: "#",
    termsText: "These are the default Terms & Conditions. Admin can update this text from the Admin Panel.",
    copyrightText: "© 2026 রমজান বাডি. All rights reserved."
  }
};

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  location: LocationData | null;
  setLocationManual: (lat: number, lng: number, name: string) => void;
  useGPSLocation: () => void;
  timings: PrayerTiming | null;
  appConfig: AppConfig;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });
  
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app_theme') as Theme) || 'light';
  });

  const [location, setLocation] = useState<LocationData | null>(() => {
    const saved = localStorage.getItem('app_location');
    return saved ? JSON.parse(saved) : null;
  });

  const [timings, setTimings] = useState<PrayerTiming | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Fetch App Config from Firestore Realtime
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "app_config", "main"), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Partial<AppConfig>;
        setAppConfig(prev => ({
           ...prev,
           ...data,
           // Ensure nested objects are merged correctly if missing in DB or added recently
           developer: { 
             ...prev.developer, 
             ...(data.developer || {}),
             // Fallback for new fields if not in DB yet
             showEmail: data.developer?.showEmail ?? prev.developer.showEmail ?? true,
             showWebsite: data.developer?.showWebsite ?? prev.developer.showWebsite ?? true,
             socialLinks: data.developer?.socialLinks || prev.developer.socialLinks || []
           },
           donation: { 
             ...prev.donation, 
             ...(data.donation || {}),
             methods: data.donation?.methods || prev.donation.methods 
           },
           legal: { ...prev.legal, ...(data.legal || {}) }
        }));
      } else {
        console.log("No config found, using default");
      }
    }, (error) => {
      console.error("Config fetch error:", error);
    });

    return () => unsub();
  }, []);

  // Persist basic settings
  useEffect(() => {
    localStorage.setItem('app_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Persist location & Fetch Times
  useEffect(() => {
    if (location) {
      localStorage.setItem('app_location', JSON.stringify(location));
      
      const fetchTimes = async () => {
         const times = await getPrayerTimes(location.latitude, location.longitude);
         if (times) setTimings(times);
      };
      
      fetchTimes();
    }
  }, [location]);

  // Initialize: if no location saved, try GPS
  useEffect(() => {
    if (!location) {
      useGPSLocation();
    }
  }, []);

  const setLocationManual = (lat: number, lng: number, name: string) => {
    setLocation({
      latitude: lat,
      longitude: lng,
      name: name,
      isManual: true
    });
  };

  const useGPSLocation = () => {
    if (!navigator.geolocation) {
      // Fallback to Dhaka if denied/unavailable
      setLocationManual(23.8103, 90.4125, "Dhaka (Default)");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Fetch city name for better UI
        const cityName = await getCityName(latitude, longitude);
        
        setLocation({
          latitude,
          longitude,
          name: cityName,
          isManual: false
        });
      },
      (error) => {
        console.error("Location error", error);
        // Fallback
        if (!location) {
          setLocationManual(23.8103, 90.4125, "Dhaka (Default)");
        }
      }
    );
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        language, 
        setLanguage, 
        theme, 
        setTheme,
        location,
        setLocationManual,
        useGPSLocation,
        timings,
        appConfig
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};