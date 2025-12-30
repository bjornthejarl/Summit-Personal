import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { encrypt, decrypt } from './crypto';

/**
 * MFA/TOTP Utilities for Two-Factor Authentication
 * 
 * Uses TOTP (Time-based One-Time Password) with:
 * - 6-digit codes
 * - 30-second time window
 * - SHA-1 algorithm (RFC 6238 standard)
 * - Compatible with Google Authenticator, Authy, etc.
 */

const MFA_ISSUER = 'vAlpha - Billing';
const BACKUP_CODE_COUNT = 10;

/**
 * Generate a new MFA secret for a user
 * Returns the encrypted secret and the OTPAuth URL for QR code
 */
export function generateMFASecret(userEmail: string): {
    encryptedSecret: string;
    otpauthUrl: string;
    secret: string; // Raw secret for immediate enrollment
} {
    // Generate a random 20-byte (160-bit) secret
    const secret = new OTPAuth.Secret({ size: 20 });

    // Create TOTP instance
    // In authenticator apps, this shows as "vAlpha - Billing (user@email.com)"
    const totp = new OTPAuth.TOTP({
        issuer: MFA_ISSUER,
        label: userEmail,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
    });

    // Get the otpauth:// URL for QR code
    const otpauthUrl = totp.toString();

    // Encrypt the secret before storing in database
    const encryptedSecret = encrypt(secret.base32);

    return {
        encryptedSecret,
        otpauthUrl,
        secret: secret.base32, // Return raw for immediate use
    };
}

/**
 * Generate QR code as Data URL for display in frontend
 */
export async function generateQRCodeDataURL(otpauthUrl: string): Promise<string> {
    try {
        return await QRCode.toDataURL(otpauthUrl, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 300,
        });
    } catch (error) {
        console.error('QR code generation error:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Verify a TOTP code against the user's secret
 * Allows a 1-step window tolerance (±30 seconds)
 */
export function verifyTOTP(
    encryptedSecret: string,
    token: string
): boolean {
    try {
        // Decrypt the secret
        const secretBase32 = decrypt(encryptedSecret);

        // Create TOTP instance
        const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secretBase32),
        });

        // Verify with window tolerance of ±1 period (±30 seconds)
        const delta = totp.validate({
            token,
            window: 1,
        });

        // delta is null if invalid, or a number indicating time step difference
        return delta !== null;
    } catch (error) {
        console.error('TOTP verification error:', error);
        return false;
    }
}

/**
 * Generate backup recovery codes
 * Returns both encrypted (for storage) and plain (for user display)
 */
export function generateBackupCodes(): {
    encryptedCodes: string;
    plainCodes: string[];
} {
    const codes: string[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        // Generate 8-character alphanumeric code
        const code = randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }

    // Encrypt the codes array as JSON
    const encryptedCodes = encrypt(JSON.stringify(codes));

    return {
        encryptedCodes,
        plainCodes: codes,
    };
}

/**
 * Verify and consume a backup code
 * Returns the updated encrypted codes string with the used code removed
 */
export function verifyAndConsumeBackupCode(
    encryptedCodes: string,
    inputCode: string
): {
    valid: boolean;
    remainingEncryptedCodes: string | null;
    remainingCount: number;
} {
    try {
        // Decrypt and parse codes
        const codesJson = decrypt(encryptedCodes);
        const codes: string[] = JSON.parse(codesJson);

        // Check if code exists
        const codeIndex = codes.findIndex(
            (code) => code.toUpperCase() === inputCode.toUpperCase()
        );

        if (codeIndex === -1) {
            return {
                valid: false,
                remainingEncryptedCodes: null,
                remainingCount: codes.length,
            };
        }

        // Remove the used code
        codes.splice(codeIndex, 1);

        // Re-encrypt remaining codes
        const remainingEncryptedCodes = codes.length > 0
            ? encrypt(JSON.stringify(codes))
            : null;

        return {
            valid: true,
            remainingEncryptedCodes,
            remainingCount: codes.length,
        };
    } catch (error) {
        console.error('Backup code verification error:', error);
        return {
            valid: false,
            remainingEncryptedCodes: null,
            remainingCount: 0,
        };
    }
}

/**
 * Get remaining backup codes count (for UI display)
 */
export function getBackupCodesCount(encryptedCodes: string | null): number {
    if (!encryptedCodes) return 0;

    try {
        const codesJson = decrypt(encryptedCodes);
        const codes: string[] = JSON.parse(codesJson);
        return codes.length;
    } catch (error) {
        return 0;
    }
}

/**
 * Format backup codes for display (groups of 4 with dashes)
 * Example: AB12-CD34
 */
export function formatBackupCode(code: string): string {
    return code.match(/.{1,4}/g)?.join('-') || code;
}
