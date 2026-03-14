import Image from 'next/image';

interface ZeonLogoProps {
  size?: number;
  showText?: boolean;
}

export default function ZeonLogo({ size = 32, showText = false }: ZeonLogoProps) {
  if (showText) {
    return (
      <Image
        src="/zeon-logo.webp"
        width={160}
        height={48}
        alt="Zeon Charging"
        style={{ objectFit: 'contain', display: 'block' }}
      />
    );
  }

  return (
    <Image
      src="/zeon-icon.jpeg"
      width={size}
      height={size}
      alt="Zeon"
      style={{ borderRadius: Math.round(size * 0.22), objectFit: 'cover', flexShrink: 0 }}
    />
  );
}
