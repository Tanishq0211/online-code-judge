// Express types every query value as string | string[] | ParsedQs, because a client
// can repeat a param (?page=1&page=2). The express-validator rules on each route
// already reject non-scalars, so controllers narrow through these two helpers
// rather than casting at every use site.

export const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

// `|| fallback` (not a NaN check) so 0 and '' fall back too, matching the
// pre-migration `parseInt(req.query.page, 10) || 1`.
export const int = (v: unknown, fallback: number): number => parseInt(str(v) ?? '', 10) || fallback;

// Express 5 also types req.params values as string | string[] (a wildcard can match
// repeatedly). Every route here declares plain `:name` params, so the value is always
// a single present string — this narrows without changing runtime behaviour.
export const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0]! : v!);
