"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/notes", label: "노트" },
  { href: "/review", label: "복습" },
  { href: "/settings", label: "설정" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-1 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between sm:py-2">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary">
          English Master Class
        </Link>
        <nav aria-label="주 메뉴" className="-mx-1 grid grid-cols-4 sm:flex sm:gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center justify-center rounded-lg px-4 text-base font-medium transition-colors",
                  active
                    ? "text-primary sm:bg-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "border-b-2 pb-0.5 sm:border-0 sm:pb-0",
                    active ? "border-primary" : "border-transparent"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
