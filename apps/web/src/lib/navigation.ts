export const navigationItems = [
  { label: "Home", href: "#home", shortLabel: "Home" },
  { label: "My Career", href: "#career", shortLabel: "Career" },
  { label: "Find Jobs", href: "#jobs", shortLabel: "Jobs" },
  { label: "Applications", href: "#applications", shortLabel: "Pipeline" },
  { label: "Interview", href: "#interview", shortLabel: "Interview" },
  { label: "Insights", href: "#insights", shortLabel: "Insights" },
] as const;

export type NavigationItem = (typeof navigationItems)[number];
