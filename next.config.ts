import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Avoid inferring a parent directory as the app root when another lockfile exists above this repo.
  outputFileTracingRoot: projectRoot,
};

export default withSentryConfig(nextConfig, {
  org: "superwork",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
