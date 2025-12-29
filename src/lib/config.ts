/**
 * Application configuration based on environment variables
 * 
 * Note: Use getter functions for values that need to be evaluated at runtime
 */

/**
 * Check if signup is disabled
 * This is a function to ensure runtime evaluation (not build-time)
 */
export function isSignupDisabled(): boolean {
  // Check both with and without quotes
  const value = process.env.NEXT_PUBLIC_DISABLE_SIGNUP;
  return value === '1' || value === 'true' || value === 'TRUE';
}

export const config = {
  /**
   * Whether signup functionality is disabled
   * Use isSignupDisabled() function for proper runtime check
   */
  get isSignupDisabled() {
    return isSignupDisabled();
  },

  /**
   * Public URL for the application
   */
  publicUrl: process.env.NEXT_PUBLIC_URL || 'https://billing.valpha.dev',

  /**
   * Email configuration (SMTP)
   */
  email: {
    fromName: process.env.SMTP_FROM_NAME || 'vAlpha',
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },
};
