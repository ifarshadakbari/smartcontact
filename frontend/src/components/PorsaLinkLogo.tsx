import React, { useId } from 'react';

interface PorsaLinkLogoProps {
  className?: string;
  size?: number | string;
}

export const PorsaLinkLogo: React.FC<PorsaLinkLogoProps> = ({
  className = 'w-9 h-9',
  size,
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const purpleGradId = `porsaPurpleGrad_${uniqueId}`;
  const greenGradId = `porsaGreenGrad_${uniqueId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="پُــرسا لینک"
    >
      <defs>
        {/* Purple / Violet Gradient for Address Book Binder Frame */}
        <linearGradient id={purpleGradId} x1="15%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="45%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>

        {/* Green / Emerald Gradient for Contact Silhouette */}
        <linearGradient id={greenGradId} x1="50%" y1="15%" x2="50%" y2="85%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="50%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* 3 Left Binder Tabs */}
      <rect x="13" y="23" width="14" height="9" rx="3.5" fill={`url(#${purpleGradId})`} />
      <rect x="13" y="45.5" width="14" height="9" rx="3.5" fill={`url(#${purpleGradId})`} />
      <rect x="13" y="68" width="14" height="9" rx="3.5" fill={`url(#${purpleGradId})`} />

      {/* Main Address Book Frame with Inner Cutout (fill-rule: evenodd) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 43 11 H 69 A 20 20 0 0 1 89 31 V 69 A 20 20 0 0 1 69 89 H 43 A 20 20 0 0 1 23 69 V 31 A 20 20 0 0 1 43 11 Z M 45 19 H 67 A 13 13 0 0 1 80 32 V 68 A 13 13 0 0 1 67 81 H 45 A 13 13 0 0 1 32 68 V 32 A 13 13 0 0 1 45 19 Z"
        fill={`url(#${purpleGradId})`}
      />

      {/* Avatar Inside Cutout */}
      <circle cx="56" cy="37" r="10.5" fill={`url(#${greenGradId})`} />
      <path
        d="M 38 73 C 38 54.5, 74 54.5, 74 73"
        stroke={`url(#${greenGradId})`}
        strokeWidth="8.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};
