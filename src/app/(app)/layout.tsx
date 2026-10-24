import { AppNav } from "@/components/AppNav";

/** Shared layout for all main application routes (dashboard, modules, history). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ background: "var(--gs-bg)" }}>
      <AppNav />
      <main
        className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8"
        /* Bottom padding on mobile to clear the fixed tab bar */
        style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}
        id="main-content"
      >
        {children}
      </main>
    </div>
  );
}
