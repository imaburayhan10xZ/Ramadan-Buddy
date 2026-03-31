
export enum Screen {
  HOME = 'HOME',
  PRAYERS = 'PRAYERS',
  CHAT = 'CHAT',
  TASBIH = 'TASBIH',
  TRACKER = 'TRACKER',
  DUAS = 'DUAS',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN', // New Screen
}

export type Language = 'bn' | 'en';
export type Theme = 'light' | 'dark';

export interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
  isManual: boolean; // true if user selected it, false if GPS
}

export interface DonationMethod {
  id: string;
  name: string;
  number: string;
  logoUrl?: string;
}

export interface SocialLink {
  id: string;
  label: string; // e.g. Facebook, WhatsApp
  url: string;
}

export interface AppConfig {
  appName: string;
  appLogo: string;
  version: string;
  adminEmails: string[];
  developer: {
    name: string;
    image?: string; // New: Profile Pic URL
    email: string;
    showEmail: boolean; // New: Toggle
    website: string;
    showWebsite: boolean; // New: Toggle
    mission: string;
    socialLinks: SocialLink[]; // New: Dynamic Links
  };
  donation: {
    enabled: boolean;
    title: string;
    subtitle: string;
    description: string;
    methods: DonationMethod[]; 
  };
  legal: {
    privacyPolicyUrl: string;
    privacyPolicyText?: string; 
    termsUrl: string;
    termsText?: string; 
    copyrightText: string;
  };
}

export interface UserFeedback {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
  read: boolean;
  reply?: string;    // Admin reply text
  replyAt?: string;  // Admin reply timestamp
  type?: 'general' | 'appeal'; // Appeal for suspended accounts
}

export type UserStatus = 'active' | 'suspended' | 'disabled';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber?: string | null; // Added
  photoURL: string | null;
  lastLogin: string;
  createdAt?: string;
  isAnonymous: boolean;
  ip?: string;
  location?: string; // City, Country
  userAgent?: string;
  isp?: string;
  status?: UserStatus; // Added
  statusReason?: string; // Added
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'all' | 'individual';
  targetUserId?: string; // If individual
  targetEmail?: string; // Helper for UI display
  createdAt: string; // ISO string
}

export interface Dua {
  id: string;
  title: string;
  titleEn?: string;
  arabic: string;
  bangla: string;
  english?: string;
  meaning: string;
  meaningEn?: string;
  context?: string;
  reference?: string; // e.g. Sahih Bukhari 198
  source?: string;    // e.g. Sunnah.com
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface IbadahStatus {
  date: string; // YYYY-MM-DD
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  taraweeh: boolean;
  quran: boolean;
  fasting: boolean;
}

export interface DailyTiming {
  date: string;
  sehri: string;
  iftar: string;
  hijriDate: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Quran Types
export interface Surah {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  translated_name: {
    name: string;
    language_name: string;
  };
}

export interface Reciter {
  id: number;
  name: string;
  style?: string;
}

// YouTube Media Types
export interface YouTubeVideo {
  id: string; // YouTube Video ID (e.g., "dQw4w9WgXcQ")
  title: string;
  channelTitle: string;
  thumbnail: string;
  category: 'gojol' | 'waz' | 'quran' | 'live';
  duration?: string;
  views?: string;
  publishedAt?: string;
}

export interface Speaker {
  id: string;
  name: string;
  image: string;
  role: string;
}

// Tasbih Presets
export interface Dhikr {
  id: string;
  arabic: string;
  bangla: string;
  english: string;
  target: number;
}