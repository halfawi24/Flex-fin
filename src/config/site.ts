/**
 * Site-wide configuration
 * Centralized place for app constants and settings
 */
export const siteConfig = {
  name: "FlexFinToolkit",
  description: "Financial analysis suite with 12-month forecasting, scenario modeling, and executive reporting.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  links: {
    github: "https://github.com",
  },
  creator: "FlexFinToolkit",
};

export type SiteConfig = typeof siteConfig;
