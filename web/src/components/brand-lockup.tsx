import Image from "next/image";

export function BrandLockup({ size = 22 }: { size?: number }) {
  return (
    <span className="brand-lockup">
      <Image
        src="/brand/onoffmypc-mark-signature.svg"
        alt=""
        width={size}
        height={size}
        unoptimized
      />
      <span className="brand-wordmark">OnOffMyPC</span>
    </span>
  );
}
