import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from './api';
import type { Difficulty, SubmissionStatus } from './types';
import { isTerminal } from './types';

export const useProblems = (q: { page: number; limit: number; difficulty: Difficulty | ''; search: string }) =>
  useQuery({ queryKey: ['problems', q], queryFn: () => api.listProblems(q) });

export const useProblem = (slug: string) =>
  useQuery({ queryKey: ['problem', slug], queryFn: () => api.getProblem(slug), enabled: !!slug });

export const useTestCases = (slug: string) =>
  useQuery({ queryKey: ['test-cases', slug], queryFn: () => api.listTestCases(slug), enabled: !!slug });

export const useLanguages = () =>
  useQuery({ queryKey: ['languages'], queryFn: api.listLanguages, staleTime: Infinity });

export const useCreateSubmission = () =>
  useMutation({ mutationFn: api.createSubmission });

export const useSubmission = (id: string) =>
  useQuery({
    queryKey: ['submission', id],
    queryFn: () => api.getSubmission(id),
    enabled: !!id,
    // ~1.5s while non-terminal; false stops the loop. TanStack halts refetch
    // automatically when the query goes inactive (component unmounts).
    refetchInterval: (q) =>
      q.state.data && isTerminal(q.state.data.submission.status) ? false : 1500,
  });

export const useSubmissions = (q: { page: number; limit: number; status: SubmissionStatus | '' }) =>
  useQuery({ queryKey: ['submissions', q], queryFn: () => api.listSubmissions(q) });
