import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light';
  asLink?: boolean;
}

const sizeMap = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
};

export default function Logo({ size = 'md', variant = 'dark', asLink = true }: LogoProps) {
  const colorClass = variant === 'light' ? 'text-white' : 'text-plum-500';
  const accentClass = variant === 'light' ? 'text-gold-300' : 'text-berry-500';

  const content = (
    <span className={`font-display font-extrabold tracking-[0.2em] ${sizeMap[size]} ${colorClass} select-none`}>
      ZO<span className={accentClass}>VIA</span>
    </span>
  );

  if (asLink) {
    return (
      <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-80" aria-label="ZOVIA home">
        {content}
      </Link>
    );
  }
  return content;
}
