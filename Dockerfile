# Production Dockerfile for Jong Use (ចង់ប្រើ) with yt-dlp & FFmpeg
FROM node:20-slim

# Install system dependencies: python3, ffmpeg, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install npm dependencies
RUN npm ci --omit=dev || npm install

# Copy application source code
COPY . .

# Build Vite frontend assets
RUN npm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV YTDLP_PATH=/usr/local/bin/yt-dlp

EXPOSE 3000

# Start Express + Vite production server
CMD ["npm", "start"]
