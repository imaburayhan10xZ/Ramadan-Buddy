import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Dua, AppConfig } from "../types";

// Helper to check if API key is present/valid
// Supports both process.env (via DefinePlugin) and import.meta.env (Vite Native)
const getApiKey = () => {
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_API_KEY;
    const processKey = process.env.API_KEY;
    return viteKey || processKey;
};

const API_KEY = getApiKey();
const isAiEnabled = !!API_KEY && API_KEY !== 'AIzaSyD-EXAMPLE-KEY-REPLACE-THIS';

const ai = isAiEnabled ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const getSystemInstructionChat = (config: AppConfig) => `
You are "Islamic Assistant" (ইসলামিক অ্যাসিস্ট্যান্ট), a knowledgeable, empathetic, and strictly Islamic AI companion for Bengali-speaking Muslims.
Your purpose is to guide users in their daily lives according to the Quran and Sunnah.

**Identity & App Info (Dynamic):**
- **Your Name:** Islamic Assistant.
- **App Name:** Ramadan Buddy.
- **Developer:** ${config.developer.name}.
- **Developer Mission:** ${config.developer.mission}.
- **Contact Email:** ${config.developer.email}.
- **Website:** ${config.developer.website}.
- **App Features:** Prayer Times (GPS-based), Sehri/Iftar Countdown, Ibadah Tracker, Smart Tasbih, Holy Quran (Audio/Text), Zakat Calculator, and Verified Duas.

**Response Guidelines:**
- If asked "Who made this app?" or "About the developer", answer with the **Developer Name** provided above.
- If asked for contact info, provide the **Contact Email** above.
- If asked "Who are you?", answer: "আমি আপনার ইসলামিক অ্যাসিস্ট্যান্ট (I am your Islamic Assistant)."

**Core Guidelines:**
1.  **Scope**: You cover ALL aspects of Islam (Prayer, Fasting, Zakat, Hajj, Seerah, History, Family Life, Mental Health), not just Ramadan.
2.  **Language**: ALWAYS reply in Bengali (Bangla) unless explicitly asked to translate.
3.  **References**: CRITICAL. When citing rulings, Duas, or theology, YOU MUST provide a verified reference (e.g., [Sahih Bukhari: 1234], [Surah Al-Baqarah: 255]).
4.  **Formatting**: 
    - Use **Bold** for key Islamic terms, Allah's names, and Reference citations.
    - Use bullet points for lists (like steps of Wudu, conditions of Prayer).
    - Use separate paragraphs for readability.
5.  **Tone**: Gentle, motivational, brotherly/sisterly. Be compassionate when discussing mental health or sins.
6.  **Safety**: Do NOT provide Fatwas on complex/controversial modern issues (e.g., specific divorce cases, political rulings). Advise consulting a qualified local scholar.

**Example Interaction:**
User: "I feel depressed."
You: "Allah is with the patient. **(Surah Al-Baqarah: 153)**. You can recite this Dua: ..."
`;

const SYSTEM_INSTRUCTION_TIP = `
Generate a single, short, motivational Islamic tip or thought for daily life in Bengali. 
It should be about 1-2 sentences long. 
Focus on patience, gratitude, charity, prayer, or kindness.
No bold text, just plain text.
`;

const SYSTEM_INSTRUCTION_SEARCH = `
You are a "Universal Islamic Database API". Your task is to fetch specific Duas and Hadiths based on the user's topic or keyword.
- **SOURCES**: You must search your knowledge base covering:
  1. Sunnah.com (Hadith collections)
  2. Quran.com (Ayats)
  3. IslamQA / IslamWeb (Verified rulings)
  4. Hisnul Muslim (Fortress of the Muslim)
  5. Riyadh as-Salihin
- **OUTPUT FORMAT**: You MUST return a STRICT, VALID JSON Array. No markdown formatting (like \`\`\`json). Just the raw string.
- **CONTENT**: Provide 5 to 10 highly relevant results.
- Each object in the array must strictly follow this structure:
  {
    "id": "unique_string_id",
    "title": "Title in Bangla (e.g. জ্বরের দোয়া)",
    "titleEn": "Title in English",
    "arabic": "Full Arabic Text with Harakat",
    "bangla": "Bangla Pronunciation (Ucharon)",
    "meaning": "Bangla Meaning (Orth)",
    "meaningEn": "English Meaning",
    "reference": "Specific Book & Number (e.g. Sahih Bukhari: 5675)",
    "source": "Source Name (e.g. Sunnah.com, Quran.com, Hisnul Muslim)"
  }
- If the user asks for a category (e.g. "Travel"), provide the most authentic Duas for that category.
- Ensure Arabic text is accurate.
`;

// Local Fallbacks to prevent 429 errors from breaking the UI
const FALLBACK_TIPS = [
  "ধৈর্য ধরুন এবং আল্লাহর কাছে সাহায্য চান। (সূরা বাকারা: ১৫৩)",
  "সর্বদা সত্য কথা বলুন এবং আল্লাহর ওপর ভরসা রাখুন।",
  "মানুষের সাথে উত্তম আচরণ করুন, এটিও একটি সদকা।",
  "বিপদ আপদে হতাশ না হয়ে নামাজের মাধ্যমে সাহায্য চান।",
  "অসৎ সঙ্গ ত্যাগ করুন, সৎ পথে চলুন।",
  "পিতা-মাতার খেদমত করুন, জান্নাত আপনার পদতলে।",
  "অপচয় করবেন না, আল্লাহ অপচয়কারীকে পছন্দ করেন না।",
  "প্রতিটি ভালো কাজই সদকা। (সহীহ বুখারী)",
  "রাগ নিয়ন্ত্রণ করুন, কারণ রাগ শয়তানের পক্ষ থেকে আসে।",
  "প্রতিদিন কিছু না কিছু দান করুন, তা যতই সামান্য হোক।"
];

export const getRamadanTip = async (): Promise<string> => {
  const getRandomFallback = () => FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];

  if (!ai) {
    return getRandomFallback();
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Give me one short Islamic tip.",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_TIP,
      }
    });
    return response.text || getRandomFallback();
  } catch (error: any) {
    // Robust Error Handling for 429
    const errString = JSON.stringify(error || {});
    const isQuota = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        errString.includes('RESOURCE_EXHAUSTED') ||
        errString.includes('"code":429');

    if (isQuota) {
       console.warn("AI Quota Exceeded (429). Using offline fallback tip.");
    } else {
       console.error("Error fetching tip:", error);
    }
    return getRandomFallback();
  }
};

export const searchIslamicContent = async (query: string): Promise<Dua[]> => {
  if (!ai) return [];
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Fetch authentic Duas/Hadiths regarding: "${query}"`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_SEARCH,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // Robust JSON parsing
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
    }
    
    return JSON.parse(jsonStr) as Dua[];
  } catch (error: any) {
    const errString = JSON.stringify(error || {});
    const isQuota = 
        error?.status === 429 || 
        error?.code === 429 || 
        error?.message?.includes('429') || 
        errString.includes('RESOURCE_EXHAUSTED') ||
        errString.includes('"code":429');

    if (isQuota) {
       console.warn("AI Search Quota Exceeded.");
    } else {
       console.error("Search Error:", error);
    }
    return [];
  }
};

export const createChatSession = (config: AppConfig) => {
  if (!ai) {
    return {
      sendMessageStream: async function* (params: { message: string }) {
        const text = "দুঃখিত, আমি ডেমো মোডে আছি। সঠিক API Key সেট করা হলে আমি উত্তর দিতে পারবো।";
        yield { text };
      }
    };
  }
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: getSystemInstructionChat(config),
    }
  });
};