import './globals.css';

export const metadata = {
  title: 'TaskFlow',
  description: 'TaskFlow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gia-bg text-slate-900">{children}</body>
    </html>
  );
}
