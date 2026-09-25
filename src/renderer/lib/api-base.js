// CAP-10: the single URL-construction site for renderer fetches. The port is
// read from the preload bridge at call time (never at module scope) so
// renderer modules stay importable outside Electron.
const getApiBase = () => `http://localhost:${window.electronAPI.getApiPort()}`

export default getApiBase
