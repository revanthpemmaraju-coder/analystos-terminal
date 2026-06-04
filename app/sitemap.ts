import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://analystos-terminal.vercel.app";
  const currentDate = new Date();

  const routes = [
    "",
    "/mobile",
    "/dashboard",
    "/dcf",
    "/portfolio",
    "/analyst",
    "/login",
    "/signup",
    "/stocks/AAPL",
    "/stocks/NVDA",
    "/stocks/TSLA"
  ];

  return routes.map((route) => {
    // Determine page priority
    let priority = 0.7;
    let changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never" = "weekly";

    if (route === "") {
      priority = 1.0;
      changeFrequency = "daily";
    } else if (route === "/mobile" || route === "/dashboard" || route === "/dcf") {
      priority = 0.9;
      changeFrequency = "daily";
    } else if (route.startsWith("/stocks/")) {
      priority = 0.8;
      changeFrequency = "hourly"; // stock pages change often due to market updates
    } else if (route === "/login" || route === "/signup") {
      priority = 0.3;
      changeFrequency = "monthly";
    }

    return {
      url: `${baseUrl}${route}`,
      lastModified: currentDate,
      changeFrequency,
      priority,
    };
  });
}
