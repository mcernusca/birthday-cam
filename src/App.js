import React from 'react';
import './App.css';
import SimplePeer from "simple-peer";

import Room from "./room";

// var channel = client.channels.get('room');

// channel.subscribe(function(message) {
//   message.name // 'greeting'
//   message.data // 'Hello World!'
// });

function App() {

  // const client = React.useRef(null);
  // const channel = React.useRef(null);

  // const peer = React.useRef(null);

  // React.useEffect(() => {
  //   client.current = new window.Ably.Realtime("h6vEZA.9BEKAw:XGAq6Hym9lcxyxha");

  //   client.current.connection.on('connected', function () {
  //     console.info("***CONNECTED***");
  //   });

  //   client.current.connection.on('failed', function () {
  //     console.warn("***FAILED TO CONNECTED***");
  //   });

  //   channel.current = client.current.channels.get('room');
  //   channel.current.subscribe((message) => {
  //     console.log(">>>", message);
  //   })

  // }, [])

  // React.useEffect(() => {
  //   const gotMedia = (stream) => {
  //     console.log(stream);
  //   }

  //   navigator.getUserMedia({ video: true, audio: true }, gotMedia, () => { })

  //   peer.current = SimplePeer({
  //     initiator: window.location.hash === '#1',
  //     trickle: false
  //   });

  //   peer.current.on('error', err => console.log('error', err))

  //   peer.current.on('signal', data => {
  //     console.log('SIGNAL', JSON.stringify(data))
  //     document.querySelector('#outgoing').textContent = JSON.stringify(data)
  //   })

  //   document.querySelector('form').addEventListener('submit', ev => {
  //     ev.preventDefault()
  //     peer.current.signal(JSON.parse(document.querySelector('#incoming').value))
  //   })

  //   peer.current.on('connect', () => {
  //     console.log('CONNECT')
  //     peer.current.send('whatever' + Math.random())
  //   })

  //   peer.current.on('data', data => {
  //     console.log('data: ' + data)
  //   })

  // }, [])
  return (
    <div className="App">
      <Room />
      <form>
        <textarea id="incoming"></textarea>
        <button type="submit">submit</button>
      </form>
      <pre id="outgoing"></pre>
    </div>
  );
}

export default App;
