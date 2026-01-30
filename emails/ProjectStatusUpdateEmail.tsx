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

interface ProjectStatusUpdateEmailProps {
  firstName: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  message?: string;
  projectLink: string;
}

export default function ProjectStatusUpdateEmail({
  firstName,
  projectName,
  oldStatus,
  newStatus,
  message,
  projectLink,
}: ProjectStatusUpdateEmailProps) {
  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Html>
      <Head />
      <Preview>Status update for {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Project Status Updated</Heading>

          <Text style={text}>
            Hi {firstName},
          </Text>

          <Text style={text}>
            The status of your project <strong>{projectName}</strong> has been updated:
          </Text>

          <Section style={statusBox}>
            <Text style={statusText}>
              {formatStatus(oldStatus)} → <strong style={newStatusStrong}>{formatStatus(newStatus)}</strong>
            </Text>
          </Section>

          {message && (
            <Section style={messageBox}>
              <Text style={messageTitle}>Message from your consultant:</Text>
              <Text style={messageText}>{message}</Text>
            </Section>
          )}

          <Section style={buttonSection}>
            <Link href={projectLink} style={button}>
              View Project Details
            </Link>
          </Section>

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

const statusBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #16a34a',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const statusText = {
  color: '#404040',
  fontSize: '18px',
  margin: '0',
};

const newStatusStrong = {
  color: '#16a34a',
};

const messageBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const messageTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: 600,
  margin: '0 0 8px',
};

const messageText = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  fontStyle: 'italic' as const,
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
