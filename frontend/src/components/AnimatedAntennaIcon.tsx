import React from 'react';

interface AnimatedAntennaIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const AnimatedAntennaIcon: React.FC<AnimatedAntennaIconProps> = ({
  className = '',
  size = 'md',
  active = true,
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${sizeClasses[size]} ${className}`}
      aria-label="آیکن وضعیت آنتن مانیتورینگ ایزابل"
    >
      {/* Central base and antenna mast */}
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      <path d="M12 18V9" strokeWidth="2.2" />

      {/* Wave 1 (inner wave) */}
      <path
        d="M9 11a4.2 4.2 0 0 1 6 0"
        className={active ? 'animate-pulse' : ''}
        style={{
          animationDuration: '1.2s',
          animationIterationCount: 'infinite',
        }}
      />

      {/* Wave 2 (middle wave) */}
      <path
        d="M6.5 8a7.5 7.5 0 0 1 11 0"
        className={active ? 'animate-pulse' : ''}
        style={{
          animationDuration: '1.2s',
          animationDelay: '0.2s',
          animationIterationCount: 'infinite',
        }}
      />

      {/* Wave 3 (outer wave) */}
      <path
        d="M4 5a11 11 0 0 1 16 0"
        className={active ? 'animate-pulse' : ''}
        style={{
          animationDuration: '1.2s',
          animationDelay: '0.4s',
          animationIterationCount: 'infinite',
        }}
      />
    </svg>
  );
};
