"use client";
import Image from "next/image";
import { useState } from "react";

type AvatarSize = "sm" | "lg";

export const AVATAR_PX = {
  sm: 36,
  lg: 48,
} as const;

export const AVATAR_SIZE_CLASS = {
  sm: `h-[${AVATAR_PX.sm}px] w-[${AVATAR_PX.sm}px]`,
  lg: `h-[${AVATAR_PX.lg}px] w-[${AVATAR_PX.lg}px]`,
} as const;

type AvatarProps = {
  src: string | null;
  alt: string;
  initials: string;
  size: AvatarSize;
  className?: string;
};

export default function Avatar({
  src,
  alt,
  initials,
  size,
  className,
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const px = AVATAR_PX[size];
  const common = `${AVATAR_SIZE_CLASS[size]} rounded-full ${className ?? ""}`;

  if (src && !errored) {
    return (
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        className={`${common} object-cover`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      className={`${common} grid place-items-center bg-[var(--hover-bg)] transition`}
      aria-hidden
    >
      <span className="text-sm font-medium">{initials || "U"}</span>
    </div>
  );
}
