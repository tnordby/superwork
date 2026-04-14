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

export type QuoteReadyForReviewEmailProps = {
  firstName: string;
  quoteTitle: string;
  quoteUrl: string;
};

export default function QuoteReadyForReviewEmail({
  firstName,
  quoteTitle,
  quoteUrl,
}: QuoteReadyForReviewEmailProps) {
  const greeting = firstName.trim() ? firstName : 'there';
  return (
    <Html>
      <Head />
      <Preview>Your quote is ready: {quoteTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your quote is ready</Heading>
          <Text style={text}>Hi {greeting},</Text>
          <Text style={text}>
            We have prepared a quote for <strong>{quoteTitle}</strong>. Review the details and approve
            when you are ready to move forward.
          </Text>
          <Section style={buttonSection}>
            <Link href={quoteUrl} style={button}>
              View quote
            </Link>
          </Section>
          <Text style={footer}>Superwork</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f6f6',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
};

const h1 = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const buttonSection = {
  margin: '24px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#0d9488',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 600,
  padding: '12px 28px',
  textDecoration: 'none',
};

const footer = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
  marginTop: '28px',
};
