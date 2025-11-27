
import React, { useState, useEffect } from 'react';
import { FilterState, OrderOption, SortOption } from '../types';
import { ALL_LANGUAGES, MAX_STARS, SORT_OPTIONS } from '../constants';
import { ChevronDown, X, Search, Check, ArrowUp, ArrowDown, Flame, Star, GitFork, Clock, History, Trash2, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  isLoading: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilters, isLoading }) => {
  const [langSearch, setLangSearch] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Local state for debounced inputs
  const [localQuery, setLocalQuery] = useState(filters.query);
  const [localMinStars, setLocalMinStars] = useState(filters.minStars);
  const [localMaxStars, setLocalMaxStars] = useState(filters.maxStars);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('openlens_search_history');
    if (saved) {
        try {
            setRecentSearches(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse search history");
        }
    }
  }, []);

  // Sync local state
  useEffect(() => {
    if (filters.query !== localQuery) setLocalQuery(filters.query);
    if (filters.minStars !== localMinStars) setLocalMinStars(filters.minStars);
    if (filters.maxStars !== localMaxStars) setLocalMaxStars(filters.maxStars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.minStars, filters.maxStars]);

  // Debounce Query
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if (prev.query !== localQuery) {
          return { ...prev, query: localQuery };
        }
        return prev;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery, setFilters]);

  // Debounce Stars
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if (prev.minStars !== localMinStars || prev.maxStars !== localMaxStars) {
          return { ...prev, minStars: localMinStars, maxStars: localMaxStars };
        }
        return prev;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localMinStars, localMaxStars, setFilters]);

  const handleDirectChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortClick = (sortValue: string) => {
    const isAscendingDefault = sortValue === 'name' || sortValue === 'alphabetical';
    const newOrder = isAscendingDefault ? OrderOption.ASC : OrderOption.DESC;

    setFilters(prev => ({ 
        ...prev, 
        sort: sortValue as SortOption,
        order: newOrder
    }));
  };
  
  const handleMinStarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), localMaxStars - 100);
    setLocalMinStars(value);
  };

  const handleMaxStarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), localMinStars + 100);
    setLocalMaxStars(value);
  };

  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value) || 0;
      setLocalMinStars(val);
  };

  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value) || 0;
      setLocalMaxStars(val);
  };

  const saveToHistory = (query: string) => {
      if (!query || !query.trim()) return;
      const cleanQuery = query.trim();
      const newHistory = [cleanQuery, ...recentSearches.filter(q => q !== cleanQuery)].slice(0, 5);
      setRecentSearches(newHistory);
      localStorage.setItem('openlens_search_history', JSON.stringify(newHistory));
  };

  const triggerSearch = () => {
    saveToHistory(localQuery);
    setFilters(prev => ({ ...prev, query: localQuery }));
    // On mobile, close panel after search trigger
    setIsMobileOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      triggerSearch();
    }
  };

  const removeRecent = (q: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newHistory = recentSearches.filter(item => item !== q);
      setRecentSearches(newHistory);
      localStorage.setItem('openlens_search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
      setRecentSearches([]);
      localStorage.removeItem('openlens_search_history');
  };

  const handleRecentClick = (q: string) => {
      setLocalQuery(q);
      setFilters(prev => ({ ...prev, query: q }));
      // Move to top of list
      saveToHistory(q);
      setIsMobileOpen(false);
  };

  // Language Multi-Select Logic
  const toggleLanguage = (lang: string) => {
      if (lang === 'All') {
          setFilters(prev => ({ ...prev, language: [] }));
          setLangSearch(''); // Reset search on reset
          return;
      }
      
      setFilters(prev => {
          const current = prev.language;
          if (current.includes(lang)) {
              return { ...prev, language: current.filter(l => l !== lang) };
          } else {
              return { ...prev, language: [...current, lang] };
          }
      });
      setLangSearch(''); // Clear search after selection for better UX
  };

  const removeLanguage = (lang: string) => {
      setFilters(prev => ({ ...prev, language: prev.language.filter(l => l !== lang) }));
  };

  const handleResetFilters = () => {
    setFilters(prev => ({
        ...prev,
        query: '',
        language: [],
        license: 'All',
        minStars: 0,
        maxStars: MAX_STARS,
        sort: SortOption.STARS,
    }));
    setLangSearch('');
  };

  const filteredLanguages = ALL_LANGUAGES.filter(lang => 
      lang.toLowerCase().includes(langSearch.toLowerCase())
  );

  const getSortIcon = (value: string) => {
      switch(value) {
          case 'trending': return <Flame className="w-3.5 h-3.5" />;
          case 'stars': return <Star className="w-3.5 h-3.5" />;
          case 'forks': return <GitFork className="w-3.5 h-3.5" />;
          case 'updated': return <Clock className="w-3.5 h-3.5" />;
          default: return null;
      }
  };

  // Calculate active filters count for mobile badge
  const activeFiltersCount = 
    (filters.query ? 1 : 0) + 
    filters.language.length + 
    (filters.minStars > 0 || filters.maxStars < MAX_STARS ? 1 : 0) +
    (filters.sort !== SortOption.STARS ? 1 : 0);

  return (
    <aside className="w-full md:w-64 lg:w-72 xl:w-80 md:shrink-0 h-auto md:h-full px-4 md:px-8 py-4 md:py-8 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-white/5 bg-zinc-50/80 dark:bg-zinc-950/50 backdrop-blur-sm z-20 overflow-y-auto no-scrollbar transition-all duration-500">
      
      {/* Mobile Toggle Header */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden w-full flex items-center justify-between py-2 group focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
             <div className="p-1.5 rounded-md bg-zinc-200/50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                <SlidersHorizontal className="w-4 h-4" />
             </div>
             <span className="text-xs uppercase tracking-widest font-medium text-zinc-700 dark:text-zinc-300">
                 Filters
                 {activeFiltersCount > 0 && <span className="ml-2 text-zinc-400">({activeFiltersCount})</span>}
             </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isMobileOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Content Wrapper */}
      <div className={`${isMobileOpen ? 'flex pt-6 pb-2' : 'hidden'} md:flex flex-col gap-8 animate-in fade-in slide-in-from-top-2 duration-300 md:animate-none`}>
        
        {/* Search Input */}
        <div className="space-y-4">
            <div className="relative group mt-2">
            <input
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search GitHub"
                className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 py-3 pl-0 pr-8 text-2xl md:text-3xl font-display italic focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-700 placeholder:font-display placeholder:italic"
            />
            <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={triggerSearch}
                className="absolute right-0 top-4 text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors focus:outline-none"
            >
                {isLoading ? <span className="text-[12px] animate-pulse">Scanning</span> : <Search className="w-5 h-5" />}
            </motion.button>
            </div>

            {/* Recent Searches */}
            <AnimatePresence>
            {recentSearches.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-medium">
                            <History className="w-3 h-3" />
                            <span>Recent Inquiries</span>
                        </div>
                        <button onClick={clearHistory} className="text-[10px] text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Clear History">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {recentSearches.map(term => (
                            <motion.button
                                key={term}
                                onClick={() => handleRecentClick(term)}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="group flex items-center justify-between w-full text-left py-2 px-3 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100/50 dark:bg-white/5 border border-transparent hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-sm transition-all"
                            >
                                <span className="truncate pr-2 font-mono">{term}</span>
                                <div 
                                    onClick={(e) => removeRecent(term, e)} 
                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                                    role="button"
                                    aria-label="Remove search"
                                >
                                    <X className="w-3 h-3" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>

        {/* Repo Ordering */}
        <div className="space-y-4">
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    {SORT_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleSortClick(option.value)}
                            className={`group flex items-center justify-between px-3 md:px-4 py-3 text-[10px] md:text-[11px] transition-all border border-transparent rounded-sm uppercase tracking-normal font-medium relative overflow-hidden ${
                                filters.sort === option.value
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 border-zinc-200 dark:border-white/5'
                            }`}
                        >
                            <span className="flex items-center gap-2 relative z-10 text-start">
                            <span className={`opacity-70 ${filters.sort === option.value ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-400'}`}>
                                    {getSortIcon(option.value)}
                            </span>
                            {option.label}
                            </span>
                            {filters.sort === option.value && <motion.span layoutId="activeSort" className="relative z-10"><Check className="w-3.5 h-3.5" /></motion.span>}
                        </button>
                    ))}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleDirectChange('order', OrderOption.DESC)}
                        className={`flex items-center justify-center gap-2 py-2.5 text-[10px] md:text-[11px] uppercase tracking-widest border rounded-sm transition-all ${
                            filters.order === OrderOption.DESC
                            ? 'bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-white/20'
                            : 'text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10'
                        }`}
                    >
                        <ArrowDown className="w-3 h-3" /> Desc
                    </button>
                    <button
                        onClick={() => handleDirectChange('order', OrderOption.ASC)}
                        className={`flex items-center justify-center gap-2 py-2.5 text-[10px] md:text-[11px] uppercase tracking-widest border rounded-sm transition-all ${
                            filters.order === OrderOption.ASC
                            ? 'bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-white/20'
                            : 'text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10'
                        }`}
                    >
                        <ArrowUp className="w-3 h-3" /> Asc
                    </button>
                </div>
            </div>
        </div>

        {/* Stars Range Filter (Only for Repos) */}
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <label className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 dark:text-zinc-500 font-serif font-medium">
                    Stars
                </label>
            </div>
            
            <div className="relative w-full h-8 flex items-center group/slider">
                {/* Track */}
                <div className="absolute w-full h-[1px] bg-zinc-300 dark:bg-zinc-800">
                    <div 
                        className="h-full bg-zinc-800 dark:bg-zinc-400 transition-all duration-300"
                        style={{
                            marginLeft: `${(localMinStars / MAX_STARS) * 100}%`,
                            width: `${((localMaxStars - localMinStars) / MAX_STARS) * 100}%`
                        }}
                    ></div>
                </div>

                {/* Min Slider */}
                <input
                    type="range"
                    min="0"
                    max={MAX_STARS}
                    step="100"
                    value={localMinStars}
                    onChange={handleMinStarChange}
                    className="absolute w-full h-8 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-zinc-800 dark:[&::-webkit-slider-thumb]:bg-zinc-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:hover:bg-zinc-600 dark:[&::-webkit-slider-thumb]:hover:bg-white [&::-webkit-slider-thumb]:cursor-col-resize active:[&::-webkit-slider-thumb]:bg-black dark:active:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-y-125"
                />

                {/* Max Slider */}
                <input
                    type="range"
                    min="0"
                    max={MAX_STARS}
                    step="100"
                    value={localMaxStars}
                    onChange={handleMaxStarChange}
                    className="absolute w-full h-8 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-zinc-800 dark:[&::-webkit-slider-thumb]:bg-zinc-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:hover:bg-zinc-600 dark:[&::-webkit-slider-thumb]:hover:bg-white [&::-webkit-slider-thumb]:cursor-col-resize active:[&::-webkit-slider-thumb]:bg-black dark:active:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-y-125"
                />
            </div>

            <div className="flex justify-between items-center text-[12px] font-mono tracking-wider gap-4">
                <input 
                    type="number"
                    value={localMinStars}
                    onChange={handleMinInput}
                    className="w-20 bg-transparent border-b border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-200 text-center py-1 focus:outline-none focus:border-zinc-500 dark:focus:border-white/30 transition-colors"
                />
                <span className="text-zinc-400">-</span>
                <input 
                    type="number"
                    value={localMaxStars}
                    onChange={handleMaxInput}
                    className="w-20 bg-transparent border-b border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-200 text-center py-1 focus:outline-none focus:border-zinc-500 dark:focus:border-white/30 transition-colors"
                />
            </div>
        </div>

        {/* Language Filter (Common) */}
        <div className="space-y-4">
            
            {/* Language Search Input */}
            <div className="relative">
                <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search languages..."
                    className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-sm text-xs px-3 py-2 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 dark:focus:border-white/20 transition-colors"
                />
                {langSearch && (
                    <button 
                        onClick={() => setLangSearch('')}
                        className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
            
            {/* Selected Tags Display */}
            <AnimatePresence>
            {filters.language.length > 0 && (
                <motion.div 
                    className="flex flex-wrap gap-2 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {filters.language.map(lang => (
                        <motion.button 
                            key={lang}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={() => removeLanguage(lang)}
                            className="group flex items-center gap-2 px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100 rounded-full text-[12px] font-medium tracking-wide transition-all hover:opacity-85 shadow-sm"
                        >
                            {lang}
                            <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                    ))}
                </motion.div>
            )}
            </AnimatePresence>

            {/* Multi-Select List - Only shown when searching */}
            <AnimatePresence>
            {langSearch && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="max-h-56 overflow-y-auto no-scrollbar border border-zinc-200 dark:border-white/5 rounded-sm bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-inner"
                >
                    {filteredLanguages.length > 0 ? (
                        filteredLanguages.map((lang) => {
                            const isSelected = lang === 'All' 
                                ? filters.language.length === 0 
                                : filters.language.includes(lang);

                            return (
                                <button
                                    key={lang}
                                    onClick={() => toggleLanguage(lang)}
                                    className={`w-full flex items-center justify-between text-left px-4 py-2.5 text-xs transition-colors border-b border-zinc-100 dark:border-white/[0.02] last:border-0 ${
                                        isSelected 
                                        ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-white/10 font-medium' 
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200'
                                    }`}
                                >
                                    <span>{lang}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
                                </button>
                            );
                        })
                    ) : (
                        <div className="p-4 text-center text-xs text-zinc-400 italic">No matching languages</div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </div>

        <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-white/5">
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleResetFilters}
                className="w-full py-3 text-[12px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 transition-all duration-300"
            >
                Reset Filters
            </motion.button>
        </div>
      </div>
    </aside>
  );
};

export default FilterPanel;
