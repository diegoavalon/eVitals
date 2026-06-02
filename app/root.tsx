/**
 * Root layout — unused in the static SPA shell.
 * The app entry is app/main.tsx → app/App.tsx.
 * This file is kept as a named export for potential future reuse.
 */
export function RootLayout({ children }: { children: React.ReactNode }) {
  return <div className="root">{children}</div>;
}
