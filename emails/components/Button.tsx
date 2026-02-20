import { Button as EmailButton } from '@react-email/components';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <EmailButton
      href={href}
      style={{
        backgroundColor: '#bfe937',
        color: '#1c1e31',
        fontWeight: 'bold',
        fontSize: '16px',
        padding: '14px 28px',
        borderRadius: '6px',
        textDecoration: 'none',
        display: 'inline-block',
        textAlign: 'center',
      }}
    >
      {children}
    </EmailButton>
  );
}
