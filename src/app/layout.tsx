import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GigSense",
    template: "%s | GigSense",
  },
  description:
    "AI-powered tools for gig workers: evaluate delivery profitability and document incidents with evidence.",
  applicationName: "GigSense",
  keywords: ["gig worker", "delivery", "profitability", "incident", "appeal", "uber eats", "doordash"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GigSense",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
  openGraph: {
    title: "GigSense",
    description: "Know your real earnings. Build your case.",
    type: "website",
    locale: "en_AU",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d6a4f",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="h-full flex flex-col">
        {children}
        {/* Service worker registration – only in browser, not during SSR */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.hostname !== 'localhost' || location.hostname === 'localhost') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[GigSense SW] registered', reg.scope); })
                    .catch(function(err) { console.warn('[GigSense SW] registration failed', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
