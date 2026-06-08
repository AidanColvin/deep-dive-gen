/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle the curated markdown reports into the serverless function output
  // so they are readable at runtime on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./content/reports/**/*"],
  },
};

export default nextConfig;
