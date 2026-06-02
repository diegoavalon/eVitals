import { Routes, Route } from "react-router";
import Home from "./routes/home";
import { useDashboardConfig } from "./lib/useDashboardConfig";
import { AppShell } from "./components/AppShell";

export default function App() {
  const configState = useDashboardConfig();

  if (configState.status === "loading") {
    return (
      <main className="p-8">
        <div role="status" aria-label="Loading configuration" className="text-neutral font-open-sans text-[16px]">
          Loading configuration…
        </div>
      </main>
    );
  }

  if (configState.status === "missing") {
    return (
      <main className="p-8">
        <div role="alert" className="text-error font-open-sans text-[16px]">
          Dashboard configuration not found. Ensure{" "}
          <code>public/data/dashboard.config.json</code> exists.
        </div>
      </main>
    );
  }

  if (configState.status === "invalid") {
    return (
      <main className="p-8">
        <div role="alert" className="text-error font-open-sans text-[16px]">
          <p className="font-bold mb-2">Dashboard configuration is invalid:</p>
          <ul className="list-disc ml-4 space-y-1">
            {configState.errors.map((e, i) => (
              <li key={i}>
                <code>{e.field}</code>: {e.message}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <AppShell config={configState.config}>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </AppShell>
  );
}
