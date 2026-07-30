export const navigationItems = [
  { label: "Home", href: "/", shortLabel: "Home" },
  { label: "My Career", href: "/career/import-review", shortLabel: "Career" },
  { label: "Find Jobs", href: "/#jobs", shortLabel: "Jobs" },
  { label: "Applications", href: "/applications/new", shortLabel: "Pipeline" },
  { label: "Interview", href: "/#interview", shortLabel: "Interview" },
  { label: "Insights", href: "/#insights", shortLabel: "Insights" },
] as const;

export type NavigationItem = (typeof navigationItems)[number];
