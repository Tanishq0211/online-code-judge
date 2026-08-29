import { useQuery } from '@tanstack/react-query';
import * as api from './api';
import type { Difficulty } from './types';

export const useProblems = (q: { page: number; limit: number; difficulty: Difficulty | ''; search: string }) =>
  useQuery({ queryKey: ['problems', q], queryFn: () => api.listProblems(q) });

export const useProblem = (slug: string) =>
  useQuery({ queryKey: ['problem', slug], queryFn: () => api.getProblem(slug), enabled: !!slug });

export const useTestCases = (slug: string) =>
  useQuery({ queryKey: ['test-cases', slug], queryFn: () => api.listTestCases(slug), enabled: !!slug });

export const useLanguages = () =>
  useQuery({ queryKey: ['languages'], queryFn: api.listLanguages, staleTime: Infinity });
