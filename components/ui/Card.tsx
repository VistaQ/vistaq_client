import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
}) => (
  <div
    onClick={onClick}
    className={[
      'bg-white rounded-xl shadow-sm border border-gray-100',
      paddingClasses[padding],
      onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

export default Card;
