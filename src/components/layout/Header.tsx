import ThemeToggle from "@/components/ui/ThemeToggle";
import AvatarMenu from "@/components/layout/AvatarMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 h-12 flex items-center justify-between">
        <a href="/" className="font-semibold">
          News Briefing
        </a>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <AvatarMenu />
        </nav>
      </div>
    </header>
  );
}
