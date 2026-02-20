import { Text, Heading } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Divider } from '../../components/Divider';

interface PaymentFailedEmailProps {
  userName: string;
  amount: string;
  planName: string;
  retryDate: string;
  updatePaymentUrl: string;
}

export default function PaymentFailedEmail({
  userName,
  amount,
  planName,
  retryDate,
  updatePaymentUrl,
}: PaymentFailedEmailProps) {
  return (
    <EmailLayout preview="Action required: your Superwork payment failed">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Badge variant="warning">Action Required</Badge>
      </div>

      <Heading
        style={{
          fontSize: '22px',
          fontWeight: 'bold',
          color: '#1c1e31',
          margin: '0 0 16px 0',
        }}
      >
        We couldn't process your payment
      </Heading>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: '#000000',
          margin: '0 0 24px 0',
        }}
      >
        Hi {userName}, we tried to charge {amount} for your {planName} subscription, but the payment didn't go through.
      </Text>

      <div
        style={{
          backgroundColor: '#fff5f5',
          borderRadius: '8px',
          padding: '20px',
          margin: '24px 0',
          borderLeft: '4px solid #ff0000',
        }}
      >
        <Text
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#1c1e31',
            margin: '0 0 8px 0',
          }}
        >
          What happens next?
        </Text>
        <Text
          style={{
            fontSize: '14px',
            lineHeight: '20px',
            color: '#000000',
            margin: '0',
          }}
        >
          We'll automatically retry your payment on {retryDate}. To avoid any service interruption, please update your payment method now.
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
        Common reasons for payment failure:
      </Text>

      <ul
        style={{
          fontSize: '14px',
          lineHeight: '20px',
          color: '#000000',
          margin: '0 0 24px 0',
          paddingLeft: '20px',
        }}
      >
        <li style={{ marginBottom: '8px' }}>Insufficient funds in the account</li>
        <li style={{ marginBottom: '8px' }}>Expired or cancelled credit card</li>
        <li style={{ marginBottom: '8px' }}>Card issuer declined the transaction</li>
        <li style={{ marginBottom: '8px' }}>Incorrect billing information</li>
      </ul>

      <Divider />

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href={updatePaymentUrl}>
          Update Payment Method
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
        Need help? Contact our support team — we're happy to assist.
      </Text>
    </EmailLayout>
  );
}
