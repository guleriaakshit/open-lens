
import React from 'react';
import { MessageSquare, Calendar, ExternalLink, AlertCircle, GitPullRequest } from 'lucide-react';
import { GitHubIssue } from '../types';
import { LANGUAGES_COLORS } from '../constants';

interface IssueCardProps {
  issue: GitHubIssue;
  onRepoClick: () => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, onRepoClick }) => {
  const repoName = issue.repository?.name || 'Unknown Repo';
  const repoOwner = issue.repository?.owner.login || 'Unknown';
  const language = issue.repository?.language;

  const getLanguageColor = (lang: string) => {
    return LANGUAGES_COLORS[lang] || '#94a3b8';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isPR = !!issue.pull_request;

  return (
    <div className="group relative flex flex-col p-5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300 rounded-sm w-full min-w-0">
      
      {/* Header: Repo Context */}
      <div className="flex justify-between items-start mb-3">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRepoClick();
          }}
          className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors z-10 min-w-0"
        >
           <span className="opacity-70 truncate shrink-0">{repoOwner}</span>
           <span className="opacity-40 shrink-0">/</span>
           <span className="font-medium truncate">{repoName}</span>
        </button>

        {language && (
           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-white/5 shrink-0 ml-2">
              <div 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: getLanguageColor(language) }}
              />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{language}</span>
           </div>
        )}
      </div>

      {/* Main Content */}
      <div className="mb-4 relative z-10">
        <div className="flex items-start gap-3">
             <div className={`mt-1 shrink-0 ${isPR ? 'text-purple-500' : 'text-green-600 dark:text-green-500'}`}>
                {isPR ? <GitPullRequest className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
             </div>
             <div className="min-w-0 flex-1">
                <a 
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base md:text-lg font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug block mb-2 break-words"
                >
                    {issue.title} <span className="text-zinc-400 font-light ml-1 text-sm whitespace-nowrap">#{issue.number}</span>
                </a>
                
                {issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {issue.labels.map(label => (
                            <span 
                                key={label.id} 
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 max-w-full sm:max-w-[200px]"
                                title={label.name}
                            >
                                <span 
                                    className="w-1.5 h-1.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: `#${label.color}` }}
                                />
                                <span className="truncate">{label.name}</span>
                            </span>
                        ))}
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="mt-auto pt-4 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5" title="Comments">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{issue.comments}</span>
            </div>
            <div className="flex items-center gap-1.5" title={`Created: ${new Date(issue.created_at).toLocaleDateString()}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{getTimeAgo(issue.created_at)}</span>
            </div>
          </div>

          <a 
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors opacity-0 group-hover:opacity-100"
          >
              <span className="uppercase tracking-widest text-[9px] font-medium">Open on GitHub</span>
              <ExternalLink className="w-3 h-3" />
          </a>
      </div>
    </div>
  );
};

export default IssueCard;
