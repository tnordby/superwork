import { Text, Heading } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout';
import { Button } from '../../components/Button';
import { Divider } from '../../components/Divider';

interface WelcomeClientEmailProps {
  userName: string;
  loginUrl: string;
}

export default function WelcomeClientEmail({
  userName,
  loginUrl,
}: WelcomeClientEmailProps) {
  return (
    <EmailLayout preview="Welcome to Superwork — let's get started">
      <Heading
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#1c1e31',
          margin: '0 0 16px 0',
        }}
      >
        Welcome to Superwork, {userName}!
      </Heading>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '0 0 24px 0',
        }}
      >
        We're excited to have you on board. Superwork is your centralized hub for managing all your professional creative services — from design and development to strategy and consulting.
      </Text>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '0 0 24px 0',
        }}
      >
        Here's what you can do with your Superwork account:
      </Text>

      <ul
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '0 0 24px 0',
          paddingLeft: '20px',
        }}
      >
        <li style={{ marginBottom: '8px' }}>Submit unlimited design and development requests</li>
        <li style={{ marginBottom: '8px' }}>Track project progress in real-time</li>
        <li style={{ marginBottom: '8px' }}>Collaborate with your dedicated consultant</li>
        <li style={{ marginBottom: '8px' }}>Manage your subscription and billing</li>
        <li style={{ marginBottom: '8px' }}>Access all your project files and deliverables</li>
      </ul>

      <Divider />

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href={loginUrl}>
          Access Your Dashboard
        </Button>
      </div>

      <Text
        style={{
          fontSize: '14px',
          lineHeight: '20px',
          color: '#8f8f8f',
          margin: '24px 0 0 0',
          textAlign: 'center',
        }}
      >
        Need help getting started? Reply to this email or visit our support center.
      </Text>
    </EmailLayout>
  );
}
