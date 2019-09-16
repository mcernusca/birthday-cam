import React from 'react'

import cn from 'classname'
import styled from 'styled-components'
import {useKeyState} from 'use-key-state'

import useEventCallback from './hooks/useEventCallback'
import {captureImageFromVideo} from './utils/canvasObjectFit'

import Flash from './components/flash'
import Indicator from './components/indicator'
import Timer from './components/timer'

import FRAMES from './frames'
const FRAME_DIM = 612
const STEPS = 4

export default function Room({
  step,
  setStep,
  isHost,
  connection,
  handleConnectionData,
  isConnected,
  stream,
  signalGuestToAdvance,
  signalGuestWeAreDone,
  resetHost,
  totalMembersWaiting
}) {
  const [flashStep, setFlashStep] = React.useState(0)

  const photos = React.useRef([null, null, null, null])
  const frame = FRAMES[step]
  const {rightKey} = useKeyState({rightKey: 'right'})

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
    [takePhoto, setStep]
  )

  // Take photo
  const onTimerComplete = React.useCallback(() => {
    if (isHost) {
      const nextStep = step + 1
      signalGuestToAdvance(nextStep)
      goTo(nextStep)
    }
  }, [goTo, step, isHost, signalGuestToAdvance])

  // Skip past the timer with right key
  React.useEffect(() => {
    if (rightKey.down) {
      onTimerComplete()
    }
  }, [rightKey, onTimerComplete])

  // Hook up stream to self view
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

  React.useEffect(() => {
    if (isHost && step === 4) {
      signalGuestWeAreDone()
    }
  }, [isHost, step, signalGuestWeAreDone])

  const handleData = useEventCallback((key, value) => {
    if (key === 'next') {
      goTo(parseInt(value))
    }
  })

  React.useEffect(() => {
    if (connection) {
      connection.onData = (key, value) => {
        handleData(key, value)
        // Delegate upstream
        handleConnectionData(key, value)
      }
    }
  }, [connection, handleConnectionData, handleData])

  return (
    <>
      <div className="room-wrapper">
        {!isDownloadStep && (
          <>
            <FrameCounter>{step + 1}/4</FrameCounter>
            <Indicator isConnected={isConnected} />
          </>
        )}

        {isDownloadStep && isHost && (
          <button className="goAgainButton" onClick={resetHost}>
            &#8635; Go again? ({totalMembersWaiting} waiting)
          </button>
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
  font-size: 18px;
  padding: 5px 10px;
  font-weight: 800;
  color: #6955b8;
`
