import nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import { ReactElement } from 'react';

// SMTP configuration using environment variables
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const smtpSecure = smtpPort === 465; // Use SSL for port 465, STARTTLS for 587

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for 587 (uses STARTTLS)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    // For port 587, require TLS upgrade
    ...(smtpPort === 587 && { requireTLS: true }),
});

interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
}

interface SendReactEmailOptions {
    to: string | string[];
    subject: string;
    react: ReactElement;
    replyTo?: string;
}

interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send an email using SMTP (Zoho Mail or other SMTP provider)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { to, subject, html, replyTo } = options;

    const fromName = process.env.SMTP_FROM_NAME || 'vAlpha';
    const fromEmail = process.env.SMTP_FROM_EMAIL;

    if (!fromEmail) {
        console.error('SMTP_FROM_EMAIL is not configured');
        return {
            success: false,
            error: 'Email sender is not configured',
        };
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.error('SMTP credentials are not configured');
        return {
            success: false,
            error: 'SMTP credentials are not configured',
        };
    }

    try {
        const recipients = Array.isArray(to) ? to.join(', ') : to;

        const info = await transporter.sendMail({
            from: `${fromName} <${fromEmail}>`,
            to: recipients,
            subject,
            html,
            replyTo,
        });

        console.log('Email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Send an email with a React Email template
 */
export async function sendReactEmail(options: SendReactEmailOptions): Promise<SendEmailResult> {
    const { to, subject, react, replyTo } = options;

    try {
        // Render the React component to HTML
        const html = await render(react);

        return sendEmail({
            to,
            subject,
            html,
            replyTo,
        });
    } catch (error) {
        console.error('Error rendering React email:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to render email template',
        };
    }
}

/**
 * Verify SMTP connection is working
 */
export async function verifyEmailConnection(): Promise<boolean> {
    try {
        await transporter.verify();
        console.log('SMTP connection verified successfully');
        return true;
    } catch (error) {
        console.error('SMTP connection verification failed:', error);
        return false;
    }
}

