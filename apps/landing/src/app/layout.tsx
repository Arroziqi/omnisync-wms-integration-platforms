import './global.css';

export const metadata = {
  title: 'OmniSync | Enterprise WMS Multi-Channel Integration Hub',
  description: 'Seamless real-time inventory synchronization, instant marketplace order retrieval, and high-performance event-driven webhooks for modern commerce.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
