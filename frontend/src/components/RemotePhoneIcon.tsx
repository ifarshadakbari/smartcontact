import React from 'react';

interface RemotePhoneIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Remote / Telework icon representing a remote extension (Laptop + Signal waves / Remote phone)
 */
export const RemotePhoneIcon: React.FC<RemotePhoneIconProps> = ({
  className = 'w-4 h-4',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Remote screen / terminal */}
      <rect x="3" y="4" width="14" height="10" rx="2" />
      {/* Screen inner indicator */}
      <line x1="7" y1="9" x2="11" y2="9" strokeWidth="1.5" />
      {/* Stand / Base */}
      <path d="M2 17h16" />
      <path d="M7 14v3" />
      <path d="M13 14v3" />
      {/* Remote connection signal / cloud waves */}
      <path d="M19 7a3 3 0 0 1 0 4" />
      <path d="M21.5 5a6 6 0 0 1 0 8" />
    </svg>
  );
};

export default RemotePhoneIcon;
