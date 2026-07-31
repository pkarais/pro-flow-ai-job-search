export const navigationItems = [
  { label: "Home", href: "/", shortLabel: "Home" },
  { label: "My Career", href: "/career/import-review", shortLabel: "Career" },
  { label: "Find Jobs", href: "/operations", shortLabel: "Jobs" },
  { label: "Applications", href: "/applications/new", shortLabel: "Apply" },
  { label: "Archive", href: "/applications/archive", shortLabel: "Archive" },
  { label: "Interview", href: "/interview", shortLabel: "Interview" },
  { label: "Insights", href: "/insights", shortLabel: "Insights" },
] as const;

export const utilityNavigationItems = [
  { label: "Browser Extension", href: "/extension", shortLabel: "Extension" },
] as const;

export type NavigationItem = (typeof navigationItems)[number];
