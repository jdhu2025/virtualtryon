const nextConfig = {
  allowedDevOrigins: ["*.dev.coze.site"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
