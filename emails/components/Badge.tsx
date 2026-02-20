import { Text } from '@react-email/components';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export function Badge({ children, variant = 'info' }: BadgeProps) {
  const colors = {
    info: { bg: '#6a6dcd20', text: '#6a6dcd' },
    success: { bg: '#bfe93720', text: '#99bf2e' },
    warning: { bg: '#ff990020', text: '#ff9900' },
    error: { bg: '#ff000020', text: '#ff0000' },
  };

  const style = colors[variant];

  return (
    <Text
      style={{
        display: 'inline-block',
        backgroundColor: style.bg,
        color: style.text,
        fontSize: '12px',
        fontWeight: '600',
        padding: '4px 12px',
        borderRadius: '12px',
        margin: '0',
      }}
    >
      {children}
    </Text>
  );
}
