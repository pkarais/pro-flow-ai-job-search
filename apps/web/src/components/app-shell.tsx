import { ShieldIcon } from "./icons";
import {
  MobileNavigation,
  PrimaryNavigation,
  WorkspaceModeBadge,
} from "./navigation-chrome";

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

        <PrimaryNavigation />

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
          <WorkspaceModeBadge />
        </header>
        <main id="main-content">{children}</main>
      </div>

      <MobileNavigation />
    </div>
  );
}
