/**
 * Application configuration based on environment variables
 */
export const config = {
  /**
   * Whether signup functionality is disabled
   * Set NEXT_PUBLIC_DISABLE_SIGNUP=1 to disable signup
   */
  isSignupDisabled: process.env.NEXT_PUBLIC_DISABLE_SIGNUP === '1',

  /**
   * Public URL for the application
   */
  publicUrl: process.env.NEXT_PUBLIC_URL || 'https://summitfinance.app',

  /**
   * Email configuration (SMTP)
   */
  email: {
    fromName: process.env.SMTP_FROM_NAME || 'vAlpha',
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },
};
