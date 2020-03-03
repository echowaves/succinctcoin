
// const redis = require('redis');
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const MulticastDNS = require('libp2p-mdns')
const DHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const Room = require('ipfs-pubsub-room')


async function hello() {

	const libp2p = await Libp2p.create({
		modules: {
			transport: [
				TCP,
				// new WS() // It can take instances too!
			],
			streamMuxer: [MPLEX],
			connEncryption: [SECIO],
			peerDiscovery: [MulticastDNS],
			// dht: DHT,
			pubsub: GossipSub
		}
	})

	await libp2p.peerInfo.multiaddrs.add('/ip4/127.0.0.1/tcp/0')

	await libp2p.start()

	// libp2p node is ready, so we can start using ipfs-pubsub-room
	const room = new Room(libp2p, 'room-name')

	room.on('peer joined', (peer) => {
		console.log('Peer joined the room', peer)
	})

	room.on('peer left', (peer) => {
		console.log('Peer left...', peer)
	})

	// now started to listen to room
	room.on('subscribed', () => {
		console.log('Now connected!')
	})


	room.on('message', (message) => {
		console.log('received:', message)
		console.log('message.data:', message.data.toString('utf8'))
	})

	for(let i = 0; i < 100; i++) {
		await room.broadcast(`hello world ${i}`)
	 	await new Promise(resolve => setTimeout(resolve, 2000));
	}
};

hello()
