import type { Metadata } from "next";
import { Cairo, Tajawal, Inter } from "next/font/google";
import "./globals.css";
import FloatingSupportWidget from "@/components/public/FloatingSupportWidget";
import { BottomNavBar } from "@/components/public/BottomNavBar";

// Arabic fonts
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
});

// Latin font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "روز باريس لمواد البناء والديكور | Roze Parees",
    template: "%s | روز باريس",
  },
  description:
    "روز باريس لمواد البناء والديكور — متجر إلكتروني، توريد للمقاولين والمشاريع، ونقاط بيع الدهانات والجبس بورد وبديل الخشب والرخام في عمّان، الأردن.",
  keywords: [
    "روز باريس",
    "Roze Parees",
    "مواد بناء",
    "ديكور",
    "دهانات",
    "جبس بورد",
    "بديل الخشب",
    "بديل الرخام",
    "عمّان",
    "الأردن",
  ],
  authors: [{ name: "Roze Parees" }],
  creator: "Roze Parees",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "ar_JO",
    alternateLocale: "en_US",
    siteName: "روز باريس لمواد البناء والديكور",
  },
  icons: {
    icon: "/rozeparees.png",
    shortcut: "/rozeparees.png",
    apple: "/rozeparees.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('rp_theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <FloatingSupportWidget />
        <BottomNavBar />
      </body>
    </html>
  );
}
