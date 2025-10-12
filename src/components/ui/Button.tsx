import React from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded font-semibold select-none " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4",
    lg: "h-10 px-5 text-base",
  }[size];

  const variants = {
    primary:
      "text-white bg-blue-700 enabled:hover:bg-blue-800 " +
      "dark:text-[var(--bg)] dark:bg-amber-500 enabled:dark:hover:bg-amber-600",
    secondary:
      "border text-[var(--fg)] bg-transparent enabled:hover:bg-(--hover-bg) " +
      "dark:border-gray-500 dark:text-gray-200 enabled:dark:hover:bg-gray-700",
  }[variant];

  return (
    <button
      className={cn(base, sizes, variants, "cursor-pointer", className)}
      {...props}
    />
  );
}
