import { Surah, Reciter } from '../types';

const API_BASE = 'https://api.quran.com/api/v4';

export const RECITERS: Reciter[] = [
    { id: 7, name: 'Mishary Rashid Alafasy', style: 'Hafs' },
    { id: 1, name: 'AbdulBaset AbdulSamad', style: 'Mujawwad' },
    { id: 2, name: 'AbdulBaset AbdulSamad', style: 'Murattal' },
    { id: 4, name: 'Abu Bakr Al-Shatri', style: 'Hafs' },
    { id: 6, name: 'Mahmoud Khalil Al-Husary', style: 'Hafs' },
    { id: 10, name: 'Saud Al-Shuraim', style: 'Hafs' },
];

export const getChapters = async (language: 'bn' | 'en' = 'en'): Promise<Surah[]> => {
    try {
        const response = await fetch(`${API_BASE}/chapters?language=${language}`);
        if (!response.ok) throw new Error('Failed to fetch chapters');
        const data = await response.json();
        return data.chapters;
    } catch (error) {
        console.error('Quran API Error:', error);
        return [];
    }
};

export const getChapterAudioUrl = async (reciterId: number, chapterId: number): Promise<string | null> => {
    try {
        const response = await fetch(`${API_BASE}/chapter_recitations/${reciterId}/${chapterId}`);
        if (!response.ok) throw new Error('Failed to fetch audio');
        const data = await response.json();
        return data.audio_file.audio_url;
    } catch (error) {
        console.error('Quran Audio Error:', error);
        return null;
    }
};