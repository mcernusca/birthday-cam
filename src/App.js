import React from 'react'
import './App.css'

import GetUserMedia from './getUserMedia'
import ConnectedRoom from './connectedRoom'

import frames from './frames'

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
    </div>
  )
}

export default App
