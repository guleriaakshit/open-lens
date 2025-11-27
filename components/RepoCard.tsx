
import React, { useState, useEffect } from 'react';
import { Star, GitFork, ArrowUpRight, Clock, Copy, Check } from 'lucide-react';
import { GitHubRepo } from '../types';
import { getRepoLanguages } from '../services/githubService';
import { motion, AnimatePresence } from 'framer-motion';

interface RepoCardProps {
  repo: GitHubRepo;
  onUserClick: (username: string) => void;
  onLanguageClick?: (language: string) => void;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, onUserClick, onLanguageClick }) => {
  const [copied, setCopied] = useState(false);
  
  // Language stats
  const [repoLanguages, setRepoLanguages] = useState<{name: string, percent: number}[]>([]);

  useEffect(() => {
    // Fetch languages
    getRepoLanguages(repo.owner.login, repo.name).then(langs => {
        const total = Object.values(langs).reduce((acc, curr) => acc + curr, 0);
        if (total > 0) {
            const sorted = Object.entries(langs)
                .map(([name, bytes]) => ({ name, percent: (bytes / total) * 100 }))
                .sort((a, b) => b.percent - a.percent);
            setRepoLanguages(sorted);
        } else if (repo.language) {
            // Fallback to primary if api returns empty or fails, but usually api returns empty object if no code
            setRepoLanguages([{ name: repo.language, percent: 100 }]);
        }
    });

  }, [repo.id, repo.owner.login, repo.name, repo.language]);

  const formatNumber = (num: number) => {
      return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
  };

  const getLastUpdated = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return 'Just now';
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCopyClone = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      navigator.clipboard.writeText(repo.html_url + ".git");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleLangClick = (e: React.MouseEvent, lang: string) => {
      e.stopPropagation();
      if (onLanguageClick) {
          onLanguageClick(lang);
      }
  };

  // Prefer pushed_at for "Activity" freshness, fallback to updated_at
  const lastActiveDate = repo.pushed_at || repo.updated_at;

  return (
    <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="group relative flex flex-col h-full p-4 md:p-8 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-white/5 transition-all duration-300 ease-out overflow-hidden rounded-sm w-full min-w-0"
    >
      {/* Hover Gradient Border Effect */}
      <div className="absolute inset-0 border border-transparent group-hover:border-zinc-300 dark:group-hover:border-white/10 rounded-sm transition-colors duration-500 pointer-events-none" />
      <div className="absolute top-0 right-0 p-12 bg-gradient-to-b from-zinc-100/50 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-tr-sm" />

      <div className="relative z-10">
        {/* Top Meta Row */}
        <div className="flex justify-between items-start mb-5 md:mb-7">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUserClick(repo.owner.login);
            }}
            className="flex items-center gap-3 group/user focus:outline-none rounded-sm cursor-pointer max-w-[75%]"
            aria-label={`View profile of ${repo.owner.login}`}
          >
            <div className="relative shrink-0">
                <div className="absolute inset-0 bg-zinc-900/10 dark:bg-white/20 rounded-full blur-md opacity-0 group-hover/user:opacity-100 transition-opacity duration-500" />
                <img 
                  src={repo.owner.avatar_url} 
                  alt="" 
                  className="relative w-9 h-9 rounded-full grayscale opacity-90 group-hover/user:grayscale-0 group-hover/user:opacity-100 transition-all duration-500 border border-zinc-200 dark:border-white/10 shadow-sm"
                />
            </div>
            <div className="flex flex-col items-start min-w-0">
                 <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1.5">Owner</span>
                 <span className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-300 group-hover/user:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors truncate w-full text-left">
                    {repo.owner.login}
                </span>
            </div>
          </button>
          
          <div className="flex flex-col items-end gap-1">
            {repoLanguages.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {repoLanguages.map((lang, index) => (
                        <button
                            key={lang.name}
                            onClick={(e) => handleLangClick(e, lang.name)}
                            className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/30 px-2 py-0.5 rounded-sm hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60 transition-all shadow-sm backdrop-blur-sm"
                            title={`${lang.name}: ${lang.percent.toFixed(1)}%`}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>
            ) : repo.language ? (
                <button
                    onClick={(e) => handleLangClick(e, repo.language!)}
                    className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/30 px-2.5 py-1 rounded-sm group-hover:bg-zinc-200/80 dark:group-hover:bg-zinc-700/40 transition-all shadow-sm backdrop-blur-sm"
                >
                    {repo.language}
                </button>
            ) : null}
          </div>
        </div>

        {/* Title & Link */}
        <div className="mb-5 relative z-10">
            <h3 className="text-xl md:text-2xl font-display font-medium text-zinc-900 dark:text-zinc-100 mb-2 leading-tight group-hover:text-black dark:group-hover:text-white transition-colors break-words">
            <a 
                href={repo.html_url} 
                target="_blank"
                rel="noopener noreferrer"
                className="focus:outline-none flex items-baseline gap-2 group/link w-fit rounded-sm cursor-pointer"
                aria-label={`Open repository ${repo.name} on GitHub`}
            >
                <span className="hover:underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 decoration-1">{repo.name}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 opacity-0 -translate-y-1 translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-y-0 group-hover/link:translate-x-0 transition-all duration-300 shrink-0" aria-hidden="true" />
            </a>
            </h3>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-light leading-relaxed line-clamp-3 group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors duration-500 break-words">
            {repo.description || "No description provided for this repository."}
            </p>
        </div>

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                {repo.topics.map(topic => (
                    <span key={topic} className="px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-500 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-sm transition-all cursor-default">
                        #{topic}
                    </span>
                ))}
            </div>
        )}
      </div>

      <div className="relative z-20 mt-auto min-w-0">
        {/* Footer Metrics */}
        <div className="flex flex-wrap items-center justify-between pt-5 md:pt-6 border-t border-zinc-200/60 dark:border-white/5 gap-y-3">
            <div className="flex items-center gap-6 text-zinc-500 font-mono text-[11px] shrink-0" role="list" aria-label="Repository Statistics">
              <div role="listitem" className="flex items-center gap-1.5 group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors cursor-help" title="Stars" aria-label={`${repo.stargazers_count} stars`}>
                  <Star className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                  <span>{formatNumber(repo.stargazers_count)}</span>
              </div>
              <div role="listitem" className="flex items-center gap-1.5 group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors cursor-help" title="Forks" aria-label={`${repo.forks_count} forks`}>
                  <GitFork className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                  <span>{formatNumber(repo.forks_count)}</span>
              </div>
              <div role="listitem" className="flex items-center gap-1.5 group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors cursor-help" title="Last Activity" aria-label={`Last activity ${getLastUpdated(lastActiveDate)}`}>
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
                  <span>{getLastUpdated(lastActiveDate)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-semibold shrink-0 ml-auto sm:ml-0">
                {/* Clone Button */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyClone}
                    className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors relative focus:outline-none rounded-sm py-1 px-1.5 hover:bg-zinc-100 dark:hover:bg-white/5"
                    title="Copy Clone URL"
                    aria-label={copied ? "Copied clone URL to clipboard" : "Copy clone URL to clipboard"}
                >
                    <AnimatePresence mode='wait' initial={false}>
                        {copied ? (
                            <motion.span 
                                key="check"
                                initial={{ scale: 0.5, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                            >
                                <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                            </motion.span>
                        ) : (
                            <motion.span 
                                key="copy"
                                initial={{ scale: 0.5, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                            >
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <span className="hidden sm:inline transition-colors duration-200">{copied ? <span className="text-emerald-600 dark:text-emerald-400">Copied</span> : "Clone"}</span>
                </motion.button>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RepoCard;
