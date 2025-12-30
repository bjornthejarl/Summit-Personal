import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { users } from '@/lib/db/schema';
import { getUserPermissions } from './permissions/utils';
import { verifyPasswordWithLegacy, hashPassword } from './argon2';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/portal/access',
    signOut: '/auth/signout',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), eq(users.softDelete, false)));

        if (!user || !user.password) {
          return null;
        }

        // Verify password (supports both Argon2id and legacy bcrypt)
        const { valid, needsRehash } = await verifyPasswordWithLegacy(user.password, password);

        if (!valid) {
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        // Check if MFA is enabled for this user
        if (user.mfaEnabled) {
          // MFA is enabled - credentials.mfaToken should be provided
          const mfaToken = (credentials as any).mfaToken;
          const isBackupCode = (credentials as any).isBackupCode === 'true';

          if (!mfaToken) {
            // No MFA token provided - indicate MFA is required
            throw new Error('MFA_REQUIRED');
          }

          // Verify MFA token
          const { verifyTOTP, verifyAndConsumeBackupCode } = await import('@/lib/mfa');

          let isValid = false;

          if (isBackupCode && user.backupCodes) {
            // Verify backup code
            const result = verifyAndConsumeBackupCode(user.backupCodes, mfaToken);
            isValid = result.valid;

            if (result.valid) {
              // Update remaining backup codes
              await db
                .update(users)
                .set({ backupCodes: result.remainingEncryptedCodes, updatedAt: new Date() })
                .where(eq(users.id, user.id));
            }
          } else if (user.mfaSecret) {
            // Verify TOTP code
            isValid = verifyTOTP(user.mfaSecret, mfaToken);
          }

          if (!isValid) {
            throw new Error('MFA_INVALID');
          }
        }

        // If using legacy bcrypt, upgrade to Argon2id
        if (needsRehash) {
          const newHash = await hashPassword(password);
          await db
            .update(users)
            .set({ password: newHash, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        }

        // Update last activity
        await db
          .update(users)
          .set({ lastActivityAt: new Date() })
          .where(eq(users.id, user.id));

        // Get user permissions based on role
        const permissions = getUserPermissions(user.role);

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId?.toString(),
          permissions,
          mfaEnabled: user.mfaEnabled || false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.permissions = user.permissions;
        token.mfaEnabled = (user as any).mfaEnabled || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string | undefined;
        session.user.permissions = token.permissions as Record<string, boolean> | undefined;
        (session.user as any).mfaEnabled = token.mfaEnabled as boolean;
      }
      return session;
    },
  },
};