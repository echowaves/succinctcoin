import React, { useState, useEffect, useCallback } from 'react'
import { Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import globalConfig from '../../config'

import Block from './Block'

function Blocks() {
  const [blocks, setBlocks] = useState([])
  const [blocksLength, setBlocksLength] = useState(0)

  const fetchPaginatedBlocks = useCallback(id => {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/blocks/${id}`)
      .then(response => response.json())
      .then(json => setBlocks(json))
  }, [])

  useEffect(() => {
    fetch(`${globalConfig.ROOT_NODE_ADDRESS}/api/blocks/length`)
      .then(response => response.json())
      .then(json => {
        console.log(`retrieved json: ${JSON.stringify(json)}`) // eslint-disable-line no-console
        setBlocksLength(json)
        fetchPaginatedBlocks(1)
      })
  }, [fetchPaginatedBlocks])

  const totalPages = Math.ceil(blocksLength / 5)

  return (
    <div>
      <div><Link to="/">Home</Link></div>
      <h3>Blocks</h3>
      <div>
        {[...Array(totalPages).keys()].map(key => {
          const pageId = key + 1
          return (
            <span
              role="button"
              tabIndex={0}
              key={key}
              onClick={() => {
                fetchPaginatedBlocks(pageId)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fetchPaginatedBlocks(pageId)
                }
              }}>
              <Button bsSize="small" bsStyle="danger">
                {pageId}
              </Button>{' '}
            </span>
          )
        })}
      </div>
      {blocks.map(block => (
        <Block key={block.hash} block={block} />
      ))}
    </div>
  )
}

export default Blocks
