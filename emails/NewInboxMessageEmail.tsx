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

interface NewInboxMessageEmailProps {
  recipientLabel: string;
  projectName: string;
  senderName: string;
  preview: string;
  projectUrl: string;
}

export default function NewInboxMessageEmail({
  recipientLabel,
  projectName,
  senderName,
  preview,
  projectUrl,
}: NewInboxMessageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New message on {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New message</Heading>
          <Text style={text}>Hi {recipientLabel},</Text>
          <Text style={text}>
            <strong>{senderName}</strong> sent a message about <strong>{projectName}</strong>.
          </Text>
          <Section style={quote}>
            <Text style={quoteText}>{preview}</Text>
          </Section>
          <Section style={buttonSection}>
            <Link href={projectUrl} style={button}>
              View project
            </Link>
          </Section>
          <Text style={footer}>You are receiving this because you are on the thread in Superwork.</Text>
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

const quote = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '16px',
  margin: '16px 0',
};

const quoteText = {
  color: '#111827',
  fontSize: '15px',
  lineHeight: '22px',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const buttonSection = {
  margin: '24px 0',
};

const button = {
  backgroundColor: '#111827',
  borderRadius: '10px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 20px',
  textDecoration: 'none',
};

const footer = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 0 0',
};
