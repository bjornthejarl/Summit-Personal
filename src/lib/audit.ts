import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';

/**
 * Audit logging utility for compliance (GDPR, HIPAA, etc.)
 * Tracks all data access and modifications
 */

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'anonymize';

interface AuditLogEntry {
    userId?: number;
    userEmail?: string;
    tableName: string;
    recordId?: number;
    action: AuditAction;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    companyId?: number;
}

/**
 * Log an audit event
 * @param entry - The audit log entry details
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        // Encrypt sensitive data if present
        let encryptedOldValues: string | null = null;
        let encryptedNewValues: string | null = null;

        if (entry.oldValues) {
            try {
                encryptedOldValues = encrypt(JSON.stringify(entry.oldValues));
            } catch {
                encryptedOldValues = '[ENCRYPTION_FAILED]';
            }
        }

        if (entry.newValues) {
            try {
                encryptedNewValues = encrypt(JSON.stringify(entry.newValues));
            } catch {
                encryptedNewValues = '[ENCRYPTION_FAILED]';
            }
        }

        await db.insert(auditLogs).values({
            userId: entry.userId,
            userEmail: entry.userEmail,
            tableName: entry.tableName,
            recordId: entry.recordId,
            action: entry.action,
            oldValues: encryptedOldValues,
            newValues: encryptedNewValues,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            companyId: entry.companyId,
            createdAt: new Date(),
        });
    } catch (error) {
        // Log to console but don't throw - audit logging shouldn't break the app
        console.error('Failed to write audit log:', error);
    }
}

/**
 * Log a login event
 */
export async function logLogin(
    userId: number,
    userEmail: string,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    await logAudit({
        userId,
        userEmail,
        tableName: 'users',
        recordId: userId,
        action: 'login',
        ipAddress,
        userAgent,
    });
}

/**
 * Log a logout event
 */
export async function logLogout(
    userId: number,
    userEmail: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        userEmail,
        tableName: 'users',
        recordId: userId,
        action: 'logout',
        ipAddress,
    });
}

/**
 * Log a data export event (GDPR data portability)
 */
export async function logDataExport(
    userId: number,
    userEmail: string,
    tablesExported: string[],
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        userEmail,
        tableName: 'data_export',
        action: 'export',
        newValues: { tablesExported },
        ipAddress,
    });
}

/**
 * Log a data anonymization event (GDPR right to erasure)
 */
export async function logAnonymization(
    userId: number,
    userEmail: string,
    tablesAnonymized: string[],
    processedBy: number,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        userEmail,
        tableName: 'account_deletion',
        action: 'anonymize',
        newValues: { tablesAnonymized, processedBy },
        ipAddress,
    });
}

/**
 * Extract IP address from request headers
 */
export function getClientIp(headers: Headers): string | undefined {
    // Check various headers for the client IP
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }

    return headers.get('x-real-ip') || undefined;
}

/**
 * Log a CRUD operation
 */
export async function logCrud(
    action: 'create' | 'read' | 'update' | 'delete',
    tableName: string,
    recordId: number,
    userId?: number,
    userEmail?: string,
    companyId?: number,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    await logAudit({
        userId,
        userEmail,
        tableName,
        recordId,
        action,
        oldValues,
        newValues,
        companyId,
        ipAddress,
        userAgent,
    });
}
