import * as argon2 from 'argon2';

/**
 * Argon2id password hashing utilities
 * Using OWASP recommended parameters for Argon2id
 */

// OWASP recommended parameters for Argon2id (2023)
const ARGON2_OPTIONS: argon2.Options = {
    type: argon2.argon2id, // Argon2id: hybrid of Argon2i and Argon2d
    memoryCost: 65536,     // 64 MB memory
    timeCost: 3,           // 3 iterations
    parallelism: 4,        // 4 parallel threads
    hashLength: 32,        // 32 bytes output
};

/**
 * Hash a password using Argon2id
 * @param password - Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against an Argon2id hash
 * @param hash - Stored password hash
 * @param password - Plain text password to verify
 * @returns True if password matches
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
        return await argon2.verify(hash, password);
    } catch {
        return false;
    }
}

/**
 * Check if a hash needs to be rehashed (e.g., if using old bcrypt)
 * Argon2 hashes start with $argon2
 * @param hash - Password hash to check
 * @returns True if hash should be upgraded to Argon2id
 */
export function needsRehash(hash: string): boolean {
    // If it doesn't start with $argon2, it needs rehashing
    return !hash.startsWith('$argon2');
}

/**
 * Verify password with legacy bcrypt support
 * If password is valid and hash is bcrypt, returns rehash flag
 * @param hash - Stored password hash (bcrypt or argon2)
 * @param password - Plain text password
 * @returns { valid: boolean, needsRehash: boolean }
 */
export async function verifyPasswordWithLegacy(
    hash: string,
    password: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
    // Check if it's an Argon2 hash
    if (hash.startsWith('$argon2')) {
        const valid = await verifyPassword(hash, password);
        return { valid, needsRehash: false };
    }

    // Legacy bcrypt verification
    try {
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(password, hash);
        return { valid, needsRehash: valid }; // If valid bcrypt, needs rehash
    } catch {
        return { valid: false, needsRehash: false };
    }
}
