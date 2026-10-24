import { AppNav } from "@/components/AppNav";

/** Shared layout for all main application routes (dashboard, modules, history). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ background: "var(--gs-bg)" }}>
      <AppNav />
      <main
        className="flex-1 w-full max-w-xl md:max-w-4xl mx-auto px-4 py-4 md:px-6 md:py-6"
        /* Bottom padding on mobile to clear the fixed tab bar without overlap */
        style={{ paddingBottom: "calc(76px + env(safe-area-inset-bottom))" }}
        id="main-content"
      >
        {children}
      </main>
    </div>
  );
}
