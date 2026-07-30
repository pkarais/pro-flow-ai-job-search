"use client";

import { navigationItems } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassIcon, FileIcon, SparkIcon } from "./icons";

const navIcons = [CompassIcon, FileIcon, SparkIcon, FileIcon, CompassIcon, SparkIcon];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/career")) return pathname.startsWith("/career");
  return false;
}

export function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <nav className="desktop-nav">
      {navigationItems.map((item, index) => {
        const Icon = navIcons[index];
        const active = isActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "nav-link nav-link--active" : "nav-link"}
            href={item.href}
            key={item.href}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {navigationItems.slice(0, 5).map((item, index) => {
        const Icon = navIcons[index];
        const active = isActive(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "mobile-nav-link mobile-nav-link--active" : "mobile-nav-link"}
            href={item.href}
            key={item.href}
          >
            <Icon />
            <span>{item.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function WorkspaceModeBadge() {
  const pathname = usePathname();
  return (
    <span className="fixture-pill">
      {pathname.startsWith("/career") ? "Read-only local" : "Demo data"}
    </span>
  );
}
