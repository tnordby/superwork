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

export type QuoteRejectedOpsEmailProps = {
  quoteTitle: string;
  customerLabel: string;
  reasonPreview: string;
  quoteUrl: string;
};

export default function QuoteRejectedOpsEmail({
  quoteTitle,
  customerLabel,
  reasonPreview,
  quoteUrl,
}: QuoteRejectedOpsEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Quote declined: {quoteTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Quote declined by customer</Heading>
          <Text style={text}>
            <strong>{quoteTitle}</strong> — customer: {customerLabel}
          </Text>
          {reasonPreview ? (
            <Section style={box}>
              <Text style={reasonText}>{reasonPreview}</Text>
            </Section>
          ) : null}
          <Section style={buttonSection}>
            <Link href={quoteUrl} style={button}>
              View quote
            </Link>
          </Section>
          <Text style={footer}>Superwork — internal notification</Text>
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

const box = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const reasonText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const buttonSection = {
  margin: '24px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#111827',
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
