import React from 'react'
import styled from 'styled-components'

import Connection from './connection'
import queryString from 'query-string'
import {useKeyState} from 'use-key-state'

import useEventCallback from './hooks/useEventCallback'
import generateClientId from './utils/clientId'

import Room from './room'

const ABLY_API_KEY = 'h6vEZA.9BEKAw:XGAq6Hym9lcxyxha'
const CLIENT_ID = generateClientId()
const IS_HOST = 'isHector' in queryString.parse(window.location.search)
const STEPS = 4

// We manage connection at this layer and render a loading screen until connection
// is ready

export default function ConnectedRoom({stream}) {
  const [step, setStep] = React.useState(0)
  const [members, setMembers] = React.useState([])
  const [showDebug, setShowDebug] = React.useState(false)
  const realtimeRef = React.useRef(null)
  const roomRef = React.useRef(null)
  const connection = React.useRef(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const {slashKey} = useKeyState({slashKey: '/'})
  const isDownloadStep = step === STEPS

  React.useEffect(() => {
    if (slashKey.down) {
      setShowDebug(prev => !prev)
    }
  }, [slashKey])

  const handleData = useEventCallback((key, value) => {
    if (key === 'goodbye') {
      // Disconnect
      console.log('~~~was requested to leave!', value)
      roomRef.current.presence.leave(err => {
        console.log('~~~left presence set', err)
      })
      if (connection.current) {
        connection.current.destroy()
        connection.current = null
      }
    }
  })

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

  const findHost = () => {
    for (var i = 0; i < members.length; i++) {
      var m = members[i]
      if (m.data === 'host') {
        return true
      }
    }
    return false
  }

  const hostIsOnline = findHost()

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
            // Handled in room and delegated back up because it needed
            // to tap into this event..
            // connection.current.onData = handleData
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

  const hostPickNewMember = React.useCallback(() => {
    // Connect to next member
    if (IS_HOST) {
      if (connection.current === null || !connection.current.isConnected) {
        const remoteClientId = pickNextMember()
        if (remoteClientId) {
          console.log('Picked', remoteClientId, 'to be next!')
          console.log('Resetting step...')
          setStep(0)
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
  }, [pickNextMember])

  React.useEffect(() => {
    // When member list changes pick a new connection
    if (!isDownloadStep) {
      hostPickNewMember()
    }
  }, [hostPickNewMember, isDownloadStep])

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

  const memberList = []
  for (var i = 0; i < members.length; i++) {
    var m = members[i]
    if (m.clientId !== CLIENT_ID) {
      memberList.push(
        <tr key={m.clientId}>
          <td>
            {m.clientId} ({m.data})
          </td>
        </tr>
      )
    }
  }

  const signalGuestToAdvance = React.useCallback(nextStep => {
    if (connection.current) {
      connection.current.send('next', nextStep)
    }
  }, [])

  const signalGuestWeAreDone = React.useCallback(() => {
    if (IS_HOST && connection.current) {
      connection.current.send('goodbye', 1)
      connection.current.destroy()
      connection.current = null
    }
  }, [])

  const onReset = () => {
    setStep(0)
    hostPickNewMember()
  }

  const membersWaitingCount = () => {
    let total = 0
    for (var i = 0; i < members.length; i++) {
      var m = members[i]
      if (m.data === 'guest') {
        total++
      }
    }
    if (isConnected && total) {
      total--
    }
    return total
  }

  const totalMembersWaiting = membersWaitingCount()

  return (
    <>
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
              {memberList}
            </tbody>
          </table>
        </div>
      )}

      {!isConnected && !isDownloadStep && (
        <WaitingWrapper>
          <WaitingContainer>
            <div className="spinner-grow" />
            {IS_HOST && <p>Waiting for guests..</p>}
            {!IS_HOST && hostIsOnline && (
              <p>
                Hector is online! Waiting for turn ({totalMembersWaiting - 1}{' '}
                ahead of you)..
              </p>
            )}
            {!IS_HOST && !hostIsOnline && (
              <p>Hector is not online. Waiting for Hector...</p>
            )}
          </WaitingContainer>
        </WaitingWrapper>
      )}

      {(isConnected || isDownloadStep) && (
        <Room
          step={step}
          setStep={setStep}
          stream={stream}
          isHost={IS_HOST}
          connection={connection.current}
          handleConnectionData={handleData}
          isConnected={isConnected}
          signalGuestToAdvance={signalGuestToAdvance}
          signalGuestWeAreDone={signalGuestWeAreDone}
          resetHost={onReset}
          totalMembersWaiting={totalMembersWaiting}
        />
      )}
    </>
  )
}

const WaitingWrapper = styled.div`
  height: 100vh;
  width: 100vw;
  min-width: 650px;
  min-height: 650px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const WaitingContainer = styled.div`
  color: white;
  width: 600px;
  margin: 0 auto;
  text-align: center;
`
