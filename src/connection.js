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
      trickle: true
    })
    this._p2pConnection.on('signal', this._onSignal.bind(this))
    this._p2pConnection.on('error', this._onError.bind(this))
    this._p2pConnection.on('connect', this._onConnect.bind(this))
    this._p2pConnection.on('close', this._onClose.bind(this))
    this._p2pConnection.on('data', this._onData.bind(this))
    this._p2pConnection.on('stream', this._onStream.bind(this))

    this.onConnectionChange = noop
    this.onData = noop
  }

  handleSignal(signal) {
    console.log('<<<p2p: handle signal', signal)
    this._p2pConnection.signal(signal)
  }

  addStream(stream) {
    console.log('>>>p2p: set stream', stream)
    this._p2pConnection.addStream(stream)
  }

  send(msg) {
    console.log('>>>p2p: send', msg)
    this._p2pConnection.send(msg)
  }

  destroy() {
    this._p2pConnection.destroy()
  }

  _onSignal(signal) {
    console.log('onSignal', this.remoteClientId, signal)
    this._channel.publish(`signal/${this.remoteClientId}`, {
      user: this._clientId,
      signal: signal
    })
  }

  _onConnect() {
    this.isConnected = true
    console.info('>>> connected to ' + this.remoteClientId)
    this.onConnectionChange(this.isConnected)
  }

  _onClose() {
    console.info(`<<<p2p: connection to ${this.remoteClientId} closed`)
    this.isConnected = false
    this.onConnectionChange(this.isConnected)
  }

  _onData(data) {
    // TODO
    // receiveMessage(this.remoteClientId, data)
    console.info('<<<p2p: data: ' + data)
    this.onData(data)
  }

  _onStream(stream) {
    console.info('<<<p2p: stream: ' + stream)
    // got remote video stream, now let's show it in a video tag
    var video = document.querySelector('video.guest')
    if (!video) {
      console.warn('Missing video.guest element')
      return
    }

    if ('srcObject' in video) {
      video.srcObject = stream
    } else {
      video.src = window.URL.createObjectURL(stream) // for older browsers
    }

    video.play()
  }

  _onError(error) {
    console.warn(`p2p: an error occurred ${error.toString()}`)
  }
}
