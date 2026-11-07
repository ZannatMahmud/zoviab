interface CreatorSignatureProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'light' | 'dark'; // 'light' for dark backgrounds (like footer), 'dark' for light backgrounds
}

export default function CreatorSignature({
  size = 'sm',
  className = '',
  variant = 'dark',
}: CreatorSignatureProps) {
  const sizeClass =
    size === 'lg'
      ? 'text-4xl sm:text-5xl md:text-6xl'
      : size === 'md'
      ? 'text-2xl sm:text-3xl'
      : 'text-xl sm:text-2xl';
  const subClass = size === 'lg' ? 'text-xs tracking-[0.3em]' : 'text-[10px] tracking-[0.25em]';
  const colorClass = variant === 'light' ? 'text-gold-300/90' : 'text-berry-500';
  const subtitleColor = variant === 'light' ? 'text-white/60' : 'text-plum-300';

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <span className={`font-signature ${colorClass} ${sizeClass} leading-tight tracking-wide select-none`}>
        With love, Zannat ♡
      </span>
      {size === 'lg' && (
        <span className={`mt-2 font-body font-semibold uppercase ${subtitleColor} ${subClass}`}>
          Founder &amp; Designer
        </span>
      )}
    </div>
  );
}
