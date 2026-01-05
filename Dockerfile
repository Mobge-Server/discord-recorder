FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

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

# Run the bot
CMD ["node", "src/index.js"]
