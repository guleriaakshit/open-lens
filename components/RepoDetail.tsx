
import React, { useState, useEffect } from 'react';
import { GitHubRepo, GitHubIssue, GitHubLabel, IssueFilterState } from '../types';
import { getRepoLanguages, getRepoIssues, getRepoLabels } from '../services/githubService';
import { ArrowLeft, Star, GitFork, AlertCircle, MessageSquare, ExternalLink, ChevronDown, Check, ArrowDown, ArrowUp, Loader2, Ban, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LANGUAGES_COLORS } from '../constants';

interface RepoDetailProps {
  repo: GitHubRepo;
  onReturn: () => void;
}

const RepoDetail: React.FC<RepoDetailProps> = ({ repo, onReturn }) => {
  const [languages, setLanguages] = useState<Record<string, number>>({});
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [labels, setLabels] = useState<GitHubLabel[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [issueFilters, setIssueFilters] = useState<IssueFilterState>({
    sort: 'created',
    direction: 'desc',
    labels: [],
  });

  // Dropdown states
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);

  useEffect(() => {
    // Fetch Languages
    getRepoLanguages(repo.owner.login, repo.name).then(setLanguages);
    // Fetch Labels
    getRepoLabels(repo.owner.login, repo.name).then(setLabels);
  }, [repo]);

  useEffect(() => {
    if (repo.has_issues === false) {
        setLoadingIssues(false);
        setIssues([]);
        return;
    }

    // Fetch Issues when filters change
    setLoadingIssues(true);
    setIssuesError(null);
    getRepoIssues(repo.owner.login, repo.name, issueFilters)
        .then(setIssues)
        .catch(err => {
            setIssuesError(err.message || "Failed to load issues");
            setIssues([]);
        })
        .finally(() => setLoadingIssues(false));
  }, [repo, issueFilters]);

  // Cast Object.values to number[] to avoid TS error 'Type unknown is not assignable to type number'
  const totalBytes: number = (Object.values(languages) as number[]).reduce((acc: number, curr: number) => acc + curr, 0);

  const getLanguagePercent = (bytes: number) => {
    if (totalBytes === 0) return '0%';
    return ((bytes / totalBytes) * 100).toFixed(1) + '%';
  };

  const getLanguageColor = (lang: string) => {
    return LANGUAGES_COLORS[lang] || '#94a3b8'; // default slate-400
  };

  const toggleLabel = (labelName: string) => {
      setIssueFilters(prev => {
          const exists = prev.labels.includes(labelName);
          return {
              ...prev,
              labels: exists ? prev.labels.filter(l => l !== labelName) : [...prev.labels, labelName]
          };
      });
  };

  const handleSortChange = (sort: 'created' | 'updated' | 'comments') => {
      setIssueFilters(prev => ({ ...prev, sort }));
      setShowSortMenu(false);
  };

  const handleDirectionChange = (direction: 'asc' | 'desc') => {
      setIssueFilters(prev => ({ ...prev, direction }));
      setShowSortMenu(false);
  };

  return (
    <div className="w-full min-h-[calc(100vh-96px)] bg-zinc-50 dark:bg-zinc-950 flex flex-col pt-8 pb-20 px-4 md:px-12 overflow-y-auto">
      <div className="max-w-7xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Navigation */}
        <button 
          onClick={onReturn}
          className="group flex items-center gap-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all duration-300 mb-8"
        >
            <div className="p-2 rounded-full border border-transparent group-hover:border-zinc-300 dark:group-hover:border-white/10 group-hover:bg-zinc-200 dark:group-hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Back to Index</span>
        </button>

        {/* Repo Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-zinc-200 dark:border-white/5 pb-12">
            <div>
                <h1 className="text-3xl md:text-5xl font-display font-medium text-zinc-900 dark:text-white mb-2">
                    {repo.name}
                </h1>
                <p className="text-xl text-zinc-500 dark:text-zinc-400 font-light flex items-center gap-2">
                    by <span className="font-medium text-zinc-800 dark:text-zinc-200">{repo.owner.login}</span>
                </p>
                {repo.description && (
                    <p className="mt-4 text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
                        {repo.description}
                    </p>
                )}
            </div>
            
            <div className="flex gap-4">
                <div className="flex flex-col items-center justify-center bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg p-4 min-w-[100px]">
                    <Star className="w-5 h-5 mb-1 text-amber-500" />
                    <span className="font-bold text-lg">{repo.stargazers_count.toLocaleString()}</span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Stars</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg p-4 min-w-[100px]">
                    <GitFork className="w-5 h-5 mb-1 text-zinc-500" />
                    <span className="font-bold text-lg">{repo.forks_count.toLocaleString()}</span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">Forks</span>
                </div>
                <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg p-4 min-w-[100px] hover:opacity-90 transition-opacity"
                >
                    <ExternalLink className="w-5 h-5 mb-1" />
                    <span className="font-bold text-lg">Visit</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-80">GitHub</span>
                </a>
            </div>
        </div>

        {/* Language Breakdown */}
        <div className="mb-16">
            <h3 className="text-sm uppercase tracking-widest font-medium text-zinc-500 mb-4">Language Composition</h3>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-zinc-100 dark:bg-white/5">
                {Object.entries(languages).map(([lang, bytes]) => (
                    <div 
                        key={lang}
                        className="h-full"
                        style={{ 
                            width: getLanguagePercent(bytes as number),
                            backgroundColor: getLanguageColor(lang)
                        }}
                        title={`${lang}: ${getLanguagePercent(bytes as number)}`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                 {Object.entries(languages).map(([lang, bytes]) => (
                    <div key={lang} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLanguageColor(lang) }}></div>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{lang}</span>
                        <span className="text-xs text-zinc-400">{getLanguagePercent(bytes as number)}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Issues Explorer */}
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-display text-zinc-900 dark:text-white">Issues & Tasks</h2>
                
                {repo.has_issues !== false && (
                    /* Filters Toolbar */
                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* Sort Dropdown - Screenshot Style */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowSortMenu(!showSortMenu)}
                                className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-md text-xs font-medium hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <span>Sort: <span className="text-zinc-900 dark:text-white capitalize">{issueFilters.sort}</span></span>
                                <ChevronDown className="w-3 h-3 text-zinc-500" />
                            </button>

                            <AnimatePresence>
                                {showSortMenu && (
                                    <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)}></div>
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden"
                                    >
                                        <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-2 font-semibold">Sort by</div>
                                            {['created', 'updated', 'comments'].map((option) => (
                                                <button 
                                                    key={option}
                                                    onClick={() => handleSortChange(option as any)}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md text-left capitalize"
                                                >
                                                    <span>{option.replace('created', 'Created on').replace('updated', 'Last updated').replace('comments', 'Total comments')}</span>
                                                    {issueFilters.sort === option && <Check className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="p-2">
                                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-2 font-semibold">Order</div>
                                            <button 
                                                onClick={() => handleDirectionChange('asc')}
                                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md text-left"
                                            >
                                                <div className="flex items-center gap-2"><ArrowUp className="w-3 h-3" /> Oldest</div>
                                                {issueFilters.direction === 'asc' && <Check className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={() => handleDirectionChange('desc')}
                                                className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md text-left"
                                            >
                                                <div className="flex items-center gap-2"><ArrowDown className="w-3 h-3" /> Newest</div>
                                                {issueFilters.direction === 'desc' && <Check className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Label Filter */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowLabelMenu(!showLabelMenu)}
                                className={`flex items-center gap-2 px-3 py-2 border rounded-md text-xs font-medium transition-colors ${issueFilters.labels.length > 0 ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 hover:bg-zinc-200'}`}
                            >
                                <span>Labels {issueFilters.labels.length > 0 && `(${issueFilters.labels.length})`}</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            
                            <AnimatePresence>
                                {showLabelMenu && (
                                    <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowLabelMenu(false)}></div>
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 p-2"
                                    >
                                        {labels.length > 0 ? labels.map(label => (
                                            <button 
                                                key={label.id}
                                                onClick={() => toggleLabel(label.name)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md text-left"
                                            >
                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `#${label.color}` }}></div>
                                                <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{label.name}</span>
                                                {issueFilters.labels.includes(label.name) && <Check className="w-3 h-3 shrink-0" />}
                                            </button>
                                        )) : (
                                            <div className="p-2 text-xs text-zinc-500 text-center">No labels found</div>
                                        )}
                                    </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                    </div>
                )}
            </div>

            {/* Issues List */}
            <div className="space-y-3 min-h-[300px]">
                {repo.has_issues === false ? (
                    <div className="w-full py-20 flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-white/5 rounded-lg">
                        <Ban className="w-8 h-8 text-zinc-400 mb-4" />
                        <span className="text-zinc-500 font-medium">Issues are disabled for this repository</span>
                    </div>
                ) : issuesError ? (
                     <div className="w-full py-20 flex flex-col items-center justify-center border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-lg">
                        <AlertTriangle className="w-8 h-8 text-red-400 mb-4" />
                        <span className="text-red-500 dark:text-red-400 font-medium">{issuesError}</span>
                        <button 
                            onClick={() => {
                                setLoadingIssues(true);
                                setIssuesError(null);
                                getRepoIssues(repo.owner.login, repo.name, issueFilters)
                                    .then(setIssues)
                                    .catch(err => {
                                        setIssuesError(err.message || "Failed to load issues");
                                        setIssues([]);
                                    })
                                    .finally(() => setLoadingIssues(false));
                            }}
                            className="mt-4 px-4 py-2 text-xs uppercase tracking-wider font-medium text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : loadingIssues ? (
                    <div className="w-full py-20 flex flex-col items-center justify-center text-zinc-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <span className="text-xs uppercase tracking-widest">Loading Tasks...</span>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                        <p className="text-zinc-500 font-serif italic text-lg">No open issues found.</p>
                    </div>
                ) : (
                    issues.map(issue => (
                        <motion.a 
                            key={issue.id}
                            href={issue.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="block group bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 p-4 rounded-lg hover:border-zinc-400 dark:hover:border-white/20 transition-all"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="mt-1 shrink-0 text-green-600 dark:text-green-500">
                                        <AlertCircle className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug break-words">
                                            {issue.title} <span className="text-zinc-400 font-light">#{issue.number}</span>
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-zinc-500">
                                            <span>Opened on {new Date(issue.created_at).toLocaleDateString()}</span>
                                            <span>by {issue.user.login}</span>
                                            {issue.comments > 0 && (
                                                <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                    <MessageSquare className="w-3 h-3" /> {issue.comments}
                                                </span>
                                            )}
                                        </div>
                                        {issue.labels.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {issue.labels.map(label => (
                                                    <span 
                                                        key={label.id} 
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                                        style={{ 
                                                            backgroundColor: `#${label.color}20`, 
                                                            color: `#${label.color}`,
                                                            borderColor: `#${label.color}40` 
                                                        }}
                                                    >
                                                        {label.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.a>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default RepoDetail;
