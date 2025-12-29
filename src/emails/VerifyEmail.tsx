import * as React from 'react';
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface VerifyEmailProps {
    userName: string;
    verifyUrl: string;
}

export const VerifyEmail = ({
    userName = 'User',
    verifyUrl = 'https://example.com/verify',
}: VerifyEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Verify your email address for vAlpha</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Verify Your Email</Heading>
                    <Section>
                        <Text style={text}>Hello {userName},</Text>
                        <Text style={text}>
                            Thanks for signing up for vAlpha! Please verify your email address by clicking the button below.
                        </Text>
                        <Button style={button} href={verifyUrl}>
                            Verify Email Address
                        </Button>
                        <Text style={text}>
                            This link will expire in 24 hours. If you didn&apos;t create an account, you can safely ignore this email.
                        </Text>
                        <Text style={text}>
                            If the button doesn&apos;t work, copy and paste this URL into your browser:
                        </Text>
                        <Text style={link}>{verifyUrl}</Text>
                    </Section>
                    <Text style={footer}>
                        &copy; {new Date().getFullYear()} vAlpha. All rights reserved.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

const main = {
    backgroundColor: '#f5f5f5',
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '580px',
    maxWidth: '100%',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0',
    textAlign: 'center' as const,
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '16px 0',
};

const button = {
    backgroundColor: '#5469d4',
    borderRadius: '4px',
    color: '#fff',
    display: 'block',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '24px auto',
    padding: '12px 24px',
    textAlign: 'center' as const,
    textDecoration: 'none',
    width: '220px',
};

const link = {
    color: '#5469d4',
    fontSize: '14px',
    margin: '16px 0',
    wordBreak: 'break-all' as const,
};

const footer = {
    color: '#898989',
    fontSize: '12px',
    margin: '48px 0 0',
    textAlign: 'center' as const,
};

export default VerifyEmail;
