import React from 'react'

import Connection from './connection'
import cn from 'classname'
import queryString from 'query-string'
import styled from 'styled-components'
import {useKeyState} from 'use-key-state'

import {captureImageFromVideo} from './canvasObjectFit'
import Flash from './flash'
import Indicator from './indicator'

import frames from './frames'
const frameDim = 612
const apiKey = 'h6vEZA.9BEKAw:XGAq6Hym9lcxyxha'
const clientId =
  'client-' +
  Math.random()
    .toString(36)
    .substr(2, 16)

const parsedSearchParams = queryString.parse(window.location.search)
const isHost = 'isHector' in parsedSearchParams

// function useStepTimer({total, step, delay}) {

// }

const useEventCallback = function(fn) {
  let ref = React.useRef()
  React.useLayoutEffect(() => {
    ref.current = fn
  })
  return React.useMemo(() => (...args) => (0, ref.current)(...args), [])
}

export default function Room({stream}) {
  const [members, setMembers] = React.useState([])
  const realtime = React.useRef(null)
  const room = React.useRef(null)
  const connection = React.useRef(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [flashStep, setFlashStep] = React.useState(0)
  const photos = React.useRef([null, null, null, null])
  const frame = frames[step]
  const {rightKey} = useKeyState({rightKey: 'right'})

  const imageFrameRef = React.useRef(null)
  const firstVideoRef = React.useRef(null)
  const secondVideoRef = React.useRef(null)
  const downloadLinkRef = React.useRef(null)
  const downloadImageRef = React.useRef(null)

  const takePhoto = React.useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.height = frameDim
    canvas.width = frameDim

    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.translate(frame.first.width, 0)
    ctx.scale(-1, 1)
    captureImageFromVideo(
      ctx,
      firstVideoRef.current,
      -1 * frame.first.left,
      frame.first.top,
      frame.first.width,
      frame.first.height,
      {
        objectFit: 'cover'
      }
    )
    ctx.restore()
    ctx.save()
    ctx.translate(frame.second.width, 0)
    ctx.scale(-1, 1)
    captureImageFromVideo(
      ctx,
      secondVideoRef.current,
      -1 * frame.second.left,
      frame.second.top,
      frame.second.width,
      frame.second.height,
      {
        objectFit: 'cover'
      }
    )
    ctx.restore()
    ctx.drawImage(imageFrameRef.current, 0, 0, frameDim, frameDim)

    const img = photos.current[step]
    img.src = canvas.toDataURL('image/jpeg', 1)
  }, [frame, step])

  const goNext = React.useCallback(() => {
    console.log('goNext', step)
    takePhoto()
    delayedSetStep(prev => (prev <= 3 ? prev + 1 : prev))
  }, [step, takePhoto])

  const handleData = useEventCallback(data => {
    if (String(data) === 'next') {
      takePhoto()
      delayedSetStep(prev => (prev <= 3 ? prev + 1 : prev))
    }
  })

  // Delay to after the flash
  const delayedSetStep = cb => {
    setTimeout(() => setFlashStep(cb), 200)
    setTimeout(() => setStep(cb), 250)
  }

  React.useEffect(() => {
    if (isHost && rightKey.down) {
      connection.current.send('next')
      goNext()
    }
  }, [rightKey, goNext])

  React.useEffect(() => {
    if (stream) {
      var video = document.querySelector('video.host')
      if (video) {
        if ('srcObject' in video) {
          video.srcObject = stream
        } else {
          video.src = window.URL.createObjectURL(stream) // for older browsers
        }
        video.play()
      }
    } else {
      console.warn('Missing video.host element')
    }
  }, [stream])

  const pickNextMember = React.useCallback(() => {
    console.log('pickNextMember', members)

    for (var i = 0; i < members.length; i++) {
      var m = members[i]
      if (m.clientId !== clientId) {
        return m.clientId
      }
    }
    return null
  }, [members])

  React.useEffect(() => {
    realtime.current = new window.Ably.Realtime({
      key: apiKey,
      clientId: clientId,
      closeOnUnload: true
    })
    room.current = realtime.current.channels.get('room')
    room.current.presence.subscribe('enter', () => {
      room.current.presence.get((err, members) => {
        if (!err) {
          setMembers(members.sort((a, b) => a.timestamp - b.timestamp))
        }
      })
    })
    room.current.presence.subscribe('leave', member => {
      console.info('<<<ws: left:', member)
      if (
        connection.current &&
        member.clientId === connection.current.remoteClientId
      ) {
        connection.current.destroy()
        connection.current = null
      }
      room.current.presence.get((err, members) => {
        if (!err) {
          setMembers(members)
        }
      })
    })

    room.current.presence.enter()

    room.current.subscribe(`signal/${clientId}`, msg => {
      if (msg && msg.data && msg.data.signal) {
        if (isHost) {
          console.info('<<<ws: got answer from pick:', msg)
          connection.current.handleSignal(msg.data.signal)
        } else {
          console.info('<<<ws: was picked:', msg)
          if (!connection.current) {
            connection.current = new Connection(
              clientId,
              msg.data.user,
              room.current,
              false
            )
            connection.current.onConnectionChange = setIsConnected
            connection.current.onData = handleData
          }
          connection.current.handleSignal(msg.data.signal)
        }
      }
    })

    if (isHost) {
      console.info('Host ready to pick...')
    } else {
      console.info('Waiting to be picked...')
    }

    return () => {
      room.current.presence.leave()
    }
  }, [])

  React.useEffect(() => {
    if (isHost) {
      if (connection.current === null || !connection.current.isConnected) {
        const remoteClientId = pickNextMember()
        if (remoteClientId) {
          console.log('Picked', remoteClientId, 'to be next!')
          connection.current = new Connection(
            clientId,
            remoteClientId,
            room.current,
            true
          )
          connection.current.onConnectionChange = setIsConnected
        } else {
          console.info('Nobody to pick from...')
        }
      }
    }
  }, [members, pickNextMember])

  React.useEffect(() => {
    if (step === 4 && connection.current) {
      connection.current.destroy()
      connection.current = null
    }
  }, [step])

  React.useEffect(() => {
    if (isConnected) {
      if (stream && connection.current) {
        console.log('~~~setting stream!')
        connection.current.addStream(stream)
      } else {
        console.log('~~~need a stream or a connection!')
      }
    }
  }, [isConnected, stream])

  const list = []
  for (var i = 0; i < members.length; i++) {
    var m = members[i]
    if (m.clientId !== clientId) {
      list.push(
        <tr key={m.clientId}>
          <td>{m.clientId}</td>
        </tr>
      )
    }
  }

  const downloadPhoto = () => {
    const canvas = document.getElementById('canvas')

    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'lightgreen'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.drawImage(photos.current[0], 0, 0)
    ctx.drawImage(photos.current[1], frameDim, 0)
    ctx.drawImage(photos.current[2], 0, frameDim)
    ctx.drawImage(photos.current[3], frameDim, frameDim)

    const image = canvas.toDataURL('image/jpeg')
    downloadImageRef.current.src = image
    downloadLinkRef.current.href = image
  }

  return (
    <>
      <div className="room-wrapper">
        <div className="debug">
          <table>
            <tbody>
              <tr>
                <td>Host: {isHost ? 'yes' : 'no'}</td>
              </tr>
              <tr>
                <td>
                  Online ({members.length === 0 ? 0 : members.length - 1})
                </td>
              </tr>
              {list}
            </tbody>
          </table>
        </div>
        <Indicator isConnected={isConnected} />

        <ImageFrame dim={frameDim}>
          {step <= 3 && (
            <>
              <ImageFrameBackground
                src={frame.background}
                alt=""
                ref={imageFrameRef}
              />
              <video
                className={cn('first', isHost ? 'guest' : 'host', {
                  self: !isHost
                })}
                ref={firstVideoRef}
                style={frame.first}
              />
              <video
                className={cn('second', isHost ? 'host' : 'guest', {
                  self: isHost
                })}
                ref={secondVideoRef}
                style={frame.second}
              />
            </>
          )}

          {step === 4 && (
            <>
              <img ref={downloadImageRef} id="download-image" alt="" />
              <a
                download="birthday-cam-hector.jpg"
                className="download-btn"
                href="#bla-photo"
                onClick={downloadPhoto}
                ref={downloadLinkRef}
              >
                &#8595; Download
              </a>
            </>
          )}
        </ImageFrame>
      </div>

      <Flash key={flashStep} />

      <div style={{display: 'block'}}>
        <img
          ref={ref => {
            photos.current[0] = ref
          }}
          alt=""
        />
        <img
          ref={ref => {
            photos.current[1] = ref
          }}
          alt=""
        />
        <img
          ref={ref => {
            photos.current[2] = ref
          }}
          alt=""
        />
        <img
          ref={ref => {
            photos.current[3] = ref
          }}
          alt=""
        />
        <canvas id="canvas" width={frameDim * 2} height={frameDim * 2} />
      </div>
    </>
  )
}

const ImageFrame = styled.div`
  position: relative;

  width: ${props => props.dim}px;
  height: ${props => props.dim}px;
  background: lightgreen;
  margin: 0 auto;
  border-radius: 9px;
  overflow: hidden;

  box-shadow: 0px 8px 10px rgba(0, 0, 0, 0.09), 0px 6px 30px rgba(0, 0, 0, 0.06),
    0px 16px 24px rgba(0, 0, 0, 0.07);

  & > video {
    position: absolute;
    transform: scaleX(-1);
    object-fit: cover;
  }
`

const ImageFrameBackground = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
`
