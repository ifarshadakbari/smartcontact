import React from 'react';

interface CordlessPhoneIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Cordless / DECT wireless telephone handset icon with wireless broadcast radio waves.
 */
export const CordlessPhoneIcon: React.FC<CordlessPhoneIconProps> = ({
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
      {/* Handset antenna at top */}
      <path d="M7.5 4.5V2" />
      {/* Cordless phone handset body */}
      <rect x="5" y="4.5" width="7" height="16" rx="2" />
      {/* Earpiece / Speaker slit */}
      <line x1="7.5" y1="6.8" x2="9.5" y2="6.8" strokeWidth="1.5" />
      {/* Display screen */}
      <rect x="6.5" y="8.8" width="4" height="2.8" rx="0.5" strokeWidth="1.2" />
      {/* Keypad buttons */}
      <circle cx="7.2" cy="13.2" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="13.2" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="7.2" cy="15.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="15.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="17.6" r="0.6" fill="currentColor" stroke="none" />
      {/* Wireless signal waves emitting from the handset */}
      <path d="M14.5 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M17.5 7a7 7 0 0 1 0 10" />
    </svg>
  );
};

export default CordlessPhoneIcon;
