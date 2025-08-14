export const metadata = { title: "Eleven Founder Score" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily: 'Inter, system-ui, Arial, sans-serif'}}>{children}</body>
    </html>
  );
}
