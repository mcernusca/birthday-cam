import React from 'react'
import './App.css'

import GetUserMedia from './getUserMedia'
import Room from './room'

function App() {
  return (
    <div className="App">
      <GetUserMedia>
        <Room />
      </GetUserMedia>
    </div>
  )
}

export default App
