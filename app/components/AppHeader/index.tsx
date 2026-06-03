import { NavLink } from "react-router";
import { cn } from "../ui/utils/cn";
import { EhiSelect } from "../ui/EhiSelect";
import { useDashboardFilters } from "~/lib/DashboardFiltersContext";

/* ------------------------------------------------------------------ */
/*  Icons                                                               */
/* ------------------------------------------------------------------ */

function LogoIcon() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
      <svg
        className="size-5"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M1 10h3.5l2-5.5 4 11 2-5.5H19"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="size-4 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.5 10.5L13 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      className="size-4 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.5H10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="size-4 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav link                                                            */
/* ------------------------------------------------------------------ */

function AppNavLink({
  to,
  end,
  icon,
  children,
}: {
  to: string;
  end?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5",
          "font-poppins text-sm font-medium transition-colors duration-150",
          isActive
            ? "bg-surface-canvas text-primary"
            : "text-on-surface-dark hover:bg-surface-muted hover:text-on-surface",
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                              */
/* ------------------------------------------------------------------ */

export function AppHeader() {
  const {
    selectedDevice,
    setSelectedDevice,
    selectedCategory,
    setSelectedCategory,
    config,
  } = useDashboardFilters();

  const deviceItems = config.devices.map((d) => ({
    value: d,
    label: d.charAt(0).toUpperCase() + d.slice(1),
  }));

  const categoryItems = config.enabledCategories.map((c) => ({
    value: c,
    label: c
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  }));

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-sm">
      <div className="flex h-16 items-center gap-2 px-6">
        {/* ── Logo ── */}
        <div className="flex items-center gap-2.5 mr-4">
          <LogoIcon />
          <span className="font-poppins font-bold text-[16px] text-on-surface tracking-tight">
            eVitals
          </span>
        </div>

        {/* ── Nav ── */}
        <nav className="flex items-center gap-0.5" aria-label="Main navigation">
          <AppNavLink to="/" end>
            Home
          </AppNavLink>
          <AppNavLink to="/all-pages" icon={<SearchIcon />}>
            All Pages
          </AppNavLink>
          <AppNavLink to="/trends">Trends</AppNavLink>
          <AppNavLink to="/settings">Settings</AppNavLink>
        </nav>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Filters ── */}
        <div className="flex items-center gap-3">
          <EhiSelect
            variant="outline"
            value={selectedDevice}
            onValueChange={(v) => v && setSelectedDevice(v)}
            items={deviceItems}
            className="w-36"
          />
          <EhiSelect
            variant="outline"
            value={selectedCategory}
            onValueChange={(v) => v && setSelectedCategory(v)}
            items={categoryItems}
            className="w-44"
          />
        </div>

        {/* ── Run check ── */}
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 h-10 rounded-full px-4",
            "bg-primary text-surface",
            "font-poppins font-bold text-sm",
            "hover:brightness-95 active:brightness-90",
            "transition-all duration-150",
            "focus-visible:outline-2 focus-visible:outline-warning focus-visible:outline-offset-2",
          )}
        >
          <RefreshIcon />
          Run check
        </button>

        {/* ── Dark mode toggle ── */}
        <button
          type="button"
          aria-label="Toggle dark mode"
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            "border border-border bg-surface text-on-surface-dark",
            "hover:bg-surface-muted transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-warning focus-visible:outline-offset-2",
          )}
        >
          <MoonIcon />
        </button>
      </div>
    </header>
  );
}
