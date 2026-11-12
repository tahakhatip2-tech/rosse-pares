import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "روز باريس لمواد البناء والديكور",
    short_name: "روز باريس",
    description:
      "روز باريس لمواد البناء والديكور — المنصة الرائدة لتوريد الدهانات وبدائل الخشب والرخام والجبس بورد في عمّان",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1917",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/rozeparees.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}

