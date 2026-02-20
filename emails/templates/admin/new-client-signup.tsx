import { Text, Heading } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

interface NewClientSignupEmailProps {
  clientName: string;
  clientEmail: string;
  signupDate: string;
  planName?: string;
  dashboardUrl: string;
}

export default function NewClientSignupEmail({
  clientName,
  clientEmail,
  signupDate,
  planName,
  dashboardUrl,
}: NewClientSignupEmailProps) {
  return (
    <EmailLayout preview={`New client signup: ${clientName}`}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Badge variant="success">New Signup</Badge>
      </div>

      <Heading
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#1c1e31',
          margin: '0 0 16px 0',
        }}
      >
        New Client Signup
      </Heading>

      <div
        style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '20px',
          margin: '24px 0',
        }}
      >
        <Text
          style={{
            fontSize: '14px',
            color: '#8f8f8f',
            margin: '0 0 8px 0',
          }}
        >
          Client Name
        </Text>
        <Text
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1c1e31',
            margin: '0 0 16px 0',
          }}
        >
          {clientName}
        </Text>

        <Text
          style={{
            fontSize: '14px',
            color: '#8f8f8f',
            margin: '0 0 8px 0',
          }}
        >
          Email
        </Text>
        <Text
          style={{
            fontSize: '16px',
            color: '#1c1e31',
            margin: '0 0 16px 0',
          }}
        >
          {clientEmail}
        </Text>

        <Text
          style={{
            fontSize: '14px',
            color: '#8f8f8f',
            margin: '0 0 8px 0',
          }}
        >
          Signup Date
        </Text>
        <Text
          style={{
            fontSize: '16px',
            color: '#1c1e31',
            margin: '0 0 16px 0',
          }}
        >
          {signupDate}
        </Text>

        {planName && (
          <>
            <Text
              style={{
                fontSize: '14px',
                color: '#8f8f8f',
                margin: '0 0 8px 0',
              }}
            >
              Plan
            </Text>
            <Text
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1c1e31',
                margin: '0',
              }}
            >
              {planName}
            </Text>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href={dashboardUrl}>
          View in Admin Dashboard
        </Button>
      </div>
    </EmailLayout>
  );
}
