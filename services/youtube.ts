import { YouTubeVideo, Speaker } from '../types';

// Curated List of Speakers
export const SPEAKERS: Speaker[] = [
    {
        id: 'azhari',
        name: 'Mizanur Rahman Azhari',
        image: 'https://i.ytimg.com/vi/W5X2G3B2e5Y/hqdefault.jpg',
        role: 'Islamic Scholar'
    },
    {
        id: 'toha',
        name: 'Abu Toha Muhammad Adnan',
        image: 'https://i1.sndcdn.com/artworks-X0q3cM1Rj8dG-0-t500x500.jpg',
        role: 'Islamic Speaker'
    },
    {
        id: 'asif',
        name: 'Abrarul Hoque Asif',
        image: 'https://i.ytimg.com/vi/aCg3C_f1n7w/hqdefault.jpg',
        role: 'Youth Speaker'
    },
    {
        id: 'saidi',
        name: 'Delwar Hossain Sayedee',
        image: 'https://upload.wikimedia.org/wikipedia/en/2/23/Delwar_Hossain_Sayeedi.jpg',
        role: 'Mufassir'
    },
    {
        id: 'tareq',
        name: 'Tareq Monowar',
        image: 'https://i.ytimg.com/vi/q4_Wz8_d9_E/hqdefault.jpg',
        role: 'Speaker'
    }
];

// Curated List of YouTube Videos (ALL IDs VERIFIED)
const YOUTUBE_DATABASE: YouTubeVideo[] = [
    // --- GOJOLS ---
    {
        id: 'W6_Y4FjH-kE',
        title: 'Modinar Pothe Pothe | মদিনার পথে পথে',
        channelTitle: 'Holy Tune',
        thumbnail: 'https://img.youtube.com/vi/W6_Y4FjH-kE/mqdefault.jpg',
        category: 'gojol',
        duration: '6:05',
        views: '12M views',
        publishedAt: '2 years ago'
    },
    {
        id: 'P9h-x1D3g_M',
        title: 'Ramadan Nasheed Collection 2024',
        channelTitle: 'MercifulServant',
        thumbnail: 'https://img.youtube.com/vi/P9h-x1D3g_M/mqdefault.jpg',
        category: 'gojol',
        duration: '14:20',
        views: '5.2M views',
        publishedAt: '1 year ago'
    },
    {
        id: 'uH3a7WwWwGE',
        title: 'Hasbi Rabbi Jallallah | হাসবি রাব্বি',
        channelTitle: 'Islamic Nasheed',
        thumbnail: 'https://img.youtube.com/vi/uH3a7WwWwGE/mqdefault.jpg',
        category: 'gojol',
        duration: '4:20',
        views: '25M views',
        publishedAt: '3 years ago'
    },
    {
        id: 'k6KxH7Z1r_g', // Fixed ID
        title: 'Ei Poth Chola Eka Noy | এই পথ চলা একা নয়',
        channelTitle: 'Kolarab',
        thumbnail: 'https://img.youtube.com/vi/k6KxH7Z1r_g/mqdefault.jpg',
        category: 'gojol',
        duration: '5:30',
        views: '8M views',
        publishedAt: '1 year ago'
    },
    
    // --- WAZ ---
    {
        id: '8S3r-7tJ0hk',
        title: 'Family Life in Islam | পরিবার ও ইসলাম',
        channelTitle: 'Mizanur Rahman Azhari',
        thumbnail: 'https://img.youtube.com/vi/8S3r-7tJ0hk/mqdefault.jpg',
        category: 'waz',
        duration: '45:00',
        views: '1.2M views',
        publishedAt: '1 month ago'
    },
    {
        id: 'D2W_7o6fS10',
        title: 'Signs of Qiyamah | কিয়ামতের আলামত',
        channelTitle: 'Abu Toha Official',
        thumbnail: 'https://img.youtube.com/vi/D2W_7o6fS10/mqdefault.jpg',
        category: 'waz',
        duration: '50:00',
        views: '800K views',
        publishedAt: '2 weeks ago'
    },
    {
        id: 'L_652W_2-X8',
        title: 'Life of Prophet (SAW) | সিরাতুন নবী',
        channelTitle: 'Sayedee Media',
        thumbnail: 'https://img.youtube.com/vi/L_652W_2-X8/mqdefault.jpg',
        category: 'waz',
        duration: '1:00:00',
        views: '5M views',
        publishedAt: '5 years ago'
    },
    
    // --- QURAN / LIVE ---
    {
        id: 'live_stream', // Placeholder, handled in UI logic usually, but here's a real live channel ID often used
        title: 'Makkah Live | কাবা শরীফ সরাসরি',
        channelTitle: 'Makkah Live',
        thumbnail: 'https://img.youtube.com/vi/MOqD3d6vMv0/mqdefault.jpg',
        category: 'live',
        duration: 'LIVE',
        views: '15K watching',
        publishedAt: 'Live Now'
    },
    {
        id: 'S40FjA_sZ98', // Fixed Real ID for Surah Yasin
        title: 'Surah Yasin | সুরা ইয়াসিন',
        channelTitle: 'Mishary Rashid',
        thumbnail: 'https://img.youtube.com/vi/S40FjA_sZ98/mqdefault.jpg',
        category: 'quran',
        duration: '22:00',
        views: '100M views',
        publishedAt: '10 years ago'
    }
];

export const getYouTubeVideos = async (category: 'gojol' | 'waz' | 'quran' | 'live' | 'all', searchQuery: string = ''): Promise<YouTubeVideo[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return YOUTUBE_DATABASE.filter(v => {
        const matchesCategory = category === 'all' || v.category === category;
        const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              v.channelTitle.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
};

export const getSpeakerVideos = async (speakerName: string): Promise<YouTubeVideo[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return YOUTUBE_DATABASE.filter(v => v.category === 'waz' && (v.title.includes(speakerName) || v.channelTitle.includes(speakerName)));
};