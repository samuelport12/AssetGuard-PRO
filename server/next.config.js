/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable CORS for the Vite frontend on port 3000
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
