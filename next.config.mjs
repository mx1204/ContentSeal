/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp", "tesseract.js"],
  images: {
    unoptimized: true
  }
};

export default nextConfig;
