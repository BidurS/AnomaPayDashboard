import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type DB = ReturnType<typeof drizzle<typeof schema>>;

export const createDb = (d1: D1Database): DB => {
    return drizzle(d1, { schema });
};
