import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "毎日検温くんZ",
  description:
    "穏やかな日常が戻るまで、日々のお手間を少しずつお手伝いします。体温の記録、ちょこっとメモ、履歴のCSV出力も。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
