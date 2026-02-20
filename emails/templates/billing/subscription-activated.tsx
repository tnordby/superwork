import { Text, Heading } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Divider } from '../../components/Divider';

interface SubscriptionActivatedEmailProps {
  userName: string;
  planName: string;
  amount: string;
  billingInterval: string;
  nextBillingDate: string;
  dashboardUrl: string;
}

export default function SubscriptionActivatedEmail({
  userName,
  planName,
  amount,
  billingInterval,
  nextBillingDate,
  dashboardUrl,
}: SubscriptionActivatedEmailProps) {
  return (
    <EmailLayout preview={`You're subscribed — welcome to ${planName}`}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Badge variant="success">Payment Successful</Badge>
      </div>

      <Heading
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#1c1e31',
          margin: '0 0 16px 0',
          textAlign: 'center',
        }}
      >
        Welcome to {planName}!
      </Heading>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '0 0 24px 0',
        }}
      >
        Hi {userName}, your subscription to Superwork {planName} is now active. We're excited to help you bring your creative projects to life.
      </Text>

      <div
        style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '24px',
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
          Plan
        </Text>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1c1e31',
            margin: '0 0 16px 0',
          }}
        >
          {planName}
        </Text>

        <Text
          style={{
            fontSize: '14px',
            color: '#8f8f8f',
            margin: '0 0 8px 0',
          }}
        >
          Billing
        </Text>
        <Text
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1c1e31',
            margin: '0 0 16px 0',
          }}
        >
          {amount} / {billingInterval}
        </Text>

        <Text
          style={{
            fontSize: '14px',
            color: '#8f8f8f',
            margin: '0 0 8px 0',
          }}
        >
          Next billing date
        </Text>
        <Text
          style={{
            fontSize: '16px',
            color: '#1c1e31',
            margin: '0',
          }}
        >
          {nextBillingDate}
        </Text>
      </div>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '24px 0',
        }}
      >
        You now have unlimited access to submit design requests, collaborate with your dedicated consultant, and track all your projects in one place.
      </Text>

      <Divider />

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href={dashboardUrl}>
          Go to Dashboard
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
        Have questions? We're here to help. Reply to this email anytime.
      </Text>
    </EmailLayout>
  );
}
