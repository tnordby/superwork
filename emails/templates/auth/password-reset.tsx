import { Text, Heading } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout';
import { Button } from '../../components/Button';
import { Divider } from '../../components/Divider';

interface PasswordResetEmailProps {
  resetUrl: string;
  userName?: string;
}

export default function PasswordResetEmail({
  resetUrl,
  userName,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your Superwork password">
      <Heading
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#1c1e31',
          margin: '0 0 16px 0',
        }}
      >
        Reset your password
      </Heading>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '0 0 24px 0',
        }}
      >
        {userName ? `Hi ${userName}, ` : 'Hi, '}
        we received a request to reset your Superwork password.
      </Text>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '0 0 24px 0',
        }}
      >
        Click the button below to create a new password:
      </Text>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href={resetUrl}>
          Reset Password
        </Button>
      </div>

      <Text
        style={{
          fontSize: '14px',
          lineHeight: '20px',
          color: '#8f8f8f',
          margin: '0 0 16px 0',
        }}
      >
        This link will expire in 24 hours for security reasons.
      </Text>

      <Divider />

      <Text
        style={{
          fontSize: '14px',
          lineHeight: '20px',
          color: '#8f8f8f',
          margin: '24px 0 0 0',
        }}
      >
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </Text>
    </EmailLayout>
  );
}
