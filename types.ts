
export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubUserProfile {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  owner: GitHubUser;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  license: {
    key: string;
    name: string;
  } | null;
  size: number;
  open_issues_count: number;
  has_issues: boolean;
  archived: boolean;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  user: GitHubUser;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  html_url: string;
  body: string;
  labels: GitHubLabel[];
  comments: number;
  pull_request?: any; // If present, it's a PR
  assignee: GitHubUser | null;
  assignees: GitHubUser[];
  // Augmented field for UI context when aggregated
  repository?: GitHubRepo; 
  reactions?: {
    total_count: number;
    '+1': number;
    '-1': number;
    'laugh': number;
    'hooray': number;
    'confused': number;
    'heart': number;
    'rocket': number;
    'eyes': number;
  };
}

export interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
  warning?: string;
}

export enum SortOption {
  TRENDING = 'trending',
  STARS = 'stars',
  FORKS = 'forks',
  UPDATED = 'updated',
}

export enum OrderOption {
  DESC = 'desc',
  ASC = 'asc',
}

export interface FilterState {
  query: string;
  language: string[];
  license: string;
  sort: SortOption;
  order: OrderOption;
  minStars: number;
  maxStars: number;
}

export interface IssueFilterState {
  sort: 'created' | 'updated' | 'comments';
  direction: 'asc' | 'desc';
  labels: string[];
}
