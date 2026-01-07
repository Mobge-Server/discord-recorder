#!/bin/sh

# Function to cleanup tailscale on exit
cleanup() {
    echo "Stopping Tailscale..."
    tailscale logout
    killall tailscaled
}

# Trap signals
trap cleanup TERM INT

if [ -n "$TAILSCALE_AUTH_KEY" ]; then
    echo "Starting Tailscale..."
    
    # Start tailscaled in background
    # --tun=userspace-networking is often needed in containers unless /dev/net/tun is strictly available and permissions are right.
    # However, since we requested /dev/net/tun, we try standard mode first or explicit tun device.
    # Using userspace-networking is safer for some container envs but might be slower.
    # We will try default first.
    tailscaled --tun=userspace-networking --socket=/var/run/tailscale/tailscaled.sock &
    
    # Wait for daemon to start
    time=0
    until tailscale --socket=/var/run/tailscale/tailscaled.sock up --authkey=${TAILSCALE_AUTH_KEY} --hostname=discord-recorder --accept-routes --exit-node=${TAILSCALE_EXIT_NODE_IP} --exit-node-allow-lan-access; do
        echo "Waiting for Tailscale to come up..."
        sleep 1
        time=$((time+1))
        if [ $time -ge 30 ]; then
            echo "Timed out waiting for Tailscale."
            break
        fi
    done
    
    echo "Tailscale started!"
else
    echo "TAILSCALE_AUTH_KEY not provided, skipping Tailscale setup."
fi

# Start the application
echo "Starting Node.js application..."
node src/index.js &

# Wait for process
wait $!
