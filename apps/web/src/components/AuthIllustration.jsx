export default function AuthIllustration({ className = "" }) {
  return (
    <svg
      viewBox="0 0 240 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* camera viewfinder corners */}
      <path d="M15 32 L15 15 L32 15" stroke="#16533C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M208 15 L225 15 L225 32" stroke="#16533C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 48 L15 65 L32 65" stroke="#16533C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M208 65 L225 65 L225 48" stroke="#16533C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* plate */}
      <circle cx="120" cy="40" r="30" fill="#F6F8F5" stroke="#D0DCCD" strokeWidth="1.5" />
      <circle cx="120" cy="40" r="24" fill="white" stroke="#D0DCCD" strokeWidth="1" />
      {/* leaf */}
      <path d="M105 43 C103 33 113 27 123 33 C115 37 109 43 105 43Z" fill="#2F7D5B" />
      <path d="M105 43 C111 38 118 33 123 33" stroke="#16533C" strokeWidth="0.75" strokeLinecap="round" />
      {/* yolk */}
      <circle cx="125" cy="47" r="7" fill="#FFC83D" />
      {/* food dot */}
      <circle cx="109" cy="52" r="2.5" fill="#D0DCCD" />
    </svg>
  );
}
