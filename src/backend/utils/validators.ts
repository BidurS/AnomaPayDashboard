/**
 * Zod Input Validation for API Request Parameters
 */
import { z } from 'zod';

// --- Schemas ---

export const chainIdSchema = z.coerce.number().int().positive().default(8453);

export const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

export const daysSchema = z.coerce.number().int().min(1).max(365).default(7);

export const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// --- Helper ---

/**
 * Parse and validate query parameters against a Zod schema.
 * Returns the validated data or a 400 Response with error details.
 */
export function parseQueryParam<T>(
    schema: z.ZodType<T>,
    value: string | null
): { success: true; data: T } | { success: false; response: Response } {
    // Zod .default() only triggers on undefined, but searchParams.get() returns null
    const result = schema.safeParse(value ?? undefined);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        response: new Response(
            JSON.stringify({
                error: 'Validation Error',
                details: result.error.issues.map(i => i.message),
            }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
        ),
    };
}
