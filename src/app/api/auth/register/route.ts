import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/argon2';
import { db } from '@/lib/db';
import { companies, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { config } from '@/lib/config';
import { randomBytes } from 'crypto';
import { sendReactEmail } from '@/lib/email';
import { VerifyEmail } from '@/emails/VerifyEmail';
import { VALID_COUNTRIES } from '@/lib/countries';


// Validation schema for registration
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  country: z.string().refine((val) => VALID_COUNTRIES.includes(val), {
    message: 'Please select a valid country',
  }),
});

export async function POST(request: Request) {
  try {
    // Check if signups are disabled
    if (config.isSignupDisabled) {
      return NextResponse.json(
        { message: 'Signups are currently disabled' },
        { status: 403 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with Argon2id
    const hashedPassword = await hashPassword(validatedData.password);

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create the company
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: validatedData.companyName,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: companies.id });

    if (!newCompany) {
      throw new Error('Failed to create company');
    }

    // Create the user with admin role (unverified)
    const [newUser] = await db
      .insert(users)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: 'admin',
        companyId: newCompany.id,
        country: validatedData.country,
        emailVerified: false,
        verificationToken,
        verificationExpires,
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id, email: users.email });

    if (!newUser) {
      // If user creation fails, roll back by deleting the company
      await db.delete(companies).where(eq(companies.id, newCompany.id));
      throw new Error('Failed to create user');
    }

    // Send verification email
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://billing.valpha.dev';
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

    console.log('📧 Attempting to send verification email to:', newUser.email);
    console.log('📧 Verify URL:', verifyUrl);

    try {
      const emailResult = await sendReactEmail({
        to: newUser.email,
        subject: 'Verify your email - vAlpha',
        react: VerifyEmail({
          userName: validatedData.name,
          verifyUrl,
        }),
      });

      if (emailResult.success) {
        console.log('✅ Verification email sent successfully to:', newUser.email);
      } else {
        console.error('❌ Failed to send verification email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Exception sending verification email:', emailError);
      // Don't fail registration if email fails - user can request resend
    }

    // Success
    return NextResponse.json({
      message: 'Account created! Please check your email to verify your account.',
      userId: newUser.id,
      requiresVerification: true,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}