import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Font,
} from '@react-email/components';
import { Header } from './Header';
import { Footer } from './Footer';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  showUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}

export function EmailLayout({
  preview,
  children,
  showUnsubscribe = false,
  unsubscribeUrl,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: '#ffffff',
          fontFamily: 'Inter, Arial, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
          }}
        >
          <Header />
          <Section
            style={{
              padding: '32px 24px',
              backgroundColor: '#ffffff',
            }}
          >
            {children}
          </Section>
          <Footer showUnsubscribe={showUnsubscribe} unsubscribeUrl={unsubscribeUrl} />
        </Container>
      </Body>
    </Html>
  );
}
