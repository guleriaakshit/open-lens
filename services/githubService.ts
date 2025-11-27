
import { FilterState, SearchResponse, SortOption, GitHubUserProfile, GitHubRepo, GitHubIssue, GitHubLabel, IssueFilterState } from '../types';
import { MAX_STARS, ITEMS_PER_PAGE } from '../constants';
import { getFromDB, saveToDB } from './db';

const BASE_URL = 'https://api.github.com/search/repositories';
const USER_URL = 'https://api.github.com/users';
const REPO_URL = 'https://api.github.com/repos';
const TRENDING_PROXY_URL = 'https://github-trending-api-seven.vercel.app/repositories'; // Open Source Proxy for GitHub Trending
const CACHE_PREFIX = 'openlens_cache_v1_';
const BROWSING_CACHE_TTL = 1000 * 60 * 15; // 15 Minutes for standard browsing
const SEARCH_CACHE_TTL = 1000 * 60 * 2;    // 2 Minutes for active text searches
const ISSUES_CACHE_TTL = 1000 * 60 * 5;    // 5 Minutes for issue lists
const REPOS_KEY = 'openlens_cached_repos';

// --- STORAGE HELPERS ---

export const saveSessionRepos = (repos: GitHubRepo[]) => {
    try {
        // Limit to first 50 to save space, we only need instant load for the first page
        const slice = repos.slice(0, 50); 
        localStorage.setItem(REPOS_KEY, JSON.stringify(slice));
    } catch (e) {
        console.warn("Failed to save repos to local storage", e);
    }
};

export const getSessionRepos = (): GitHubRepo[] => {
    try {
        const item = localStorage.getItem(REPOS_KEY);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

// --- AUTH HELPERS ---

let authToken = localStorage.getItem('openlens_auth_token') || '';

export const setAuthToken = (token: string) => {
    authToken = token;
    if (token) {
        localStorage.setItem('openlens_auth_token', token);
    } else {
        localStorage.removeItem('openlens_auth_token');
    }
};

export const validateToken = async (token: string): Promise<GitHubUserProfile> => {
    const response = await fetch('https://api.github.com/user', {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error('Invalid token');
    }

    return await response.json();
};

const getHeaders = (accept = 'application/vnd.github.v3+json'): HeadersInit => {
    const headers: Record<string, string> = {
        'Accept': accept,
    };
    if (authToken) {
        headers['Authorization'] = `token ${authToken}`;
    }
    return headers;
};

// --- API FUNCTIONS ---

// Helper to generate a unique key for the request
const getCacheKey = (filters: FilterState, page: number, usernameContext?: string | null) => {
  const keyData = {
    ...filters,
    page,
    usernameContext: usernameContext || 'none'
  };
  return CACHE_PREFIX + JSON.stringify(keyData);
};

// Helper to get date string (YYYY-MM-DD) for N days ago
const getDateNDaysAgo = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split('T')[0];
};

// Fetch real trending data to match github.com/trending 1:1
const fetchTrendingProxy = async (language?: string): Promise<SearchResponse> => {
    // Trending Proxy does NOT use GitHub Auth headers as it's a scraper proxy
    let url = `${TRENDING_PROXY_URL}?since=daily`;
    if (language && language !== 'All') {
        url += `&language=${encodeURIComponent(language)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Trending Proxy Error');
    const data = await res.json();

    // Map proxy structure to GitHubRepo structure
    const items: any[] = data.map((repo: any, idx: number) => ({
        id: idx + 9990000 + Math.floor(Math.random() * 100000), // Synthetic ID
        name: repo.name,
        full_name: `${repo.author}/${repo.name}`,
        description: repo.description,
        html_url: repo.url,
        stargazers_count: repo.stars,
        forks_count: repo.forks,
        language: repo.language,
        owner: {
            login: repo.author,
            avatar_url: repo.avatar,
            html_url: `https://github.com/${repo.author}`
        },
        updated_at: new Date().toISOString(), // Not provided by trending API
        pushed_at: new Date().toISOString(),
        topics: [], // Not provided
        license: null, // Not provided
        size: 0, // Not provided
        open_issues_count: 0, // Not provided
        has_issues: true, // Assume true for trending
        archived: false // Assume false for trending
    }));

    return {
        total_count: items.length,
        incomplete_results: false,
        items
    };
};

export const getRepositoryReadme = async (owner: string, repo: string): Promise<string | null> => {
  try {
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const response = await fetch(`${REPO_URL}/${encodedOwner}/${encodedRepo}/readme`, {
      headers: getHeaders('application/vnd.github.html'),
    });

    if (!response.ok) {
        return null;
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) return null;
    
    return text;
  } catch (error) {
    console.warn("Error fetching readme:", error);
    return null;
  }
};

export const getRepoLanguages = async (owner: string, repo: string): Promise<Record<string, number>> => {
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const cacheKey = `languages_${owner}_${repo}`;
    try {
        const cached = await getFromDB(cacheKey);
        // 24 hour cache for languages
        if (cached && (Date.now() - cached.timestamp < 1000 * 60 * 60 * 24)) { 
            return cached.data;
        }

        const response = await fetch(`${REPO_URL}/${encodedOwner}/${encodedRepo}/languages`, {
            headers: getHeaders()
        });
        if (!response.ok) return {};
        const data = await response.json();
        await saveToDB(cacheKey, data);
        return data;
    } catch (error) {
        console.warn("Error fetching languages", error);
        return {};
    }
};

export const getRepoLabels = async (owner: string, repo: string): Promise<GitHubLabel[]> => {
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    try {
        const response = await fetch(`${REPO_URL}/${encodedOwner}/${encodedRepo}/labels?per_page=100`, {
            headers: getHeaders()
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.warn("Error fetching labels", error);
        return [];
    }
}

export const getRepoIssues = async (owner: string, repo: string, filters: IssueFilterState): Promise<GitHubIssue[]> => {
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const cacheKey = `issues_${owner}_${repo}_${JSON.stringify(filters)}`;

    try {
        // Check cache
        const cached = await getFromDB(cacheKey);
        if (cached && (Date.now() - cached.timestamp < ISSUES_CACHE_TTL)) {
            console.log('Serving issues from cache:', cacheKey);
            return cached.data;
        }

        const params = new URLSearchParams({
            sort: filters.sort === 'comments' ? 'comments' : filters.sort, 
            direction: filters.direction,
            state: 'open', 
            per_page: '30'
        });

        if (filters.labels.length > 0) {
            params.append('labels', filters.labels.join(','));
        }

        let url = `${REPO_URL}/${encodedOwner}/${encodedRepo}/issues?${params.toString()}`;
        const response = await fetch(url, {
             headers: getHeaders(),
        });
        
        if (!response.ok) {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                // Try to get detailed error message from GitHub
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) { /* ignore json parse error */ }
            
            console.warn(`Issues API Error for ${owner}/${repo}:`, errorMessage);

            if (response.status === 404) {
                 throw new Error("Issues are disabled or not found.");
            }
            if (response.status === 403 || response.status === 429) {
                 // Distinguish between rate limit and other 403s
                 if (response.status === 429 || errorMessage.toLowerCase().includes("rate limit")) {
                     throw new Error("GitHub Rate Limit Exceeded. Try again later.");
                 }
                 throw new Error(errorMessage); // Pass through the actual GitHub error
            }
            throw new Error(errorMessage);
        }
        
        let issues: GitHubIssue[] = await response.json();

        if (!Array.isArray(issues)) return [];

        // Client side filtering: Remove PRs (GitHub API /issues endpoint returns both issues and PRs)
        issues = issues.filter(i => !i.pull_request);

        // Save to cache
        await saveToDB(cacheKey, issues);

        return issues;
    } catch (error) {
        console.error("Error fetching issues", error);
        throw error;
    }
};

export const getUserProfile = async (username: string): Promise<GitHubUserProfile | null> => {
  try {
    const response = await fetch(`${USER_URL}/${encodeURIComponent(username)}`, {
      headers: getHeaders(),
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("Error fetching user profile:", error);
    return null;
  }
};

export const getUserTopRepos = async (username: string): Promise<GitHubRepo[]> => {
  try {
    const params = new URLSearchParams({
      q: `user:${username}`,
      sort: 'stars',
      order: 'desc',
      per_page: '3'
    });
    
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: getHeaders(),
    });

    if (!response.ok) return [];
    
    const data: SearchResponse = await response.json();
    return data.items || [];
  } catch (error) {
    console.warn("Error fetching top repos:", error);
    return [];
  }
};

export const searchRepositories = async (filters: FilterState, page: number = 1, usernameContext?: string | null): Promise<SearchResponse> => {
  // Check Cache First (IndexedDB)
  const cacheKey = getCacheKey(filters, page, usernameContext);
  
  // Use shorter TTL if there is a specific text query, ensuring freshness for "Global Search"
  const ttl = filters.query ? SEARCH_CACHE_TTL : BROWSING_CACHE_TTL;

  try {
    const cachedEntry = await getFromDB(cacheKey);
    if (cachedEntry) {
      if (Date.now() - cachedEntry.timestamp < ttl) {
        console.log('Serving from IndexedDB cache:', cacheKey);
        return cachedEntry.data as SearchResponse;
      } else {
        // Cache expired, normal fetch will proceed and overwrite it
        console.log('Cache expired for:', cacheKey);
      }
    }
  } catch (e) {
    console.warn('Cache read failed', e);
  }

  const isTrending = filters.sort === SortOption.TRENDING;
  const hasStarFilter = filters.minStars > 0 || filters.maxStars < MAX_STARS;
  const hasQuery = !!filters.query;
  const hasUser = !!usernameContext;
  const hasLicense = filters.license && filters.license !== 'All';

  let searchData: SearchResponse = { total_count: 0, incomplete_results: false, items: [] };

  // --- TRENDING PROXY LOGIC ---
  if (isTrending && !hasQuery && !hasUser && !hasStarFilter && !hasLicense) {
      try {
          const lang = (filters.language.length > 0 && filters.language[0] !== 'All') 
            ? filters.language[0] 
            : undefined;
          
          if (!lang || filters.language.length === 1) {
              searchData = await fetchTrendingProxy(lang);
          }
      } catch (err) {
          console.warn("Trending proxy failed, falling back to Search API heuristic", err);
      }
  }

  // --- STANDARD SEARCH API LOGIC ---
  // Only execute if trending proxy wasn't used
  if (searchData.items.length === 0) {
      const queryParts = [];

      if (usernameContext) {
        queryParts.push(`user:${usernameContext}`);
      }

      if (isTrending && !hasQuery && !usernameContext) {
        const date = getDateNDaysAgo(7);
        queryParts.push(`created:>${date}`);
      }

      if (filters.query) {
        queryParts.push(filters.query);
      } else if (!usernameContext && !hasStarFilter && filters.language.length === 0 && !isTrending) {
        queryParts.push("stars:>1000");
      }

      // Handle Multi-Select Language (AND Logic & Inclusive)
      if (filters.language.length > 0 && !filters.language.includes('All')) {
        const langs = filters.language;
        const joined = langs.map(l => `"${l}"`).join(' ');
        queryParts.push(joined);
      }

      if (filters.license && filters.license !== 'All') {
        queryParts.push(`license:${filters.license}`);
      }

      if (filters.maxStars < MAX_STARS) {
        queryParts.push(`stars:${filters.minStars}..${filters.maxStars}`);
      } else {
        if (filters.minStars > 0) {
          queryParts.push(`stars:>=${filters.minStars}`);
        }
      }

      const q = queryParts.join(' ');
      const params = new URLSearchParams({
        q: q,
        order: filters.order,
        per_page: ITEMS_PER_PAGE.toString(),
        page: page.toString(),
      });

      if (isTrending) {
          params.append('sort', 'stars');
      } else {
          params.append('sort', filters.sort);
      }

      try {
        const response = await fetch(`${BASE_URL}?${params.toString()}`, {
          headers: getHeaders(),
        });

        if (!response.ok) {
          if (response.status === 403 || response.status === 429) {
            throw new Error("API Rate limit exceeded. Please try again in a moment.");
          }
          
          if (response.status === 422) {
              console.warn("GitHub API 422 (Likely pagination limit reached):", response.statusText);
              searchData = {
                  total_count: 0,
                  incomplete_results: false,
                  items: []
              };
          } else {
              throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
          }
        } else {
            searchData = await response.json();
        }

      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
  }

  await saveToDB(cacheKey, searchData);
  return searchData;
};
