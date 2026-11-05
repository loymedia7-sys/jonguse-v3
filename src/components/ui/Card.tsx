import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  id,
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs transition-all duration-200 ${
        hoverable ? 'hover:shadow-md hover:border-stone-300 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
