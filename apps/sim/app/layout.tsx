import { useId } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { PublicEnvScript } from "next-runtime-env";
import { generateThemeCSS } from "@/lib/branding/inject-theme";
import {
  generateBrandedMetadata,
  generateStructuredData,
} from "@/lib/branding/metadata";
import { isHosted } from "@/lib/environment";
import { createLogger } from "@/lib/logs/console/logger";
import "@/app/globals.css";

import { SessionProvider } from "@/lib/session/session-context";
import { ConditionalThemeProvider } from "@/app/conditional-theme-provider";
import { ZoomPrevention } from "@/app/zoom-prevention";

const logger = createLogger("RootLayout");

// Browser extension attributes moved to client-side component
// This prevents build-time execution that can cause optimization hangs

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
};

// Generate dynamic metadata based on brand configuration
export const metadata: Metadata = generateBrandedMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeStyleId = useId();
  const structuredData = generateStructuredData();
  const themeCSS = generateThemeCSS();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />

        {/* Theme css Override */}
        {themeCSS && (
          <style
            id={themeStyleId}
            dangerouslySetInnerHTML={{
              __html: themeCSS,
            }}
          />
        )}

        {/* Basic head hints that are not covered by the Metadata API */}
        <meta Name="color-scheme" content="light dark" />
        <meta Name="format-detection" content="telephone=no" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />

        <PublicEnvScript />
      </head>
      <body suppressHydrationWarning>
        <ConditionalThemeProvider>
          <SessionProvider>
            <brandedLayout>
              <ZoomPrevention />
              {children}
              {isHosted && (
                <>
                  <SpeedInsights />
                  <Analytics />
                </>
              )}
            </brandedLayout>
          </SessionProvider>
        </ConditionalThemeProvider>
      </body>
    </html>
  );
}
