import React from 'react';
import { STATUS_COLORS, StatusVariant } from '../../constants/tokens';

interface BadgeProps {
  variant?: StatusVariant;
  /** Override with raw Tailwind classes e.g. bg-purple-100 text-purple-700 */
  bgClass?: string;
  textClass?: string;
  className?: string;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  bgClass,
  textClass,
  className = '',
  children,
}) => {
  const colors = STATUS_COLORS[variant];
  const bg   = bgClass   ?? colors.bg;
  const text = textClass ?? colors.text;

  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        bg,
        text,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
};

export default Badge;
