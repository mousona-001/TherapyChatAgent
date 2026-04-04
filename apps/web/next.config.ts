import type { NextConfig } from "next";
import { env } from "./config/env";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "api.dicebear.com",
			},
		],
	},
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: `${env.API_URL}/api/:path*`,
			},
		];
	},
};

export default nextConfig;
