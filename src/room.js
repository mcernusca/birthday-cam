import React from 'react'

import Connection from './connection'
import cn from 'classname'
import queryString from 'query-string'
import styled from 'styled-components'
import {useKeyState} from 'use-key-state'

import {captureImageFromVideo} from './utils/canvasObjectFit'
import useEventCallback from './hooks/useEventCallback'
import generateClientId from './utils/clientId'

import Flash from './components/flash'
import Indicator from './components/indicator'
import Timer from './components/timer'

import FRAMES from './frames'
const FRAME_DIM = 612
const ABLY_API_KEY = 'h6vEZA.9BEKAw:XGAq6Hym9lcxyxha'
const CLIENT_ID = generateClientId()
const IS_HOST = 'isHector' in queryString.parse(window.location.search)
const STEPS = 4

export default function Room({stream}) {
  const [members, setMembers] = React.useState([])
  const [showDebug, setShowDebug] = React.useState(false)
  const realtimeRef = React.useRef(null)
  const roomRef = React.useRef(null)
  const connection = React.useRef(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [flashStep, setFlashStep] = React.useState(0)
  const photos = React.useRef([null, null, null, null])
  const frame = FRAMES[step]
  const {rightKey, slashKey} = useKeyState({rightKey: 'right', slashKey: '/'})
  const imageFrameRef = React.useRef(null)
  const firstVideoRef = React.useRef(null)
  const secondVideoRef = React.useRef(null)
  const downloadLinkRef = React.useRef(null)
  const downloadImageRef = React.useRef(null)

  const takePhoto = React.useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.height = FRAME_DIM
    canvas.width = FRAME_DIM

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'lightgreen'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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
    ctx.drawImage(imageFrameRef.current, 0, 0, FRAME_DIM, FRAME_DIM)

    const img = photos.current[step]
    img.src = canvas.toDataURL('image/jpeg', 1)
  }, [frame, step])

  const goTo = React.useCallback(
    nextStep => {
      if (nextStep <= STEPS) {
        takePhoto()
        setTimeout(() => setFlashStep(nextStep), 200)
        setTimeout(() => setStep(nextStep), 250)
      }
    },
    [takePhoto]
  )

  const handleData = useEventCallback((key, value) => {
    if (key === 'next') {
      goTo(parseInt(value))
    } else if (key === 'goodbye') {
      // Disconnect
      console.log('~~~was requested to leave!')
      roomRef.current.presence.leave(err => {
        console.log('~~~left presence set', err)
      })
    }
  })

  const onTimerComplete = React.useCallback(() => {
    if (IS_HOST) {
      const nextStep = step + 1
      if (connection.current) {
        connection.current.send('next', nextStep)
      }
      goTo(nextStep)
    }
  }, [goTo, step])

  React.useEffect(() => {
    if (rightKey.down) {
      onTimerComplete()
    }
  }, [rightKey, onTimerComplete])

  React.useEffect(() => {
    if (slashKey.down) {
      setShowDebug(prev => !prev)
    }
  }, [slashKey])

  React.useEffect(() => {
    if (stream) {
      var video = document.querySelector('video.host')
      if (video) {
        if ('srcObject' in video) {
          video.srcObject = stream
        } else {
          video.src = window.URL.createObjectURL(stream)
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
      if (m.clientId !== CLIENT_ID) {
        return m.clientId
      }
    }
    return null
  }, [members])

  React.useEffect(() => {
    realtimeRef.current = new window.Ably.Realtime({
      key: ABLY_API_KEY,
      clientId: CLIENT_ID,
      closeOnUnload: true
    })
    roomRef.current = realtimeRef.current.channels.get('room')
    roomRef.current.presence.subscribe('enter', () => {
      roomRef.current.presence.get((err, members) => {
        if (!err) {
          setMembers(members.sort((a, b) => a.timestamp - b.timestamp))
        }
      })
    })
    roomRef.current.presence.subscribe('leave', member => {
      console.info('<<<ws: left:', member)
      if (
        connection.current &&
        member.clientId === connection.current.remoteClientId
      ) {
        connection.current.destroy()
        connection.current = null
      }
      roomRef.current.presence.get((err, members) => {
        if (!err) {
          setMembers(members)
        }
      })
    })

    roomRef.current.presence.enter(IS_HOST ? 'host' : 'guest')

    roomRef.current.subscribe(`signal/${CLIENT_ID}`, msg => {
      if (msg && msg.data && msg.data.signal) {
        if (IS_HOST) {
          console.info('<<<ws: got answer from pick:', msg)
          connection.current.handleSignal(msg.data.signal)
        } else {
          console.info('<<<ws: was picked:', msg)
          if (!connection.current) {
            connection.current = new Connection(
              CLIENT_ID,
              msg.data.user,
              roomRef.current,
              false
            )
            connection.current.onConnectionChange = setIsConnected
            connection.current.onData = handleData
          }
          connection.current.handleSignal(msg.data.signal)
        }
      }
    })

    if (IS_HOST) {
      console.info('Host ready to pick...')
    } else {
      console.info('Waiting to be picked...')
    }

    return () => {
      roomRef.current.presence.leave()
    }
  }, [handleData])

  React.useEffect(() => {
    if (IS_HOST) {
      if (connection.current === null || !connection.current.isConnected) {
        const remoteClientId = pickNextMember()
        if (remoteClientId) {
          console.log('Picked', remoteClientId, 'to be next!')
          connection.current = new Connection(
            CLIENT_ID,
            remoteClientId,
            roomRef.current,
            true
          )
          connection.current.onConnectionChange = setIsConnected
        } else {
          console.info('Nobody to pick from...')
        }
      }
    }
  }, [members, pickNextMember])

  // Signal to other participant to disconnect
  React.useEffect(() => {
    if (IS_HOST && step === 4 && connection.current) {
      connection.current.send('goodbye', 1)
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
    if (m.clientId !== CLIENT_ID) {
      list.push(
        <tr key={m.clientId}>
          <td>
            {m.clientId} ({m.data})
          </td>
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
    ctx.drawImage(photos.current[1], FRAME_DIM, 0)
    ctx.drawImage(photos.current[2], 0, FRAME_DIM)
    ctx.drawImage(photos.current[3], FRAME_DIM, FRAME_DIM)

    const image = canvas.toDataURL('image/jpeg')
    downloadImageRef.current.src = image
    downloadLinkRef.current.href = image
  }

  const isDownloadStep = step === STEPS

  React.useLayoutEffect(() => {
    if (isDownloadStep) {
      downloadPhoto()
    }
  }, [isDownloadStep])

  return (
    <>
      <div className="room-wrapper">
        {showDebug && (
          <div className="debug">
            <table>
              <tbody>
                <tr>
                  <td>Host: {IS_HOST ? 'yes' : 'no'}</td>
                </tr>
                <tr>
                  <td>Connected: {isConnected ? 'yes' : 'no'}</td>
                </tr>
                <tr>
                  <td>
                    Online ({members.length === 0 ? 0 : members.length - 1})
                  </td>
                </tr>
                <tr>
                  <td>Step: {step}</td>
                </tr>
                {list}
              </tbody>
            </table>
          </div>
        )}

        {!isDownloadStep && (
          <>
            <FrameCounter>{step + 1}/4</FrameCounter>
            <Indicator isConnected={isConnected} />
          </>
        )}

        <ImageFrame dim={FRAME_DIM}>
          {!isDownloadStep && (
            <>
              <Timer key={step} onCountdownComplete={onTimerComplete} />
              <ImageFrameBackground
                src={frame.background}
                alt=""
                ref={imageFrameRef}
              />
              <video
                className={cn('first', IS_HOST ? 'guest' : 'host', {
                  self: !IS_HOST
                })}
                ref={firstVideoRef}
                style={frame.first}
              />
              <video
                className={cn('second', IS_HOST ? 'host' : 'guest', {
                  self: IS_HOST
                })}
                ref={secondVideoRef}
                style={frame.second}
              />
            </>
          )}

          {isDownloadStep && (
            <>
              <img ref={downloadImageRef} id="download-image" alt="" />
              <a
                download="birthday-cam-hector.jpg"
                className="download-btn"
                href="#download-photo"
                ref={downloadLinkRef}
              >
                &#8595; Download
              </a>
            </>
          )}
        </ImageFrame>
      </div>

      <Flash key={flashStep} shouldFire={step > 0} />

      <div style={{display: 'none'}}>
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
        <canvas id="canvas" width={FRAME_DIM * 2} height={FRAME_DIM * 2} />
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

const FrameCounter = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  background: white;
  border-radius: 40px;
  font-size: 22px;
  padding: 9px 20px;
  font-weight: 800;
  color: #6955b8;
`
