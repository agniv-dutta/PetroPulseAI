import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export const PetroPulseLogo: React.FC<LogoProps> = ({ size = 36, showText = false }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Drop Contour (Dark/White depending on background, dark outer contour) */}
        <path
          d="M50 10 C30 45 20 60 20 72 C20 88 33.4 95 50 95 C66.6 95 80 88 80 72 C80 60 70 45 50 10 Z"
          stroke="#F3EFE4"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Top-left sheen accent */}
        <path
          d="M34 40 L42 26"
          stroke="#F3EFE4"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Bottom-left sheen accent */}
        <path
          d="M28 78 A 20 20 0 0 0 40 90"
          stroke="#F3EFE4"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Horizontal Pulse Line (Golden Orange #FF9000) */}
        <path
          d="M10 52 L35 52 L42 35 L50 68 L58 42 L65 52 L90 52"
          stroke="#FF9000"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#F3EFE4', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
            PETROPULSE <span style={{ color: '#FF9000' }}>AI</span>
          </span>
        </div>
      )}
    </div>
  );
};
