import React from 'react'
import styled from 'styled-components'

import Connection from './connection'
import queryString from 'query-string'
import {useKeyState} from 'use-key-state'

import useEventCallback from './hooks/useEventCallback'
import generateClientId from './utils/clientId'
import useAudio, {Play} from './hooks/useAudio'

import Room from './room'

import someoneJoinedWav from './sounds/music_marimba_chord.wav'
import helloWav from './sounds/hello.wav'

const ABLY_API_KEY = 'h6vEZA.9BEKAw:XGAq6Hym9lcxyxha'
const CLIENT_ID = generateClientId()
const IS_HOST = 'isHector' in queryString.parse(window.location.search)
const STEPS = 4

// We manage connection at this layer and render a loading screen until connection
// is ready

export default function ConnectedRoom({stream}) {
  const [step, setStep] = React.useState(0)
  const [members, setMembers] = React.useState([])
  const skippedMembersRef = React.useRef([])
  const prevMemberCount = React.useRef(0)
  const [showDebug, setShowDebug] = React.useState(false)
  const [guestStream, setGuestStream] = React.useState(null)
  const realtimeRef = React.useRef(null)
  const roomRef = React.useRef(null)
  const connection = React.useRef(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const {slashKey} = useKeyState({slashKey: '/'})
  const isDownloadStep = step === STEPS
  const someoneJoinedAudio = useAudio(someoneJoinedWav)
  const helloAudio = useAudio(helloWav)

  React.useEffect(() => {
    if (slashKey.down) {
      setShowDebug(prev => !prev)
    }
  }, [slashKey])

  const handleData = useEventCallback((key, value) => {
    if (key === 'goodbye') {
      // Disconnect
      console.info('~~~was requested to leave!', value)
      roomRef.current.presence.leave(err => {
        console.info('~~~left presence set', err)
      })
      if (connection.current) {
        connection.current.destroy()
        connection.current = null
      }
    }
  })

  const pickNextMember = React.useCallback(() => {
    console.info('~~~pickNextMember', members)

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

  const setMembersSorted = members => {
    const filteredMembers = members.filter(
      m => !skippedMembersRef.current.includes(m.clientId)
    )
    const sortedMembers = filteredMembers.sort(
      (a, b) => a.timestamp - b.timestamp
    )
    setMembers(sortedMembers)
  }

  const skipMember = clientId => {
    skippedMembersRef.current.push(clientId)
    setMembersSorted(members)
  }

  const skipTopPick = () => {
    const clientId = pickNextMember()
    if (clientId) {
      console.info('~~~skip top pick', clientId)
      skipMember(clientId)
    } else {
      console.warn('~~~pick list is empty!')
    }
  }

  React.useEffect(() => {
    realtimeRef.current = new window.Ably.Realtime({
      key: ABLY_API_KEY,
      clientId: CLIENT_ID,
      closeOnUnload: true
    })
    roomRef.current = realtimeRef.current.channels.get('room2')
    roomRef.current.presence.subscribe('enter', () => {
      roomRef.current.presence.get((err, members) => {
        if (!err) {
          setMembersSorted(members)
        }
      })
    })
    roomRef.current.presence.subscribe('leave', member => {
      console.info('~~~ws: left:', member)
      if (
        connection.current &&
        member.clientId === connection.current.remoteClientId
      ) {
        connection.current.destroy()
        connection.current = null
      }
      roomRef.current.presence.get((err, members) => {
        if (!err) {
          setMembersSorted(members)
        }
      })
    })

    roomRef.current.presence.enter(IS_HOST ? 'host' : 'guest')

    roomRef.current.subscribe(`signal/${CLIENT_ID}`, msg => {
      if (msg && msg.data && msg.data.signal) {
        if (IS_HOST) {
          console.info('~~~ws: got answer from pick:', msg)
          console.info('======HANDLING SIGNAL HOST======')
          connection.current.handleSignal(msg.data.signal)
          connection.current.onGuestStreamChange = setGuestStream
        } else {
          console.info('~~~ws: was picked:', msg)
          if (!connection.current) {
            console.info('======CREATING NEW CONNECTION======')
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
            connection.current.onGuestStreamChange = setGuestStream
          }
          console.info('======HANDLING SIGNAL GUEST======')
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
          console.info('~~~Picked', remoteClientId, 'to be next!')
          console.info('~~~Resetting step...')
          setStep(0)
          connection.current = new Connection(
            CLIENT_ID,
            remoteClientId,
            roomRef.current,
            true
          )
          connection.current.onConnectionChange = setIsConnected
        } else {
          console.info('~~~Nobody to pick from...')
        }
      }
    }
  }, [pickNextMember])

  React.useEffect(() => {
    // When member list changes pick a new connection
    // if we're not already connected or on the download step...
    if (!isConnected && !isDownloadStep) {
      console.info('=============HOST PICK NEW MEMBER=============')
      hostPickNewMember()
    }
  }, [hostPickNewMember, isDownloadStep, isConnected])

  React.useEffect(() => {
    if (isConnected) {
      if (stream && connection.current) {
        console.info('~~~setting stream!')
        connection.current.addStream(stream)
      } else {
        console.info('~~~need a stream or a connection!')
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
    console.info('~~~Resetting step...')
    setStep(0)
    connection.current = null
    // This now happens as a side effect...
    // hostPickNewMember()
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

  React.useEffect(() => {
    if (IS_HOST && isDownloadStep && members.length > prevMemberCount.current) {
      Play(someoneJoinedAudio, 0.8)
    }
    prevMemberCount.current = members.length
  })

  React.useEffect(() => {
    if (isConnected) {
      Play(helloAudio, 0.8)
    }
  }, [isConnected, helloAudio])

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

            {IS_HOST && totalMembersWaiting === 0 && (
              <p>Waiting for guests..</p>
            )}
            {IS_HOST && totalMembersWaiting > 0 && (
              <p>
                Connecting... ({totalMembersWaiting} waiting).{' '}
                <button onClick={skipTopPick}>Skip</button>
              </p>
            )}

            {!IS_HOST && hostIsOnline && (
              <p>
                Héctor is online! Waiting for turn ({totalMembersWaiting - 1}{' '}
                ahead of you)..
              </p>
            )}
            {!IS_HOST && !hostIsOnline && (
              <p>Héctor is not online. Waiting for Héctor...</p>
            )}
          </WaitingContainer>
        </WaitingWrapper>
      )}

      {(isConnected || isDownloadStep) && (
        <Room
          step={step}
          setStep={setStep}
          stream={stream}
          guestStream={guestStream}
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
