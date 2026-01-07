FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    curl \
    ca-certificates \
    iptables \
    && rm -rf /var/lib/apt/lists/*

# Install Tailscale
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Install Whisper X
RUN pip3 install --break-system-packages whisperx

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create directories for recordings and transcripts
RUN mkdir -p recordings transcripts

# Environment variables
ENV NODE_ENV=production
ENV STT_MODE=local
ENV WHISPER_MODEL=base
ENV CLEANUP_TEMP_FILES=true
ENV TAILSCALE_DIR=/var/run/tailscale

# Make script executable
RUN chmod +x scripts/start-with-tailscale.sh

# Run the bot with Tailscale wrapper
CMD ["scripts/start-with-tailscale.sh"]
