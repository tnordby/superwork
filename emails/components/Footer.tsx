import { Section, Text, Link, Hr } from '@react-email/components';

interface FooterProps {
  showUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}

export function Footer({ showUnsubscribe = false, unsubscribeUrl }: FooterProps) {
  return (
    <Section
      style={{
        backgroundColor: '#1c1e31',
        padding: '32px 24px',
      }}
    >
      <Hr
        style={{
          borderColor: '#ffffff20',
          margin: '0 0 24px 0',
        }}
      />

      <Text
        style={{
          color: '#8f8f8f',
          fontSize: '14px',
          lineHeight: '20px',
          textAlign: 'center',
          margin: '0 0 16px 0',
        }}
      >
        <Link
          href="https://superwork.com"
          style={{
            color: '#8f8f8f',
            textDecoration: 'none',
            marginRight: '16px',
          }}
        >
          Superwork.com
        </Link>
        {' • '}
        <Link
          href="https://superwork.com/support"
          style={{
            color: '#8f8f8f',
            textDecoration: 'none',
            marginLeft: '16px',
            marginRight: '16px',
          }}
        >
          Support
        </Link>
        {' • '}
        <Link
          href="https://superwork.com/privacy"
          style={{
            color: '#8f8f8f',
            textDecoration: 'none',
            marginLeft: '16px',
          }}
        >
          Privacy
        </Link>
      </Text>

      {showUnsubscribe && unsubscribeUrl && (
        <Text
          style={{
            color: '#8f8f8f',
            fontSize: '12px',
            lineHeight: '16px',
            textAlign: 'center',
            margin: '16px 0 0 0',
          }}
        >
          <Link
            href={unsubscribeUrl}
            style={{
              color: '#8f8f8f',
              textDecoration: 'underline',
            }}
          >
            Unsubscribe from these emails
          </Link>
        </Text>
      )}

      <Text
        style={{
          color: '#8f8f8f',
          fontSize: '12px',
          lineHeight: '16px',
          textAlign: 'center',
          margin: '16px 0 0 0',
        }}
      >
        © {new Date().getFullYear()} Superwork. All rights reserved.
      </Text>
    </Section>
  );
}
