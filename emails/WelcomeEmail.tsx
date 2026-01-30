import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  firstName: string;
  email: string;
}

export default function WelcomeEmail({ firstName, email }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Superwork - Your customer portal is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Superwork, {firstName}!</Heading>

          <Text style={text}>
            Your account has been successfully created. You now have access to your dedicated customer portal where you can:
          </Text>

          <Section style={listSection}>
            <Text style={listItem}>• View and manage your projects</Text>
            <Text style={listItem}>• Communicate with your consultants</Text>
            <Text style={listItem}>• Access deliverables and assets</Text>
            <Text style={listItem}>• Track your account usage and billing</Text>
          </Section>

          <Section style={buttonSection}>
            <Link href="http://localhost:3001" style={button}>
              Go to Your Portal
            </Link>
          </Section>

          <Text style={text}>
            If you have any questions or need assistance, our team is here to help.
          </Text>

          <Text style={footer}>
            Superwork - Professional Services Portal
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
};

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const listSection = {
  margin: '24px 0',
};

const listItem = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '0',
};

const buttonSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#16a34a',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 600,
  padding: '12px 32px',
  textDecoration: 'none',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '24px',
};
