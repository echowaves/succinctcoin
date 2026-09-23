// AD-5/AD-13: the root node is bootstrap-only. It seeds the local chain only
// while the local chain is genesis-only (`chain.length === 1`); afterward the
// root's chain is ignored. Pool ingestion is always the additive uuid merge
// (empty local map = adoption) — never a full replace. Fetch functions are
// injected so this module stays Electron-free and unit-testable.
const syncWithRootState = async ({ blockchain, transactionPool, fetchRootChain, fetchRootPool }) => {
  const [rootChain, rootPoolMap] = await Promise.all([fetchRootChain(), fetchRootPool()])

  if (blockchain.chain.length === 1) {
    await blockchain.replaceChain(rootChain)
  }

  transactionPool.syncFromRemote({ remoteMap: rootPoolMap })
}

export default syncWithRootState
