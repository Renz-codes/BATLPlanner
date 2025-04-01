/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    transpilePackages: ['@tauri-apps/api'],
    images: {
        unoptimized: true  // 画像最適化を無効化
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@tauri-apps/api': '@tauri-apps/api'
        };
        return config;
    }
};

export default nextConfig;
