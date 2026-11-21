/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'sonner',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
    ],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
