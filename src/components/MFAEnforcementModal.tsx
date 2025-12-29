'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Copy, Download, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export function MFAEnforcementModal() {
    const { data: session, update } = useSession();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'qr' | 'verify' | 'backup' | 'verify-codes'>('qr');
    const [qrCode, setQrCode] = useState<string>('');
    const [totpCode, setTotpCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Track if enrollment has been initiated to prevent duplicate calls
    const enrollmentInitiated = useRef(false);

    // For backup code verification
    const [randomIndices, setRandomIndices] = useState<number[]>([]);
    const [verificationInputs, setVerificationInputs] = useState(['', '', '']);

    // Check if admin needs MFA
    useEffect(() => {
        // Only trigger enrollment if:
        // 1. User is admin
        // 2. MFA is not enabled
        // 3. Enrollment hasn't been initiated yet
        if (
            session?.user?.role === 'admin' &&
            !(session?.user as any).mfaEnabled &&
            !enrollmentInitiated.current
        ) {
            enrollmentInitiated.current = true;
            setOpen(true);
            enrollMFA();
        }
    }, [session]);

    const enrollMFA = async () => {
        try {
            const response = await fetch('/api/mfa/enroll', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                setQrCode(data.qrCode);
                setStep('qr');
            } else {
                toast.error('Failed to start MFA enrollment');
                enrollmentInitiated.current = false; // Reset on error
            }
        } catch (error) {
            toast.error('Error starting MFA enrollment');
        }
    };

    const verifyAndComplete = async () => {
        if (totpCode.length !== 6) {
            toast.error('Please enter a 6-digit code');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/mfa/enroll', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: totpCode }),
            });

            const data = await response.json();

            if (response.ok) {
                setBackupCodes(data.backupCodes);
                setStep('backup');
                // Generate 3 random indices for verification
                const indices: number[] = [];
                while (indices.length < 3) {
                    const rand = Math.floor(Math.random() * 10);
                    if (!indices.includes(rand)) indices.push(rand);
                }
                setRandomIndices(indices.sort((a, b) => a - b));
            } else {
                toast.error(data.error || 'Invalid code');
            }
        } catch (error) {
            toast.error('Error verifying code');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadBackupCodes = () => {
        const text = backupCodes.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'valpha-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        toast.success('Backup codes copied to clipboard');
    };

    const proceedToVerification = () => {
        setStep('verify-codes');
    };

    const verifyBackupCodes = () => {
        const isValid = randomIndices.every((index, i) => {
            const expectedCode = backupCodes[index];
            const inputCode = verificationInputs[i].trim().toUpperCase();
            return expectedCode === inputCode;
        });

        if (isValid) {
            completeSetup();
        } else {
            toast.error('Codes do not match. Please check and try again.');
        }
    };

    const completeSetup = async () => {
        // Update session
        await update();
        setOpen(false);
        toast.success('MFA enabled successfully!');
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                    </div>
                    <DialogDescription>
                        As an administrator, you must enable MFA to protect your account.
                    </DialogDescription>
                </DialogHeader>

                {step === 'qr' && (
                    <div className="space-y-4">
                        <div className="text-sm space-y-2">
                            <p className="font-medium">Step 1: Scan QR Code</p>
                            <p className="text-muted-foreground">
                                Use Google Authenticator, Authy, or any TOTP app to scan this code:
                            </p>
                        </div>

                        {qrCode && (
                            <div className="flex justify-center p-4 bg-white rounded-lg">
                                <Image src={qrCode} alt="MFA QR Code" width={200} height={200} />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="totp-code">Step 2: Enter 6-digit code</Label>
                            <Input
                                id="totp-code"
                                placeholder="000000"
                                maxLength={6}
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                onKeyPress={(e) => e.key === 'Enter' && verifyAndComplete()}
                            />
                        </div>

                        <Button onClick={verifyAndComplete} disabled={isLoading} className="w-full">
                            {isLoading ? 'Verifying...' : 'Verify & Continue'}
                        </Button>
                    </div>
                )}

                {step === 'backup' && (
                    <div className="space-y-4">
                        <div className="text-sm space-y-2">
                            <p className="font-medium text-amber-600">⚠️ Save Your Backup Codes</p>
                            <p className="text-muted-foreground">
                                Store these codes securely. You&apos;ll need them if you lose access to your authenticator.
                            </p>
                        </div>

                        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg space-y-1 font-mono text-sm">
                            {backupCodes.map((code, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-muted-foreground w-6">{i + 1}.</span>
                                    <span>{code}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                            <Button onClick={copyBackupCodes} variant="outline" className="flex-1">
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                            </Button>
                        </div>

                        <Button onClick={proceedToVerification} className="w-full">
                            I&apos;ve Saved My Codes - Continue
                        </Button>
                    </div>
                )}

                {step === 'verify-codes' && (
                    <div className="space-y-4">
                        <div className="text-sm space-y-2">
                            <p className="font-medium flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                                Verify You Saved Your Codes
                            </p>
                            <p className="text-muted-foreground">
                                To confirm you saved your backup codes, please enter the codes at these positions:
                            </p>
                        </div>

                        {randomIndices.map((index, i) => (
                            <div key={i} className="space-y-2">
                                <Label htmlFor={`code-${i}`}>
                                    Code #{index + 1}
                                </Label>
                                <Input
                                    id={`code-${i}`}
                                    placeholder="XXXX-XXXX"
                                    maxLength={9}
                                    value={verificationInputs[i]}
                                    onChange={(e) => {
                                        const newInputs = [...verificationInputs];
                                        newInputs[i] = e.target.value.toUpperCase();
                                        setVerificationInputs(newInputs);
                                    }}
                                />
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <Button onClick={() => setStep('backup')} variant="outline" className="flex-1">
                                Back to Codes
                            </Button>
                            <Button
                                onClick={verifyBackupCodes}
                                className="flex-1"
                                disabled={verificationInputs.some(v => v.length === 0)}
                            >
                                Verify & Complete
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
