const Blockchain = require('../blockchain')

const blockchain = new Blockchain()

blockchain.addBlock({ data: 'initial' })

console.log('first block', blockchain.chain[blockchain.chain.length - 1]) // eslint-disable-line no-console

let prevTimestamp,
  nextTimestamp,
  nextBlock,
  timeDiff,
  average

const times = []

for (let i = 0; i < 10000; i += 1) {
  prevTimestamp = blockchain.chain[blockchain.chain.length - 1].timestamp

  blockchain.addBlock({ data: `block ${i}` })
  nextBlock = blockchain.chain[blockchain.chain.length - 1]

  nextTimestamp = nextBlock.timestamp
  timeDiff = nextTimestamp - prevTimestamp
  times.push(timeDiff)

  average = times.reduce((total, num) => (total + num)) / times.length

  console.log(`Time to mine block: ${timeDiff}ms. Difficulty: ${nextBlock.difficulty}. Average time: ${average}ms`) // eslint-disable-line no-console
}
