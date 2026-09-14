import { Outlet, Link } from "react-router-dom";

/**
 * App shell: header, routed content, and the always-visible disclaimer
 * (FR-040 - the informational disclaimer must always be present).
 */
export function App() {
  const appName = import.meta.env.VITE_APP_NAME || "Food Signal";
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-title">
          {appName}
        </Link>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-disclaimer" role="note">
        Food Signal provides informational guidance only. It never guarantees a dish is safe. Verify
        ingredients and preparation with restaurant staff.
      </footer>
    </div>
  );
}
