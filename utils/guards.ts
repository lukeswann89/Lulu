// /utils/guards.ts
// Lightweight guards to reduce UI null checks and provide safe defaults

export const asArray = <T>(v: unknown): T[] => Array.isArray(v) ? v : [];
export const asObject = <T extends Record<string, unknown>>(v: unknown): T => (v && typeof v === 'object' && !Array.isArray(v)) ? v as T : {} as T;
export const asString = (v: unknown): string => typeof v === 'string' ? v : '';
export const asNumber = (v: unknown): number => typeof v === 'number' && !isNaN(v) ? v : 0;
export const asBoolean = (v: unknown): boolean => Boolean(v);
