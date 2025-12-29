import { NextResponse } from 'next/server';
import { verifyEmailConnection } from '@/lib/email';

/**
 * Diagnostic endpoint to test SMTP configuration
 * GET /api/test-email - Check if SMTP is configured correctly
 */
export async function GET() {
    try {
        // Check if all SMTP env vars are set
        const smtpConfig = {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASSWORD ? '***' : undefined,
            fromName: process.env.SMTP_FROM_NAME,
            fromEmail: process.env.SMTP_FROM_EMAIL,
        };

        const missingVars = [];
        if (!process.env.SMTP_HOST) missing Vars.push('SMTP_HOST');
        if (!process.env.SMTP_PORT) missingVars.push('SMTP_PORT');
        if (!process.env.SMTP_USER) missingVars.push('SMTP_USER');
        if (!process.env.SMTP_PASSWORD) missingVars.push('SMTP_PASSWORD');
        if (!process.env.SMTP_FROM_EMAIL) missingVars.push('SMTP_FROM_EMAIL');

        if (missingVars.length > 0) {
            return NextResponse.json({
                status: 'error',
                message: 'Missing SMTP configuration',
                missingVariables: missingVars,
                config: smtpConfig,
            }, { status: 500 });
        }

        // Test SMTP connection
        const isConnected = await verifyEmailConnection();

        if (isConnected) {
            return NextResponse.json({
                status: 'success',
                message: 'SMTP configured and connected successfully',
                config: smtpConfig,
            });
        } else {
            return NextResponse.json({
                status: 'error',
                message: 'SMTP connection failed',
                config: smtpConfig,
            }, { status: 500 });
        }
    } catch (error) {
        console.error('SMTP test error:', error);
        return NextResponse.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
