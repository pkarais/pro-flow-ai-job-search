"use client";

import { navigationItems, utilityNavigationItems } from "@/lib/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArchiveIcon, CompassIcon, ExtensionIcon, FileIcon, SparkIcon } from "./icons";

const navIcons = [CompassIcon, FileIcon, SparkIcon, FileIcon, ArchiveIcon, CompassIcon, SparkIcon];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/career")) return pathname.startsWith("/career");
  if (href === "/applications/archive") return pathname === "/applications/archive";
  if (href === "/applications/new") return pathname === "/applications/new";
  if (href.startsWith("/interview")) return pathname.startsWith("/interview");
  if (href.startsWith("/insights")) return pathname.startsWith("/insights");
  if (href.startsWith("/extension")) return pathname.startsWith("/extension");
  if (href.startsWith("/gmail")) return pathname.startsWith("/gmail");
  if (href === "/operations") return pathname.startsWith("/operations");
  if (href.startsWith("/operations#")) return false;
  return false;
}

export function UtilityNavigation() {
  const pathname = usePathname();
  const [extensionCreated, setExtensionCreated] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const response = await fetch("/api/extension/status", { cache: "no-store" });
        const status = await response.json();
        if (active) setExtensionCreated(response.ok && status.installed === true);
      } catch {
        if (active) setExtensionCreated(false);
      }
    };
    void update();
    void fetch("/api/integrations/gmail", { cache: "no-store" }).then((response) => response.json()).then((status) => setGmailConnected(status.connected === true)).catch(() => setGmailConnected(false));
    const interval = window.setInterval(() => void update(), 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  return <nav className="utility-nav" aria-label="Workspace setup">
    {utilityNavigationItems.map((item) => {
      const active = isActive(pathname, item.href);
      const configured = item.href === "/extension" ? extensionCreated : gmailConnected;
      const Icon = item.href === "/extension" ? ExtensionIcon : SparkIcon;
      return <Link
        aria-current={active ? "page" : undefined}
        className={`${active ? "nav-link nav-link--active" : "nav-link"} ${configured ? "nav-link--configured" : "nav-link--attention"}`}
        href={item.href}
        key={item.href}
      >
        <Icon />
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
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
  return (
    <span className="fixture-pill">
      Private local workflow
    </span>
  );
}
