import './globals.css';

export const metadata = {
  title: 'AI智能图片裁剪工具',
  description: '基于AI的智能图片裁剪和编辑工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}