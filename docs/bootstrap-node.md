# Bootstrap Node Setup Guide

This guide describes how to set up a discv5 bootstrap node and circuit relay server for the SuccinctCoin P2P network.

## Architecture

```
┌─────────────┐     discv5 UDP:9000     ┌──────────────┐
│  Local Node │ ◄──────────────────────► │  VPS Bootstrap│
│  (Home/Office)│                        │  Node         │
└─────────────┘                        └──────────────┘
       │                                       │
       │  TCP relay connection                 │
       ▼                                       ▼
┌─────────────┐                        ┌──────────────┐
│  Other Node │ ◄──────────────────────│  VPS Bootstrap│
│  (NAT)      │    circuit relay       │  Node         │
└─────────────┘                        └──────────────┘
```

## Prerequisites

- VPS with at least 1GB RAM (512MB may work but is tight)
- Node.js 18+ (LTS recommended)
- Firewall access to UDP port 9000 and TCP port 4001

## Step 1: Provision VPS

Recommended providers:
- **Hetzner**: ~€4.50/month, good European latency
- **DigitalOcean**: ~$6/month, reliable
- **Linode**: ~$5/month, good US/EU presence

Example Hetzner setup:
```bash
# Create server in Hetzner Console
# Choose: Ubuntu 22.04, CX11 (2 vCPU, 2GB RAM)
# Location: Choose closest to your target users
```

## Step 2: Configure Firewall

```bash
# SSH (required)
sudo ufw allow 22/tcp

# discv5 UDP bootstrap
sudo ufw allow 9000/udp

# Circuit relay TCP
sudo ufw allow 4001/tcp

# Enable firewall
sudo ufw enable
```

## Step 3: Install Node.js

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x
```

## Step 4: Create Bootstrap Node Script

Create a file called `bootstrap-node.js`:

```javascript
const { Discv5 } = require('@chainsafe/discv5')
const { SignableENR } = require('@chainsafe/enr')
const { createLibp2p } = require('libp2p')
const { tcp } = require('@libp2p/tcp')
const { noise } = require('@chainsafe/libp2p-noise')
const { relay } = require('@libp2p/circuit-relay-v2')
const crypto = require('crypto')

// Configuration
const UDP_PORT = 9000
const RELAY_PORT = 4001
const BOOTSTRAP_INTERVAL = 30000 // 30 seconds

async function main() {
  console.log('🚀 Starting SuccinctCoin bootstrap node...')

  // Generate a keypair for the bootstrap node
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  // Convert to raw bytes for libp2p
  const spki = crypto.createPublicKey(publicKey)
  const der = spki.export({ type: 'spki', format: 'der' })
  const rawPubKey = der.slice(30) // Skip SPKI header

  const { publicKeyFromRaw } = await import('@libp2p/crypto/keys')
  const { peerIdFromPublicKey } = await import('@libp2p/peer-id')

  const libp2pPubKey = publicKeyFromRaw(rawPubKey, 'secp256k1')
  const peerId = peerIdFromPublicKey(libp2pPubKey)

  console.log(`📍 Peer ID: ${peerId.toString()}`)

  // Create ENR
  const enr = SignableENR.createFromPeerId(peerId)
  enr.set('tcp', RELAY_PORT)
  enr.set('udp', UDP_PORT)

  console.log(`📡 ENR: ${enr.encodeBase64()}`)
  console.log('⚠️  IMPORTANT: Save this ENR and add it to src/config.js DISCV5_BOOTSTRAP_ENRs')

  // Create libp2p node
  const node = await createLibp2p({
    addresses: {
      listen: [
        `/ip4/0.0.0.0/tcp/${RELAY_PORT}`,
        `/ip4/0.0.0.0/udp/${UDP_PORT}/udp`,
      ],
    },
    transports: [tcp(), relay()],
    streamMuxers: [],
    connectionEncrypters: [noise()],
    peerDiscovery: [],
    services: {
      relay: relay({
        listen: true,
        maxConnections: 100,
        reserveEnabled: true,
        maxReservations: 50,
      }),
    },
  })

  await node.start()
  console.log('✅ Bootstrap node started successfully!')
  console.log(`🔌 Listening on TCP :${RELAY_PORT}`)
  console.log(`🔌 Listening on UDP :${UDP_PORT}`)
  console.log(`🌐 Relay endpoint: /ip4/<YOUR_VPS_IP>/tcp/${RELAY_PORT}/p2p/${peerId.toString()}`)

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bootstrap node...')
    await node.stop()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('Failed to start bootstrap node:', err)
  process.exit(1)
})
```

## Step 5: Install Dependencies

```bash
cd /path/to/bootstrap-node
npm init -y
npm install @chainsafe/discv5@^12.0.1 @chainsafe/enr@^6.0.1 libp2p@^3.3.2 @libp2p/tcp@^3.0.2 @chainsafe/libp2p-noise@^6.0.1 @libp2p/circuit-relay-v2@^4.2.5
```

## Step 6: Run the Bootstrap Node

```bash
# Run in background with PM2 (recommended)
npm install -g pm2
pm2 start bootstrap-node.js --name succinctcoin-bootstrap
pm2 save
pm2 startup  # Follow the output to start on boot

# Or run directly (for testing)
node bootstrap-node.js
```

## Step 7: Configure SuccinctCoin

Once the bootstrap node is running, you'll see output like:

```
📍 Peer ID: 16Uiu2HAm8tSAcS1NP94KxCeGhFhXJq3vZz5Qx8Rt7Yw2Bn4Kp9Ld
📡 ENR: enr:-MY4QDHyZxP8K7mF3jR2vL9wE5tA6bC1dX0yU8iO3gHfJKlMnOpQrStUvWxYz...
🌐 Relay endpoint: /ip4/203.0.113.5/tcp/4001/p2p/16Uiu2HAm8tSAcS1NP94KxCeGhFhXJq3vZz5Qx8Rt7Yw2Bn4Kp9Ld
```

Update `src/config.js`:

```javascript
const DISCV5_BOOTSTRAP_ENRS = [
  'enr:-MY4QDHyZxP8K7mF3jR2vL9wE5tA6bC1dX0yU8iO3gHfJKlMnOpQrStUvWxYz...',
]
const RELAY_ENDPOINTS = [
  '/ip4/203.0.113.5/tcp/4001/p2p/16Uiu2HAm8tSAcS1NP94KxCeGhFhXJq3vZz5Qx8Rt7Yw2Bn4Kp9Ld',
]
```

## Step 8: Verify Connection

Run your SuccinctCoin app and check the console logs:

```
[discv5] Starting peer discovery...
[discv5] Peer ID: 16Uiu2HA...
[discv5] ENR: enr:-MY4...
[discv5] Bootstrap ENRs: 1
[discv5] Relay endpoints: 1
>libp2p has started with discv5 discovery
[discv5] Relay enabled: 1 endpoint(s)
```

## Maintenance

### Check bootstrap node status

```bash
pm2 status succinctcoin-bootstrap
pm2 logs succinctcoin-bootstrap --lines 50
```

### Restart bootstrap node

```bash
pm2 restart succinctcoin-bootstrap
```

### Update bootstrap node

```bash
cd /path/to/bootstrap-node
npm install @chainsafe/discv5@latest @chainsafe/enr@latest libp2p@latest
pm2 restart succinctcoin-bootstrap
```

## Troubleshooting

### Bootstrap node not discoverable

1. Check firewall rules:
   ```bash
   sudo ufw status
   ```

2. Test UDP port from outside:
   ```bash
   nc -uvz <YOUR_VPS_IP> 9000
   ```

3. Check if discv5 is running:
   ```bash
   pm2 logs succinctcoin-bootstrap --lines 100 | grep discv5
   ```

### Relay connections failing

1. Check TCP port is accessible:
   ```bash
   nc -zv <YOUR_VPS_IP> 4001
   ```

2. Check relay service logs:
   ```bash
   pm2 logs succinctcoin-bootstrap --lines 100 | grep relay
   ```

3. Verify relay has enough reservations:
   - Check `maxReservations` in relay config (default: 50)
   - Increase if needed for your expected peer count

### High memory usage

- The bootstrap node typically uses 100-200MB with few peers
- Increase `maxConnections` and `maxReservations` only if needed
- Consider adding memory limits with PM2:
  ```bash
  pm2 set succinctcoin-bootstrap max_memory_restart 300M
  ```

## Security Considerations

1. **Rate limiting**: Consider adding rate limiting to prevent DoS attacks
2. **Authentication**: For production, consider adding authentication to bootstrap requests
3. **Monitoring**: Set up monitoring for uptime and resource usage
4. **Backups**: Regularly backup the bootstrap node's private key
5. **Updates**: Keep Node.js and dependencies updated for security patches

## Example Complete Setup Command

```bash
# One-liner to set up everything
sudo apt update && sudo apt install -y nodejs ufw && \
sudo ufw allow 22/tcp && sudo ufw allow 9000/udp && sudo ufw allow 4001/tcp && sudo ufw enable && \
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs && \
npm install -g pm2 && \
cd ~ && mkdir succinctcoin-bootstrap && cd succinctcoin-bootstrap && \
npm init -y && npm install @chainsafe/discv5@^12.0.1 @chainsafe/enr@^6.0.1 libp2p@^3.3.2 @libp2p/tcp@^3.0.2 @chainsafe/libp2p-noise@^6.0.1 @libp2p/circuit-relay-v2@^4.2.5 && \
# Create bootstrap-node.js (see Step 4 above) && \
pm2 start bootstrap-node.js --name succinctcoin-bootstrap && \
pm2 save && pm2 startup
```
