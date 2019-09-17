import React from 'react'
import './App.css'

import GetUserMedia from './getUserMedia'
import ConnectedRoom from './connectedRoom'

import frames from './frames'

import someoneJoinedWav from './sounds/music_marimba_chord.wav'
import helloWav from './sounds/hello.wav'
import flashWav from './sounds/flash.wav'
import finishedWav from './sounds/finished.wav'

function App() {
  React.useEffect(() => {
    frames.forEach((frame, index) => {
      const img = new Image()
      img.src = frame.background
      img.onload = () => {
        console.log('Preloaded frame background', index)
      }
    })
  }, [])

  return (
    <div className="App">
      <GetUserMedia>
        <ConnectedRoom />
      </GetUserMedia>
      <div style={{display: 'none'}}>
        <audio src={helloWav} controls preload="auto">
          <p>This web browser does not support wav format</p>
        </audio>
        <audio src={someoneJoinedWav} controls preload="auto">
          <p>This web browser does not support wav format</p>
        </audio>
        <audio src={flashWav} controls preload="auto">
          <p>This web browser does not support wav format</p>
        </audio>
        <audio src={finishedWav} controls preload="auto">
          <p>This web browser does not support wav format</p>
        </audio>
      </div>
    </div>
  )
}

export default App
