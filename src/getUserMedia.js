import React from 'react'

export default function GetUserMedia({children}) {
  const [stream, setStream] = React.useState(null)
  const [isRequesting, setIsRequesting] = React.useState(false)

  function getStream() {
    setIsRequesting(true)
    window.navigator.mediaDevices
      .getUserMedia({audio: false, video: true})
      .then(stream => {
        setStream(stream)
      })
  }

  if (!stream) {
    return (
      <div>
        <button onClick={getStream} disabled={isRequesting}>
          Start
        </button>
      </div>
    )
  } else {
    return React.cloneElement(children, {stream})
  }
}
