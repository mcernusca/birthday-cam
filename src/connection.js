import SimplePeer from 'simple-peer'

const noop = () => {}

export default class Connection {
  constructor(clientId, remoteClientId, channel, initiator) {
    console.info(`>>> Connection: Opening to ${remoteClientId}`)
    this._clientId = clientId
    this.remoteClientId = remoteClientId
    this.isConnected = false
    this._channel = channel
    this._p2pConnection = new SimplePeer({
      initiator: initiator,
      trickle: false
    })
    this._p2pConnection.on('signal', this._onSignal.bind(this))
    this._p2pConnection.on('error', this._onError.bind(this))
    this._p2pConnection.on('connect', this._onConnect.bind(this))
    this._p2pConnection.on('close', this._onClose.bind(this))
    this._p2pConnection.on('data', this._onData.bind(this))
    this._p2pConnection.on('stream', this._onStream.bind(this))

    this.onGuestStreamChange = noop
    this.onConnectionChange = noop
    this.onData = noop
  }

  handleSignal(signal) {
    console.info('<<<p2p: handle signal', signal)
    this._p2pConnection.signal(signal)
  }

  addStream(stream) {
    console.info('>>>p2p: set stream', stream)
    this._p2pConnection.addStream(stream)
  }

  send(key, value) {
    const msg = `${key}:${value}`
    console.info('>>>p2p: send', msg)
    if (this._p2pConnection) {
      this._p2pConnection.send(msg)
    } else {
      console.warn('No active connection - dropped message', msg)
    }
  }

  destroy() {
    console.info('>>>p2p: destroying connection')
    this._p2pConnection.destroy()
  }

  _onSignal(signal) {
    console.info('<<<p2p: onSignal', this.remoteClientId, signal)
    this._channel.publish(`signal/${this.remoteClientId}`, {
      user: this._clientId,
      signal: signal
    })
  }

  _onConnect() {
    this.isConnected = true
    console.info('<<<p2p: connected to ' + this.remoteClientId)
    this.onConnectionChange(this.isConnected)
  }

  _onClose() {
    console.info(`<<<p2p: connection to ${this.remoteClientId} closed`)
    this.isConnected = false
    this.onConnectionChange(this.isConnected)
  }

  _onData(data) {
    console.info('<<<p2p: data: ' + data)
    const dataParts = String(data).split(':')
    if (dataParts.length === 2) {
      this.onData(dataParts[0], dataParts[1])
    } else {
      console.warn('~~~p2p: Unexpected data format:', data)
    }
  }

  _onStream(stream) {
    console.info('<<<p2p: got stream: ' + stream)
    this.onGuestStreamChange(stream)
  }

  _onError(error) {
    console.warn(`~~~p2p: an error occurred ${error.toString()}`)
  }
}
