import { navigationItems } from "@/lib/navigation";
import { CompassIcon, FileIcon, ShieldIcon, SparkIcon } from "./icons";

const navIcons = [CompassIcon, FileIcon, SparkIcon, FileIcon, CompassIcon, SparkIcon];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#home" aria-label="Pro-Flow Career OS home">
          <span className="brand-mark" aria-hidden="true">PF</span>
          <span>
            <strong>Pro-Flow</strong>
            <small>Career OS</small>
          </span>
        </a>

        <nav className="desktop-nav">
          {navigationItems.map((item, index) => {
            const Icon = navIcons[index];
            return (
              <a
                className={index === 0 ? "nav-link nav-link--active" : "nav-link"}
                href={item.href}
                key={item.href}
              >
                <Icon />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="privacy-note">
          <ShieldIcon />
          <div>
            <strong>Local-first</strong>
            <span>Fixture mode is active</span>
          </div>
        </div>
      </aside>

      <div className="page-column">
        <header className="topbar">
          <div>
            <span className="environment-dot" aria-hidden="true" />
            Guided workspace
          </div>
          <span className="fixture-pill">Demo data</span>
        </header>
        <main id="main-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigationItems.slice(0, 5).map((item, index) => {
          const Icon = navIcons[index];
          return (
            <a
              className={index === 0 ? "mobile-nav-link mobile-nav-link--active" : "mobile-nav-link"}
              href={item.href}
              key={item.href}
            >
              <Icon />
              <span>{item.shortLabel}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
