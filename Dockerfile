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
    && rm -rf /var/lib/apt/lists/*

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

# Expose port for development (optional)
EXPOSE 3000

# Run the bot
CMD ["npm", "run", "start"]

