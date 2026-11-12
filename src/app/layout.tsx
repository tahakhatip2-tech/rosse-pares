import type { Metadata, Viewport } from "next";
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

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://rosse-pares.vercel.app");

const SITE_TITLE = "روز باريس لمواد البناء والديكور | Roze Parees";
const SITE_DESCRIPTION =
  "روز باريس لمواد البناء والديكور الحديث — المنصة الرائدة لتوريد الدهانات الفاخرة، بدائل الخشب والرخام، ألواح الجبس بورد، مواد العزل والعدد الإنشائية للمشاريع والمقاولين في عمّان والأردن.";
const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;
const OG_BANNER_URL = `${SITE_URL}/og-banner.jpg`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | روز باريس",
  },
  description: SITE_DESCRIPTION,
  applicationName: "روز باريس",
  authors: [{ name: "روز باريس لمواد البناء والديكور", url: SITE_URL }],
  creator: "روز باريس",
  publisher: "روز باريس",
  category: "Building Materials & Decor",
  keywords: [
    "روز باريس",
    "Roze Parees",
    "مواد بناء عمان",
    "ديكور داخلي وخارجي",
    "دهانات الأردن",
    "بديل الخشب WPC",
    "بديل الرخام UV",
    "ألواح جبس بورد",
    "مواد عزل مائي وحراري",
    "تجهيز مشاريع ومقاولات",
    "عمان الأردن",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "ar_JO",
    alternateLocale: "en_US",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "روز باريس لمواد البناء والديكور",
    images: [
      {
        url: "/og-image.jpg",
        secureUrl: OG_IMAGE_URL,
        width: 800,
        height: 800,
        type: "image/jpeg",
        alt: "شعار روز باريس لمواد البناء والديكور RP 3D",
      },
      {
        url: "/og-banner.jpg",
        secureUrl: OG_BANNER_URL,
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "صرح روز باريس المعماري لمواد البناء والديكور",
      },
      {
        url: "/rozeparees.png",
        secureUrl: `${SITE_URL}/rozeparees.png`,
        width: 512,
        height: 512,
        type: "image/png",
        alt: "شعار روز باريس",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_BANNER_URL],
    creator: "@rozeparees",
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "256x256", type: "image/png" },
      { url: "/rozeparees.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/rozeparees.png",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        {/* WhatsApp, Facebook & Search Engines Direct Meta Fallbacks */}
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content="https://rosse-pares.vercel.app/og-image.jpg" />
        <meta property="og:image:secure_url" content="https://rosse-pares.vercel.app/og-image.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="800" />
        <meta property="og:url" content="https://rosse-pares.vercel.app" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="روز باريس لمواد البناء والديكور" />
        <link rel="image_src" href="https://rosse-pares.vercel.app/og-image.jpg" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content="https://rosse-pares.vercel.app/og-banner.jpg" />

        {/* WhatsApp specific optimizations */}
        <meta itemProp="name" content={SITE_TITLE} />
        <meta itemProp="description" content={SITE_DESCRIPTION} />
        <meta itemProp="image" content="https://rosse-pares.vercel.app/og-image.jpg" />

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
