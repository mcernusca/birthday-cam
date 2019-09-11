import React from "react"

import Connection from "./connection"

const apiKey = 'h6vEZA.9BEKAw:XGAq6Hym9lcxyxha'
const clientId = 'client-' + Math.random().toString(36).substr(2, 16)
const isHost = window.location.hash === '#1';

export default function Room() {
    const [members, setMembers] = React.useState([])
    const realtime = React.useRef(null)
    const room = React.useRef(null);
    const connection = React.useRef(null);
    const [isConnected, setIsConnected] = React.useState(false);

    // let currentChat 

    const pickNextMember = React.useCallback(() => {
        console.log("pickNextMember", members)

        for (var i = 0; i < members.length; i++) {
            var m = members[i]
            if (m.clientId !== clientId) {
                return m.clientId
            }
        }
        return null
    }, [members])

    const handleConnectionChange = React.useCallback((isConnected) => {
        setIsConnected(isConnected)
    }, [setIsConnected])

    React.useEffect(() => {
        realtime.current = new window.Ably.Realtime({ key: apiKey, clientId: clientId })
        room.current = realtime.current.channels.get('room')
        room.current.presence.subscribe('enter', () => {
            room.current.presence.get((err, members) => {
                if (!err) {
                    setMembers(members.sort((a, b) => a.timestamp - b.timestamp))
                }
            })
        })
        room.current.presence.subscribe('leave', (member) => {
            console.log(">>> Left:", member)
            if (connection.current && member.clientId === connection.current.remoteClientId) {
                connection.current = null
            }
            room.current.presence.get((err, members) => {
                if (!err) {
                    setMembers(members)
                }
            })
        })

        room.current.presence.enter()

        if (!isHost) {
            // Wait to be picked
            console.log("Waiting to be picked...")
            room.current.subscribe(`signal/${clientId}`, msg => {
                console.log("Was picked!", msg)
                if (!connection.current) {
                    connection.current = new Connection(clientId, msg.data.user, room.current, false, handleConnectionChange)
                }
                connection.current.handleSignal(msg.data.signal)
            })
        } else {
            room.current.subscribe(`signal/${clientId}`, msg => {
                connection.current.handleSignal(msg.data.signal)
            })
        }

        return () => {
            room.current.presence.leave();
        }
    }, [])

    React.useEffect(() => {
        if (isHost) {
            if (connection.current === null || !connection.current.isConnected) {
                const remoteClientId = pickNextMember();
                if (remoteClientId) {
                    console.log("Picked", remoteClientId, "to be next!")
                    connection.current = new Connection(clientId, remoteClientId, room.current, true, handleConnectionChange)
                } else {
                    console.info("Nobody to pick from...")
                }
            }
        }
    }, [members, pickNextMember])

    const list = []
    for (var i = 0; i < members.length; i++) {
        var m = members[i]
        if (m.clientId !== clientId) {
            list.push(<li key={m.clientId}><small>{m.clientId}</small></li>);
        }
    }

    return (
        <div>
            Online ({members.length === 0 ? 0 : members.length - 1}) <br />
            Connected: {isConnected ? "yes" : "no"} <br />
            Host: {isHost ? "yes" : "no"} <br />
            <ul>
                {list}
            </ul>
        </div>
    )
}
