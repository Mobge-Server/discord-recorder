#!/bin/bash
set -e

# Create config directory if it doesn't exist
mkdir -p /config/wg_confs

# Write WG_CONF0 environment variable to wg0.conf file
if [ -n "$WG_CONF0" ]; then
    echo "$WG_CONF0" > /config/wg_confs/wg0.conf
    echo "WireGuard config written to /config/wg_confs/wg0.conf"
fi

# Execute the original command (usually /init)
exec "$@"