import { Section, Img } from '@react-email/components';

const LOGO_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/superwork-logo-white.svg`
  : 'https://superwork.co/superwork-logo-white.svg';

export function Header() {
  return (
    <Section
      style={{
        backgroundColor: '#1c1e31',
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      <Img
        src={LOGO_URL}
        alt="Superwork"
        width="140"
        height="auto"
        style={{
          margin: '0 auto',
          display: 'block',
        }}
      />
    </Section>
  );
}
