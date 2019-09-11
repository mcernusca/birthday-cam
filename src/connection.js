import SimplePeer from "simple-peer";

const noop = () => { };

export default class Connection {
    constructor(clientId, remoteClientId, channel, initiator, onConnectionChange) {
        console.info(`>>> Connection: Opening to ${remoteClientId}`);
        this._clientId = clientId;
        this.remoteClientId = remoteClientId;
        this.isConnected = false;
        this._channel = channel;
        this._p2pConnection = new SimplePeer({
            initiator: initiator,
            trickle: false,
        });
        this._p2pConnection.on('signal', this._onSignal.bind(this));
        this._p2pConnection.on('error', this._onError.bind(this));
        this._p2pConnection.on('connect', this._onConnect.bind(this));
        this._p2pConnection.on('close', this._onClose.bind(this));
        this._p2pConnection.on('data', this._onData.bind(this));
        this._onConnectionChange = onConnectionChange || noop;
    }

    handleSignal(signal) {
        console.log('>>> handle signal', signal);
        this._p2pConnection.signal(signal);
    }

    send(msg) {
        console.log(">>> send", msg);
        this._p2pConnection.send(msg);
    }

    _onSignal(signal) {
        console.log('>>> onSignal', signal);
        this._channel.publish(`signal/${this.remoteClientId}`, {
            user: this._clientId,
            signal: signal,
        });
    }

    _onConnect() {
        this.isConnected = true;
        console.info('>>> connected to ' + this.remoteClientId);
        this._onConnectionChange(this.isConnected);
    }

    _onClose() {
        console.info(`>>> connection to ${this.remoteClientId} closed`);
        this.isConnected = false;
        this._onConnectionChange(this.isConnected);
    }

    _onData(data) {
        // TODO
        // receiveMessage(this.remoteClientId, data)
        console.info('>>> data: ' + data)
    }

    _onError(error) {
        console.info(`an error occurred ${error.toString()}`);
    }
}
