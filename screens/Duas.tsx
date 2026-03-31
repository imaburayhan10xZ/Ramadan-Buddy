import React, { useState } from 'react';
import { Share2, Search, BookOpen, ExternalLink, MessageCircle, Sun, Plane, Heart, HeartHandshake, Shield, Wallet, Database } from 'lucide-react';
import { DUAS } from '../data/staticData';
import { useSettings } from '../contexts/SettingsContext';
import { searchIslamicContent } from '../services/ai';
import { t } from '../data/locales';
import { Dua } from '../types';

export default function DuasScreen() {
  const { language } = useSettings();
  const strings = t[language];
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Dua[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const performSearch = async (searchTerm: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]); 

    const aiResults = await searchIslamicContent(searchTerm);
    
    const staticResults = DUAS.filter(d => 
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (d.titleEn && d.titleEn.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setSearchResults([...staticResults, ...aiResults]);
    setIsSearching(false);
  };

  const handleSearchClick = () => {
    if (!query.trim()) return;
    setActiveCategory(null);
    performSearch(query);
  };

  const handleCategoryClick = (categoryKey: string, searchTerm: string) => {
      setActiveCategory(categoryKey);
      setQuery(searchTerm);
      performSearch(searchTerm);
  };

  const categories = [
      { id: 'morning', label: strings.categories.morning, icon: Sun, term: language === 'bn' ? 'সকাল সন্ধ্যার দোয়া' : 'Morning Evening Dua' },
      { id: 'illness', label: strings.categories.illness, icon: Heart, term: language === 'bn' ? 'রোগ মুক্তির দোয়া' : 'Dua for Illness' },
      { id: 'forgiveness', label: strings.categories.forgiveness, icon: HeartHandshake, term: language === 'bn' ? 'ক্ষমা প্রার্থনার দোয়া' : 'Dua for Forgiveness' },
      { id: 'travel', label: strings.categories.travel, icon: Plane, term: language === 'bn' ? 'ভ্রমণের দোয়া' : 'Travel Dua' },
      { id: 'rizq', label: strings.categories.rizq, icon: Wallet, term: language === 'bn' ? 'রিজিক বৃদ্ধির দোয়া' : 'Dua for Rizq' },
      { id: 'protection', label: strings.categories.protection, icon: Shield, term: language === 'bn' ? 'বিপদ আপদ থেকে মুক্তির দোয়া' : 'Dua for Protection' },
  ];

  const trustedSources = ['Sunnah.com', 'Quran.com', 'IslamQA', 'Hisnul Muslim', 'HadithBD'];

  const displayList = hasSearched ? searchResults : DUAS;

  return (
    <div className="pb-24 md:pb-8 pt-4 px-3 flex flex-col h-full">
      {/* Header & Search */}
      <div className="mb-4 space-y-3 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          {strings.importantDuas}
        </h1>
        
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
               setQuery(e.target.value);
               if(e.target.value === '') {
                 setHasSearched(false);
                 setSearchResults([]);
                 setActiveCategory(null);
               }
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
            placeholder={strings.searchDuaPlaceholder}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-9 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm dark:text-white transition-all text-xs"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <button 
            onClick={handleSearchClick}
            disabled={isSearching || !query.trim()}
            className="absolute right-1.5 top-1.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg text-[10px] font-bold"
          >
            {isSearching ? strings.loading : strings.search}
          </button>
        </div>
 
        {/* Categories (Horizontal Scroll) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id, cat.term)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                        activeCategory === cat.id 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-500'
                    }`}
                >
                    <cat.icon size={14} />
                    {cat.label}
                </button>
            ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-4 flex-1">
        {isSearching && (
             <div className="flex flex-col items-center justify-center py-12">
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse mb-3">{strings.scanningDatabases}</p>
                 
                 {/* Visual badges for sources */}
                 <div className="flex flex-wrap justify-center gap-2 max-w-[80%] opacity-70">
                    {trustedSources.map((source, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                            {source}
                        </span>
                    ))}
                 </div>
             </div>
        )}

        {!isSearching && hasSearched && searchResults.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
             <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
               <BookOpen className="text-gray-400" size={24} />
             </div>
             <p className="text-gray-600 dark:text-gray-300 font-medium">{strings.noDuaFound}</p>
             <p className="text-xs text-gray-400 mt-1 mb-4">{strings.aiDisclaimer}</p>
             <div className="px-6">
               <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg flex items-center gap-3">
                 <MessageCircle className="text-emerald-600" size={20} />
                 <p className="text-xs text-emerald-800 dark:text-emerald-300 text-left flex-1">
                   {strings.askAiDetailed}
                 </p>
               </div>
             </div>
          </div>
        ) : (
          !isSearching && displayList.map((dua, index) => (
            <div key={dua.id || index} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h2 className="font-bold text-emerald-800 dark:text-emerald-400 text-base">
                    {language === 'bn' ? dua.title : (dua.titleEn || dua.title)}
                  </h2>
                  {(dua.source || dua.reference) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800 flex items-center gap-1 font-medium">
                         <Database size={9} /> {dua.source || strings.verifiedSource}
                      </span>
                      {dua.reference && (
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-gray-600">
                          {strings.reference} {dua.reference}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button 
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: dua.title,
                                text: `${dua.title}\n\n${dua.arabic}\n\n${dua.meaning}\n\nReference: ${dua.reference} (${dua.source})`,
                            }).catch(console.error);
                        }
                    }}
                    className="text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-1"
                >
                  <Share2 size={16} />
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg mb-3 border-r-4 border-emerald-500/30">
                <p className="text-right text-lg leading-relaxed font-arabic text-gray-800 dark:text-gray-100 font-medium">
                  {dua.arabic}
                </p>
              </div>
 
              <div className="space-y-2.5">
                <p className="text-xs text-gray-600 dark:text-gray-300 italic pl-2.5 border-l-2 border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-emerald-700 dark:text-emerald-500 block text-[10px] mb-0.5 uppercase tracking-wider opacity-70">{strings.pronunciation}</span> 
                  {language === 'bn' ? dua.bangla : (dua.english || dua.bangla)}
                </p>
                <div className="pt-1.5">
                   <span className="font-medium text-gray-900 dark:text-gray-200 block text-[10px] mb-0.5 uppercase tracking-wider opacity-70">{strings.meaning}</span>
                   <p className="text-xs text-gray-700 dark:text-gray-400 leading-relaxed">
                     {language === 'bn' ? dua.meaning : (dua.meaningEn || dua.meaning)}
                   </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}