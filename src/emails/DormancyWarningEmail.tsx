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

interface DormancyWarningEmailProps {
    userName: string;
    lastActivityDate: string;
    daysUntilDormant: number;
    loginUrl: string;
}

export const DormancyWarningEmail = ({
    userName = 'User',
    lastActivityDate = 'January 1, 2024',
    daysUntilDormant = 30,
    loginUrl = 'https://billing.valpha.dev/auth/portal/access',
}: DormancyWarningEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Your vAlpha account will be marked as dormant soon</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Account Inactivity Notice</Heading>
                    <Section>
                        <Text style={text}>Hello {userName},</Text>
                        <Text style={text}>
                            We noticed that you haven&apos;t logged into your vAlpha account since {lastActivityDate}.
                        </Text>
                        <Text style={text}>
                            Your account will be marked as <strong>dormant</strong> in {daysUntilDormant} days
                            if no activity is detected.
                        </Text>
                        <Text style={warningText}>
                            Dormant accounts may be subject to deletion in accordance with our data retention policy
                            and applicable privacy regulations (GDPR, CCPA).
                        </Text>
                        <Button style={button} href={loginUrl}>
                            Sign In Now
                        </Button>
                        <Text style={text}>
                            If you no longer wish to use vAlpha, you can request account deletion from your
                            settings page. Your data will be handled in accordance with your country&apos;s
                            data protection laws.
                        </Text>
                    </Section>
                    <Text style={footer}>
                        &copy; {new Date().getFullYear()} vAlpha. All rights reserved.
                        <br />
                        <br />
                        You&apos;re receiving this email because you have an account with vAlpha.
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

const warningText = {
    color: '#b45309',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '16px 0',
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '4px',
    border: '1px solid #f59e0b',
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

const footer = {
    color: '#898989',
    fontSize: '12px',
    margin: '48px 0 0',
    textAlign: 'center' as const,
};

export default DormancyWarningEmail;
