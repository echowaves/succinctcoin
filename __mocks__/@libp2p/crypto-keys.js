// Mock ESM-only libp2p modules for Jest tests
// These modules are not needed for unit tests - we just need the wallet to sign transactions

const mockPeerId = {
  toString: () => '12D3KooWMockPeerId',
  toCID: () => ({ toString: () => 'bafzatest' }),
}

module.exports.publicKeyFromRaw = jest.fn(() => ({
  type: 'secp256k1',
  raw: Buffer.from('mockPublicKey'),
}))

module.exports.peerIdFromPublicKey = jest.fn(() => mockPeerId)
