
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ArrowUpRight, Briefcase, Github, Link as LinkIcon, Loader2, MapPin, Moon, Plus, Star, Sun, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import FilterPanel from './components/FilterPanel';
import Landing from './components/Landing';
import RepoCard from './components/RepoCard';
import { ITEMS_PER_PAGE, MAX_STARS } from './constants';
import { getSessionRepos, getUserProfile, getUserTopRepos, saveSessionRepos, searchRepositories } from './services/githubService';
import { FilterState, GitHubRepo, GitHubUserProfile, OrderOption, SortOption } from './types';

// Lazy load only secondary views
const About = React.lazy(() => import('./components/About'));

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Hydrate repos from session storage for instant load if returning
  const [repos, setRepos] = useState<GitHubRepo[]>(() => getSessionRepos());

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  // Pagination & View State
  const [page, setPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'landing' | 'search' | 'user' | 'about'>(() => {
    const saved = localStorage.getItem('openlens_view_mode');
    // Only restore search or user modes to prevent stuck states
    if (saved === 'search' || saved === 'user') return saved as any;
    return 'landing';
  });

  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // User Profile State
  const [userProfile, setUserProfile] = useState<GitHubUserProfile | null>(null);
  const [topRepos, setTopRepos] = useState<GitHubRepo[]>([]);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  // Remove profileError from state if not needed for logic, but might be useful for fallback text
  const [profileError, setProfileError] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState<boolean>(true);

  // Track the ID of the last requested fetch to prevent race conditions
  const lastRequestId = useRef<number>(0);

  // Initialize filters from storage or default
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const saved = localStorage.getItem('openlens_filters');
      if (saved) return JSON.parse(saved);
    } catch(e) {
      console.warn("Failed to parse saved filters", e);
    }
    return {
      query: '',
      language: [],
      license: 'All',
      sort: SortOption.STARS,
      order: OrderOption.DESC,
      minStars: 0,
      maxStars: MAX_STARS,
    };
  });

  // Apply theme to HTML element directly
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Persist Filters on change
  useEffect(() => {
    localStorage.setItem('openlens_filters', JSON.stringify(filters));
  }, [filters]);

  // Persist ViewMode on change (only main modes)
  useEffect(() => {
    if (viewMode === 'search' || viewMode === 'user') {
      localStorage.setItem('openlens_view_mode', viewMode);
    }
  }, [viewMode]);

  const toggleTheme = () => {
    if (!(document as any).startViewTransition) {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
      return;
    }
    (document as any).startViewTransition(() => {
      flushSync(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
      });
    });
  };

  // Fetch User Profile and Top Repos when selectedUser changes
  useEffect(() => {
    if (viewMode === 'user' && selectedUser) {
      setUserProfile(null);
      setTopRepos([]);
      setLoadingProfile(true);
      setProfileError(null);

      const fetchProfileData = async () => {
        try {
          const [profile, repos] = await Promise.all([
            getUserProfile(selectedUser),
            getUserTopRepos(selectedUser)
          ]);

          if (profile) {
            setUserProfile(profile);
          } else {
            setProfileError("User profile could not be found.");
          }
          setTopRepos(repos);
        } catch (err) {
            console.error(err);
            setProfileError("Failed to load user profile.");
        } finally {
            setLoadingProfile(false);
        }
      };

      fetchProfileData();
    }
  }, [viewMode, selectedUser]);

  const fetchData = useCallback(async (isLoadMore: boolean = false) => {
    if (viewMode === 'about') return;

    // Background refresh logic:
    // If we have repos already (restored from cache) and this is the initial page load,
    // don't set loading=true to prevent UI flickering. We just update silently.
    const isBackgroundRefresh = !isLoadMore && page === 1 && repos.length > 0 && lastRequestId.current === 0;

    if (!isBackgroundRefresh) {
        setLoading(true);
    }

    setError(null);
    if (!isLoadMore) setSearchWarning(null); // Clear warning on new search only

    const requestId = ++lastRequestId.current;
    const currentPage = isLoadMore ? page : 1;

    try {
      const response = await searchRepositories(filters, currentPage, selectedUser);

      if (requestId !== lastRequestId.current) return;

      if (response.warning) {
          setSearchWarning(response.warning);
      }

      let newRepos: GitHubRepo[] = [];
      if (isLoadMore) {
        newRepos = [...repos, ...response.items];
      } else {
        newRepos = response.items;
      }

      setRepos(newRepos);

      // Save snapshot for next session instant load
      saveSessionRepos(newRepos);

      if (response.items.length < ITEMS_PER_PAGE && response.total_count < ITEMS_PER_PAGE * currentPage) {
          setHasMore(false);
      } else {
          setHasMore(true);
      }

    } catch (err: any) {
      if (requestId !== lastRequestId.current) return;
      setError(err.message || 'An unexpected error occurred.');
      if (!isLoadMore) setRepos([]);
    } finally {
      if (requestId === lastRequestId.current) {
        setLoading(false);
      }
    }
  }, [filters.query, filters.language, filters.license, filters.sort, filters.order, filters.minStars, filters.maxStars, page, selectedUser, viewMode, repos.length]);

  // Initial load & Page change trigger
  useEffect(() => {
    if (viewMode === 'about') return;
    if (viewMode === 'landing') return; // Don't fetch on landing

    if (page === 1) {
        fetchData(false);
    } else {
        fetchData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.query, filters.language, filters.license, filters.sort, filters.order, filters.minStars, filters.maxStars, selectedUser, viewMode]);

  // Reset page when filters change (only those affecting repo list)
  useEffect(() => {
      if (viewMode === 'about' || viewMode === 'landing') return;
      setPage(1);
      setHasMore(true);
      // We do NOT clear repos here immediately to avoid white flash before new data arrives,
      // The fetchData function will overwrite repos.
  }, [filters.query, filters.language, filters.license, filters.sort, filters.order, filters.minStars, filters.maxStars, selectedUser]);

  const handleSearch = () => {
    setPage(1);
    fetchData(false);
  };

  const handleUserClick = (username: string) => {
      setSelectedUser(username);
      setViewMode('user');
      setFilters(prev => ({
          ...prev,
          query: '',
          minStars: 0,
          maxStars: MAX_STARS,
          sort: SortOption.UPDATED,
      }));
  };

  const handleBackToSearch = () => {
      setSelectedUser(null);
      setViewMode('search');
      setFilters(prev => ({ ...prev, query: '' }));
      setPage(1);
  };

  const toggleAbout = () => {
      if (viewMode === 'about') {
          if (selectedUser) {
              setViewMode('user');
          } else {
              setViewMode('search');
          }
      } else {
          setViewMode('about');
      }
  };

  const handleEnterApp = () => {
      setViewMode('search');
  };

  const handleLanguageClick = (lang: string) => {
      if (!filters.language.includes(lang)) {
          setFilters(prev => ({ ...prev, language: [...prev.language, lang] }));
      }
  };

  const formatNumber = (num: number) => {
    return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
  };

  // Helper to construct a safe profile object even if API failed
  const getDisplayProfile = (): GitHubUserProfile => {
      if (userProfile) return userProfile;
      // Fallback profile
      return {
          login: selectedUser || 'Unknown',
          id: 0,
          avatar_url: `https://github.com/${selectedUser}.png`, // Fallback to standard GitHub avatar URL pattern
          html_url: `https://github.com/${selectedUser}`,
          name: selectedUser,
          company: null,
          blog: null,
          location: null,
          email: null,
          bio: null, // Don't show error message in bio, just empty
          public_repos: 0,
          followers: 0,
          following: 0,
          created_at: new Date().toISOString()
      };
  };

  const containerVariants = {
      hidden: { opacity: 0 },
      show: {
          opacity: 1,
          transition: {
              staggerChildren: 0.08
          }
      }
  };

  const displayProfile = getDisplayProfile();

  return (
    <div className="h-screen w-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 font-light relative overflow-hidden flex flex-col">

      {/* PERSISTENT BACKGROUND - Attached to Viewport */}
      <div className="fixed inset-0 bg-grid-pattern z-0 opacity-[0.4] pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-zinc-200/40 dark:from-zinc-900/40 to-transparent pointer-events-none z-0" />

      {/* Using mode="popLayout" allows the exiting component to 'pop' out of the layout flow
          while the entering component renders on top/behind, preventing the blank frame flash. */}
      <AnimatePresence mode="popLayout">
        {viewMode === 'landing' ? (
           <Landing key="landing" onEnter={handleEnterApp} />
        ) : (
           <motion.div
             key="app-content"
             initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
             animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
             exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
             transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
             className="flex flex-col h-full w-full relative z-10 overflow-hidden"
             style={{ willChange: 'opacity, transform, filter' }}
           >
              {/* Header - Fixed Height */}
              <header className="shrink-0 z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 h-20 md:h-24 flex items-center justify-between px-4 md:px-12 shadow-sm dark:shadow-none transition-colors duration-300">
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <button
                      onClick={() => viewMode === 'about' ? toggleAbout() : handleBackToSearch()}
                      className="text-2xl md:text-3xl font-logo tracking-wide text-zinc-900 dark:text-zinc-100 cursor-pointer select-none focus:outline-none shrink-0"
                    >
                        Open<span className="italic">Lens</span>
                    </button>

                    {viewMode === 'user' && (
                        <button
                            onClick={handleBackToSearch}
                            className="group flex items-center gap-2 md:gap-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all duration-300 ml-2 md:ml-4 shrink-0"
                        >
                            <div className="p-2 rounded-full border border-transparent group-hover:border-zinc-300 dark:group-hover:border-white/10 group-hover:bg-zinc-200 dark:group-hover:bg-white/5 transition-all">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            </div>
                            <span className="text-[12px] uppercase tracking-[0.2em] font-medium whitespace-nowrap hidden sm:inline">Return</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4 md:gap-8 shrink-0">
                  {viewMode !== 'about' && (
                    <div className="hidden md:flex flex-col items-end animate-in fade-in duration-500">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 mb-1 font-medium">
                            {viewMode === 'user' ? `Collection` : `Global Index`}
                        </div>
                        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            {viewMode === 'user' ? selectedUser : `${repos.length.toLocaleString()} Artifacts`}
                        </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="relative w-14 h-8 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/50 shadow-inner flex items-center px-1 transition-all duration-300 group focus:outline-none hover:border-zinc-300 dark:hover:border-white/20"
                        aria-label="Toggle Theme"
                    >
                        <div className={`absolute w-6 h-6 rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-6 bg-zinc-800' : 'translate-x-0 bg-white'}`}>
                            {theme === 'dark' ? (
                                <Moon className="w-3 h-3 text-zinc-400" />
                            ) : (
                                <Sun className="w-3 h-3 text-amber-500" />
                            )}
                        </div>
                    </button>
                  </div>
                </div>
              </header>

              <main className="flex-1 flex flex-col md:flex-row min-h-0 relative z-10">

                {viewMode === 'about' ? (
                   <React.Suspense fallback={null}>
                      <About onReturn={toggleAbout} />
                   </React.Suspense>
                ) : (
                  <>
                    <FilterPanel
                        filters={filters}
                        setFilters={setFilters}
                        isLoading={loading}
                    />

                    {/* Scrollable Main Content Area */}
                    <section className="flex-1 overflow-y-auto min-h-0 p-3 md:p-6 lg:p-10 2xl:p-12 items-start min-w-0">
                        <div className="max-w-8xl mx-auto w-full pb-20">

                        {/* Warning Banner */}
                        <AnimatePresence>
                            {searchWarning && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -20, height: 0 }}
                                    className="mb-8"
                                >
                                    <div className="flex items-center justify-between gap-4 p-4 rounded bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-200">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-5 h-5 shrink-0" />
                                            <span className="text-sm font-medium">{searchWarning}</span>
                                        </div>
                                        <button
                                            onClick={() => setSearchWarning(null)}
                                            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* User Profile Section */}
                        {viewMode === 'user' && selectedUser && (
                            <div className="mb-12 border-b border-zinc-200 dark:border-white/5 pb-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-8 font-medium relative z-10">
                                  <button onClick={handleBackToSearch} className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">Global Index</button>
                                  <span>/</span>
                                  <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-[150px] sm:max-w-none">{selectedUser}</span>
                                </div>

                                {loadingProfile ? (
                                    <div className="flex flex-col items-start gap-6 relative z-10 animate-pulse">
                                        <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800 mb-4"></div>
                                        <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                                        <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start relative z-10">
                                        <div className="relative group shrink-0 mx-auto md:mx-0">
                                            <a href={displayProfile.html_url} target="_blank" rel="noopener noreferrer" title="View GitHub Profile">
                                                <div className="absolute inset-0 bg-zinc-900/5 dark:bg-white/10 rounded-full blur-xl scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                                <img
                                                  src={displayProfile.avatar_url}
                                                  alt={displayProfile.login}
                                                  className="relative w-28 h-28 md:w-40 md:h-40 rounded-full border-2 border-zinc-100 dark:border-zinc-800 shadow-2xl bg-zinc-100 dark:bg-zinc-800 group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-colors"
                                                  onError={(e) => {
                                                      // Fallback to a generic placeholder if even github avatar fails
                                                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${selectedUser}&background=random`;
                                                  }}
                                                />
                                                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                    <ArrowUpRight className="w-8 h-8 text-white" />
                                                </div>
                                            </a>
                                        </div>

                                        <div className="flex-1 space-y-4 w-full min-w-0">
                                            <div className="text-center md:text-left">
                                                <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-medium text-zinc-900 dark:text-white tracking-tight mb-1 flex items-center justify-center md:justify-start gap-3 break-words">
                                                    <a href={displayProfile.html_url} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-3 group/link">
                                                        {displayProfile.name || selectedUser}
                                                        <ArrowUpRight className="w-5 h-5 md:w-8 md:h-8 opacity-0 -translate-y-1 translate-x-1 group-hover/link:opacity-50 group-hover/link:translate-y-0 group-hover/link:translate-x-0 transition-all text-zinc-400" />
                                                    </a>
                                                </h2>
                                                <a href={displayProfile.html_url} target="_blank" rel="noopener noreferrer" className="text-base md:text-xl font-mono text-zinc-400 dark:text-zinc-500 mb-4 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors w-fit block mx-auto md:mx-0">
                                                    @{displayProfile.login}
                                                </a>

                                                {displayProfile.bio && (
                                                    <p className="text-zinc-600 dark:text-zinc-300 text-sm md:text-base font-light italic max-w-2xl leading-relaxed mb-6 border-l-2 border-zinc-200 dark:border-zinc-800 pl-4 mx-auto md:mx-0 text-left">
                                                        "{displayProfile.bio}"
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap justify-center md:justify-start gap-x-6 md:gap-x-8 gap-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {displayProfile.company && (
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="w-4 h-4 text-zinc-400" />
                                                        <span>{displayProfile.company}</span>
                                                    </div>
                                                )}
                                                {displayProfile.location && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-zinc-400" />
                                                        <span>{displayProfile.location}</span>
                                                    </div>
                                                )}
                                                {displayProfile.blog && (
                                                    <a href={displayProfile.blog.startsWith('http') ? displayProfile.blog : `https://${displayProfile.blog}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors max-w-full">
                                                        <LinkIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                                                        <span className="truncate">{displayProfile.blog}</span>
                                                    </a>
                                                )}
                                            </div>

                                            <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-8 pt-6 border-t border-zinc-100 dark:border-white/5 mt-6">
                                                {(displayProfile.followers > 0 || displayProfile.following > 0 || displayProfile.public_repos > 0) ? (
                                                <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-8 w-full 2xl:w-fit">
                                                    <div className="flex flex-col items-center md:items-start text-center md:text-left p-2 md:p-0 bg-zinc-50 dark:bg-white/5 md:bg-transparent md:dark:bg-transparent rounded-md md:rounded-none">
                                                        <span className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">{displayProfile.followers.toLocaleString()}</span>
                                                        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-zinc-500">Followers</span>
                                                    </div>
                                                    <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
                                                    <div className="flex flex-col items-center md:items-start text-center md:text-left p-2 md:p-0 bg-zinc-50 dark:bg-white/5 md:bg-transparent md:dark:bg-transparent rounded-md md:rounded-none">
                                                        <span className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">{displayProfile.following.toLocaleString()}</span>
                                                        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-zinc-500">Following</span>
                                                    </div>
                                                    <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
                                                    <div className="flex flex-col items-center md:items-start text-center md:text-left p-2 md:p-0 bg-zinc-50 dark:bg-white/5 md:bg-transparent md:dark:bg-transparent rounded-md md:rounded-none">
                                                        <span className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">{displayProfile.public_repos.toLocaleString()}</span>
                                                        <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-zinc-500">Repos</span>
                                                    </div>
                                                </div>
                                                ) : null}

                                                {topRepos.length > 0 && <div className="hidden 2xl:block w-px h-12 bg-zinc-200 dark:bg-zinc-800"></div>}

                                                {topRepos.length > 0 && (
                                                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                                                         <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium text-center 2xl:text-left">Most Celebrated</span>
                                                         <div className="flex flex-wrap justify-center 2xl:justify-start gap-2">
                                                             {topRepos.map(repo => (
                                                                 <button onClick={() => window.open(repo.html_url, '_blank')} key={repo.id} className="group flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-100/50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/20 transition-all max-w-full">
                                                                    <Star className="w-3 h-3 text-amber-500/70 shrink-0" fill="currentColor" />
                                                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white shrink-0">{formatNumber(repo.stargazers_count)}</span>
                                                                    <span className="text-xs text-zinc-500 dark:text-zinc-500 font-light truncate max-w-[120px]">{repo.name}</span>
                                                                 </button>
                                                             ))}
                                                         </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="w-full h-80 flex flex-col items-center justify-center text-center border border-red-500/10 bg-red-500/5 p-12 rounded-lg backdrop-blur-sm mb-12 animate-in fade-in zoom-in-95 duration-500">
                                <p className="text-red-500 dark:text-red-300 font-serif text-2xl mb-3 tracking-wide">Connection Interrupted</p>
                                <p className="text-red-600/60 dark:text-red-400/60 text-sm font-mono mb-8">{error}</p>
                                <button
                                    onClick={handleSearch}
                                    className="px-8 py-3 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-600 dark:text-red-200 text-[13px] uppercase tracking-[0.2em] transition-all duration-300"
                                >
                                    Retry Connection
                                </button>
                            </div>
                        )}

                        {!loading && !error && repos.length === 0 && (
                            <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center opacity-50 animate-in fade-in zoom-in-95 duration-700">
                                <div className="w-20 h-20 border border-zinc-300 dark:border-zinc-800 rounded-full flex items-center justify-center mb-6 bg-zinc-50 dark:bg-zinc-900/50">
                                    <Github className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                                </div>
                                <p className="text-4xl font-display text-zinc-800 dark:text-zinc-200 mb-4 italic">No Artifacts Found</p>
                                <p className="text-zinc-500 dark:text-zinc-500 text-xs font-mono tracking-[0.2em] uppercase">Adjust filters to broaden scope</p>
                            </div>
                        )}

                        {/* RENDER CONTENT BASED ON ACTIVE TAB */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="repos-grid"
                                className="grid grid-cols-1 2xl:grid-cols-2 gap-4 md:gap-6 lg:gap-8"
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                exit={{ opacity: 0 }}
                            >
                                {repos.map((repo) => (
                                    <RepoCard
                                        key={repo.id}
                                        repo={repo}
                                        onUserClick={handleUserClick}
                                        onLanguageClick={handleLanguageClick}
                                    />
                                ))}
                            </motion.div>
                        </AnimatePresence>

                        {/* Bottom Loading / End State / Load More */}
                        {(loading || hasMore) && (
                            <div className="mt-16 mb-20 flex flex-col items-center">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-zinc-200 dark:bg-white/20 blur-xl rounded-full"></div>
                                            <Loader2 className="relative w-10 h-10 text-zinc-900 dark:text-white animate-spin" />
                                        </div>
                                        <p className="mt-8 text-zinc-500 font-serif text-[12px] uppercase tracking-[0.3em] animate-pulse">
                                            {page === 1 ? "Initializing Archive" : "Retrieving Data"}
                                        </p>
                                    </div>
                                ) : !error && hasMore && (
                                     <button
                                        onClick={() => setPage(prev => prev + 1)}
                                        className="group relative px-10 py-4 bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-[0.25em] hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all duration-500"
                                     >
                                        <span className="relative z-10 flex items-center gap-3">
                                            Load More Artifacts
                                            <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" />
                                        </span>
                                     </button>
                                )}

                                {!loading && !error && !hasMore && (
                                    <div className="flex flex-col items-center gap-4 opacity-30 hover:opacity-60 transition-opacity">
                                        <div className="w-px h-16 bg-gradient-to-b from-transparent via-zinc-400 dark:via-zinc-500 to-transparent"></div>
                                        <span className="text-[12px] uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400">End of Index</span>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </section>
                  </>
                )}
                  </main>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
