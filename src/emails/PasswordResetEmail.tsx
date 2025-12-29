import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
} from '@react-email/components';

interface PasswordResetEmailProps {
    userName: string;
    resetUrl: string;
}

export const PasswordResetEmail = ({
    userName = 'User',
    resetUrl = 'https://billing.valpha.dev/auth/reset-password',
}: PasswordResetEmailProps) => {
    return (
        <Html>
            <Head />
            <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', padding: '20px' }}>
                <Container style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '5px', maxWidth: '600px' }}>
                    <Section>
                        <Text style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                            Reset Your Password
                        </Text>
                        <Text style={{ fontSize: '16px', marginBottom: '20px' }}>
                            Hello {userName},
                        </Text>
                        <Text style={{ fontSize: '16px', marginBottom: '20px' }}>
                            We received a request to reset your password for your vAlpha account. Click the button below to set a new password:
                        </Text>
                        <Button
                            href={resetUrl}
                            style={{
                                backgroundColor: '#5469d4',
                                color: '#ffffff',
                                padding: '12px 24px',
                                textDecoration: 'none',
                                borderRadius: '5px',
                                display: 'inline-block',
                                marginBottom: '20px',
                            }}
                        >
                            Reset Password
                        </Button>
                        <Text style={{ fontSize: '14px', color: '#666666', marginBottom: '10px' }}>
                            This link will expire in 1 hour.
                        </Text>
                        <Text style={{ fontSize: '14px', color: '#666666' }}>
                            If you didn&apos;t request a password reset, you can safely ignore this email.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default PasswordResetEmail;
