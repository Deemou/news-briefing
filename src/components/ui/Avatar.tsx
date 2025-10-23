"use client";
import Image from "next/image";
import { useState } from "react";

type AvatarSize = "sm" | "lg";
const SIZE_MAP = { sm: 36, lg: 48 };

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
  const px = SIZE_MAP[size];
  const dims = `h-[${px}px] w-[${px}px]`;
  const common = `${dims} rounded-full ${className ?? ""}`;

  if (!src || errored) {
    return (
      <span
        aria-hidden
        className={`${common} bg-(--muted) text-(--muted-foreground) grid place-items-center text-sm font-medium`}
      >
        {initials || "U"}
      </span>
    );
  }

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
