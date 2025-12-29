import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * AES-256-GCM Field-Level Encryption for PII
 * 
 * Used to encrypt sensitive client data at rest:
 * - Names, emails, phone numbers, addresses
 * 
 * Requires ENCRYPTION_KEY environment variable (32-byte hex string)
 * Generate with: openssl rand -hex 32
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;

    if (!keyHex) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    if (keyHex.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }

    return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) return '';

    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * @param ciphertext - The encrypted string (iv:authTag:ciphertext format)
 * @returns The decrypted plaintext
 */
export function decrypt(ciphertext: string): string {
    if (!ciphertext) return '';

    // Check if it looks like an encrypted value (has colons for iv:authTag:data)
    if (!ciphertext.includes(':')) {
        // Not encrypted, return as-is (for backward compatibility)
        return ciphertext;
    }

    const key = getEncryptionKey();
    const parts = ciphertext.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Create a deterministic hash for searching encrypted fields
 * Uses HMAC-SHA256 with the encryption key
 * @param value - The value to hash
 * @returns Hex string hash
 */
export function hashForSearch(value: string): string {
    if (!value) return '';

    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Use first 32 chars of key for HMAC (different from encryption)
    const hmacKey = keyHex.substring(0, 32);

    return createHash('sha256')
        .update(hmacKey)
        .update(value.toLowerCase().trim())
        .digest('hex');
}

/**
 * Check if a value is encrypted (has the iv:authTag:data format)
 */
export function isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(':');
    return parts.length === 3;
}

/**
 * Encrypt an object's specified fields
 * @param obj - The object to encrypt
 * @param fields - Array of field names to encrypt
 * @returns New object with specified fields encrypted
 */
export function encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
): T {
    const result = { ...obj };

    for (const field of fields) {
        const value = obj[field];
        if (typeof value === 'string' && value) {
            (result as Record<string, unknown>)[field as string] = encrypt(value);
        }
    }

    return result;
}

/**
 * Decrypt an object's specified fields
 * @param obj - The object to decrypt
 * @param fields - Array of field names to decrypt
 * @returns New object with specified fields decrypted
 */
export function decryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
): T {
    const result = { ...obj };

    for (const field of fields) {
        const value = obj[field];
        if (typeof value === 'string' && value) {
            try {
                (result as Record<string, unknown>)[field as string] = decrypt(value);
            } catch {
                // If decryption fails, keep original value (might not be encrypted)
                (result as Record<string, unknown>)[field as string] = value;
            }
        }
    }

    return result;
}

/**
 * Anonymize a record for compliance (replace PII with hashed values)
 * Used for data retention when user requests deletion
 */
export function anonymize(value: string): string {
    if (!value) return '';
    const hash = hashForSearch(value);
    return `[ANONYMIZED:${hash.substring(0, 8)}]`;
}
