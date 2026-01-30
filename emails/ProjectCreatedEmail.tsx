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

interface ProjectCreatedEmailProps {
  firstName: string;
  projectName: string;
  projectDescription: string;
  assignee: string;
  projectLink: string;
}

export default function ProjectCreatedEmail({
  firstName,
  projectName,
  projectDescription,
  assignee,
  projectLink,
}: ProjectCreatedEmailProps) {
  // Email template for project creation notifications
  return (
    <Html>
      <Head />
      <Preview>New project created: {projectName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Project Created</Heading>

          <Text style={text}>
            Hi {firstName},
          </Text>

          <Text style={text}>
            A new project has been created for you:
          </Text>

          <Section style={projectBox}>
            <Heading style={projectTitle}>{projectName}</Heading>
            <Text style={projectDescriptionStyle}>{projectDescription}</Text>
            {assignee && (
              <Text style={assigneeText}>
                <strong>Assigned to:</strong> {assignee}
              </Text>
            )}
          </Section>

          <Section style={buttonSection}>
            <Link href={projectLink} style={button}>
              View Project
            </Link>
          </Section>

          <Text style={text}>
            You can view project details, communicate with your consultant, and track progress in your customer portal.
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

const projectBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const projectTitle = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const projectDescriptionStyle = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const assigneeText = {
  color: '#404040',
  fontSize: '14px',
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
