'use client';

import { Suspense, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { toast } from 'sonner';
import { config } from '@/lib/config';
import { CheckCircle2, AlertCircle, Mail, Shield } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof formSchema>;

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationNeeded, setShowVerificationNeeded] = useState(false);
  const isSignupDisabled = config.isSignupDisabled;
  const [showMFAPrompt, setShowMFAPrompt] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loginCredentials, setLoginCredentials] = useState<{ email: string; password: string } | null>(null);

  // Check for URL params
  const verified = searchParams.get('verified');
  const error = searchParams.get('error');

  useEffect(() => {
    if (verified === 'true') {
      toast.success('Email verified successfully! You can now sign in.');
    }
    if (error === 'expired_token') {
      toast.error('Verification link has expired. Please request a new one.');
    }
    if (error === 'invalid_token') {
      toast.error('Invalid verification link.');
    }
  }, [verified, error]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setShowVerificationNeeded(false);

    try {
      const response = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (response?.error) {
        if (response.error === 'EMAIL_NOT_VERIFIED') {
          setShowVerificationNeeded(true);
        } else if (response.error === 'MFA_REQUIRED') {
          // MFA is enabled - need to collect TOTP code
          setLoginCredentials(values);
          setShowMFAPrompt(true);
        } else {
          toast.error('Invalid credentials. Please try again.');
        }
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMFASubmit() {
    if (!loginCredentials || mfaCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // Verify MFA code
      const verifyResponse = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mfaCode }),
      });

      if (!verifyResponse.ok) {
        toast.error('Invalid MFA code');
        setIsLoading(false);
        return;
      }

      // Now sign in with verified MFA flag
      const response = await signIn('credentials', {
        email: loginCredentials.email,
        password: loginCredentials.password,
        mfaToken: 'VERIFIED',
        redirect: false,
      });

      if (response?.error) {
        toast.error('Login failed. Please try again.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    const email = form.getValues('email');
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verification email sent! Please check your inbox.');
      } else {
        toast.error(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Failed to resend verification email');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {verified === 'true' && (
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Email verified!</span>
            </div>
          )}
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showVerificationNeeded && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Email not verified
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Please check your inbox and click the verification link to activate your account.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-amber-700 dark:text-amber-300 p-0 h-auto mt-2"
                    onClick={() => {
                      handleResendVerification();
                    }}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Resend verification email
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showMFAPrompt && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Two-Factor Authentication Required
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Enter the 6-digit code from your authenticator app
                  </p>
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      onKeyPress={(e) => e.key === 'Enter' && handleMFASubmit()}
                      disabled={isLoading}
                      className="bg-white dark:bg-gray-900"
                    />
                    <Button
                      onClick={handleMFASubmit}
                      disabled={isLoading || mfaCode.length !== 6}
                      className="w-full"
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                  Forgot password?
                </Link>
              </div>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function SignInLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  );
}