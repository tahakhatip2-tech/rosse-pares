import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://rosse-pares.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/unauthorized"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

