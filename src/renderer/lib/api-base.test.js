// API_BASE_FORMAT: pins the API base URL format at the helper surface.
global.window = { electronAPI: { getApiPort: () => 4242 } }

import getApiBase from './api-base'

describe('getApiBase (CAP-10 renderer API base)', () => {
  it('API_BASE_FORMAT: builds http://localhost:<port> from the bridge port', () => {
    expect(getApiBase()).toBe('http://localhost:4242')
  })
})
