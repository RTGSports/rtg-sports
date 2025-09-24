import "./globals.css";

export const metadata = {
  title: "RTG Sports",
  description: "Women's sports scores & news"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}