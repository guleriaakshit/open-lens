

import { searchRepositories } from './githubService';
import { SortOption, OrderOption, FilterState } from '../types';
import * as db from './db';

// Fix for missing type definitions for Jest globals
declare const jest: any;
declare const describe: any;
declare const beforeEach: any;
declare const it: any;
declare const expect: any;
declare const global: any;

// Mock dependencies
jest.mock('./db', () => ({
  getFromDB: jest.fn(),
  saveToDB: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('searchRepositories', () => {
  const mockFilters: FilterState = {
    query: '',
    language: [],
    license: 'All',
    sort: SortOption.STARS,
    order: OrderOption.DESC,
    minStars: 0,
    maxStars: 50000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached data if available and fresh', async () => {
    const cachedData = { items: [], total_count: 0 };
    (db.getFromDB as any).mockResolvedValue({
      timestamp: Date.now(), // Fresh
      data: cachedData,
    });

    const result = await searchRepositories(mockFilters);
    expect(result).toEqual(cachedData);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch from API if cache is missing', async () => {
    (db.getFromDB as any).mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0 }),
    });

    await searchRepositories(mockFilters);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(db.saveToDB).toHaveBeenCalled();
  });

  it('should construct correct query for standard search', async () => {
    (db.getFromDB as any).mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0 }),
    });

    const filters = { ...mockFilters, query: 'react', minStars: 100 };
    await searchRepositories(filters);

    const callUrl = (global.fetch as any).mock.calls[0][0];
    // Check for encoded query parameters
    expect(callUrl).toContain('q=react+stars%3A%3E%3D100');
  });

  it('should use trending proxy when trending sort is selected without complex filters', async () => {
    (db.getFromDB as any).mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const filters = { ...mockFilters, sort: SortOption.TRENDING };
    await searchRepositories(filters);

    const callUrl = (global.fetch as any).mock.calls[0][0];
    expect(callUrl).toContain('github-trending-api-seven.vercel.app');
  });

  it('should fallback to API heuristic for trending if star filter is present', async () => {
    (db.getFromDB as any).mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0 }),
    });

    const filters = { ...mockFilters, sort: SortOption.TRENDING, minStars: 1000 };
    await searchRepositories(filters);

    const callUrl = (global.fetch as any).mock.calls[0][0];
    // Should hit official API, not proxy
    expect(callUrl).toContain('api.github.com/search/repositories');
    // Should sort by stars explicitly
    expect(callUrl).toContain('sort=stars');
    // Should include date filter heuristic
    expect(callUrl).toContain('created%3A%3E'); 
  });

  it('should handle single language with inclusive keyword search', async () => {
    (db.getFromDB as any).mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0 }),
    });

    const filters = { ...mockFilters, language: ['Python'] };
    await searchRepositories(filters);

    const callUrl = (global.fetch as any).mock.calls[0][0];
    // Should match keyword "Python", not language:Python
    expect(decodeURIComponent(callUrl)).toContain('"Python"');
    expect(decodeURIComponent(callUrl)).not.toContain('language:Python');
  });

  it('should handle multiple languages with inclusive AND logic', async () => {
    (db.getFromDB as any).mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total_count: 0 }),
    });

    const filters = { ...mockFilters, language: ['Rust', 'Go'] };
    await searchRepositories(filters);

    const callUrl = (global.fetch as any).mock.calls[0][0];
    // Decoded URL should contain "Rust" "Go"
    expect(decodeURIComponent(callUrl)).toContain('"Rust" "Go"');
  });
  
  it('should handle API errors gracefully', async () => {
    (db.getFromDB as any).mockResolvedValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(searchRepositories(mockFilters)).rejects.toThrow('GitHub API Error: Internal Server Error');
  });
});
