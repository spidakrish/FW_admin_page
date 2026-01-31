import { serviceUrls } from "./config";

export const routes = [
  { label: "Dashboard", href: "/" },
  {
    label: "Document Analysis Tool",
    href: serviceUrls.fwAnalysis,
    external: true
  },
  { label: "Backpro Platform", href: serviceUrls.backpro, external: true }
];
