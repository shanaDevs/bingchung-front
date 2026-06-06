import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({ size = 44, showText = true, className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/logo.avif"
        alt="Bing Chun"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showText && (
        <div className="leading-tight">
          <p className="font-bold text-lg text-fg tracking-tight">Bing Chun</p>
          <p className="text-[10px] text-muted uppercase tracking-widest">Sri Lanka</p>
        </div>
      )}
    </div>
  );
}
