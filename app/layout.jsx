import "./globals.css";

export const metadata = {
  title: "EULA RentalPMS",
  description: "Rental Property Management System — by Yoly",
  keywords: "rental, property management, landlord, Philippines, SOA, tenant tracking",
  authors: [{ name: "Yoly" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EULA",
  },
  formatDetection: { telephone: false },
  themeColor: "#4338ca",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4338ca",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EULA" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS icons — Apple ignores manifest icons, needs these separately */}
        <link rel="apple-touch-icon" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="72x72"  href="/icons/icon-72.png" />
        <link rel="apple-touch-icon" sizes="96x96"  href="/icons/icon-96.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96.png" />
        <link rel="shortcut icon" href="/icons/icon-96.png" />

        {/* iOS splash screen color */}
        <meta name="msapplication-TileColor" content="#4338ca" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />

        {/* Register service worker */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(reg) { console.log('SW registered:', reg.scope); })
                  .catch(function(err) { console.log('SW error:', err); });
              });
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
