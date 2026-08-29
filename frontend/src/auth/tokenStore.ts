const KEY = 'refreshToken';
export const getRefreshToken = () => localStorage.getItem(KEY);
export const setRefreshToken = (t: string) => localStorage.setItem(KEY, t);
export const clearRefreshToken = () => localStorage.removeItem(KEY);
