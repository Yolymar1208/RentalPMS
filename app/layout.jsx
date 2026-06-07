import "./globals.css";

export const metadata = {
  title: "PropManager — by Yoly",
  description: "Rental Property Management System",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
