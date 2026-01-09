FROM node:20-slim

ARG STT_MODE

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

# Conditionally install Whisper X only if not cloud mode
RUN if [ "$STT_MODE" != "cloud" ]; then pip3 install --break-system-packages whisperx; fi

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

# Make script executable
RUN chmod +x scripts/start-with-tailscale.sh

# Run the bot with Tailscale wrapper
CMD ["scripts/start-with-tailscale.sh"]
