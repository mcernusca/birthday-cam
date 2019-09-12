import React from "react"

import Connection from "./connection"
import cn from "classname"
import { captureImageFromVideo } from './canvasObjectFit';

import japanFramePng from "./images/japan.png"

const apiKey = 'h6vEZA.9BEKAw:XGAq6Hym9lcxyxha'
const clientId = 'client-' + Math.random().toString(36).substr(2, 16)
const isHost = window.location.hash === '#1';

function Indicator({ isConnected }) {
    return <div className={cn("indicator", { connected: isConnected })} />
}

export default function Room({ stream }) {
    const [members, setMembers] = React.useState([])
    const realtime = React.useRef(null)
    const room = React.useRef(null);
    const connection = React.useRef(null);
    const [isConnected, setIsConnected] = React.useState(false);

    const imageFrameRef = React.useRef(null);
    const firstVideoRef = React.useRef(null);
    const secondVideoRef = React.useRef(null);
    const downloadLinkRef = React.useRef(null);

    React.useEffect(() => {
        if (stream) {
            var video = document.querySelector('video.host')
            if ('srcObject' in video) {
                video.srcObject = stream
            } else {
                video.src = window.URL.createObjectURL(stream) // for older browsers
            }
            video.play()
        }
    }, [stream])

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

    React.useEffect(() => {
        realtime.current = new window.Ably.Realtime({ key: apiKey, clientId: clientId, closeOnUnload: true })
        room.current = realtime.current.channels.get('room')
        room.current.presence.subscribe('enter', () => {
            room.current.presence.get((err, members) => {
                if (!err) {
                    setMembers(members.sort((a, b) => a.timestamp - b.timestamp))
                }
            })
        })
        room.current.presence.subscribe('leave', (member) => {
            console.info("<<<ws: left:", member)
            if (connection.current && member.clientId === connection.current.remoteClientId) {
                connection.current.destroy();
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
                    console.info("<<<ws: got answer from pick:", msg)
                    connection.current.handleSignal(msg.data.signal)
                } else {
                    console.info("<<<ws: was picked:", msg)
                    if (!connection.current) {
                        connection.current = new Connection(clientId, msg.data.user, room.current, false)
                        connection.current.onConnectionChange = setIsConnected
                    }
                    connection.current.handleSignal(msg.data.signal)
                }
            }
        })

        if (isHost) {
            console.info("Host ready to pick...")
        } else {
            console.info("Waiting to be picked...")
        }

        return () => {
            room.current.presence.leave()
        }
    }, [])

    React.useEffect(() => {
        if (isHost) {
            if (connection.current === null || !connection.current.isConnected) {
                const remoteClientId = pickNextMember();
                if (remoteClientId) {
                    console.log("Picked", remoteClientId, "to be next!")
                    connection.current = new Connection(clientId, remoteClientId, room.current, true)
                    connection.current.onConnectionChange = setIsConnected
                } else {
                    console.info("Nobody to pick from...")
                }
            }
        }
    }, [members, pickNextMember])

    React.useEffect(() => {
        if (stream && connection.current) {
            console.log("~~~setting stream!")
            connection.current.addStream(stream)
        } else {
            console.log("~~~need a stream or a connection!")
        }
    }, [isConnected, stream])

    const list = []
    for (var i = 0; i < members.length; i++) {
        var m = members[i]
        if (m.clientId !== clientId) {
            list.push(<tr key={m.clientId}><td>{m.clientId}</td></tr>);
        }
    }

    const takePhoto = (e) => {
        // e.preventDefault();
        // var canvas = document.createElement('canvas');
        // canvas.height = 612;
        // canvas.width = 612;
        var canvas = document.getElementById("canvas");
        var ctx = canvas.getContext("2d");

        // var ox = canvas.width / 2;
        // var oy = canvas.height / 2;
        // ctx.font = "42px serif";
        // ctx.textAlign = "center";
        // ctx.textBaseline = "middle";
        // ctx.fillStyle = "#800";
        // ctx.fillRect(ox / 2, oy / 2, ox, oy);
        ctx.save();
        ctx.translate(120, 0);
        ctx.scale(-1, 1);
        captureImageFromVideo(ctx, firstVideoRef.current, -148, 175, 120, 120, { objectFit: 'cover' });
        captureImageFromVideo(ctx, secondVideoRef.current, -449, 175, 120, 120, { objectFit: 'cover' });
        ctx.restore();
        ctx.drawImage(imageFrameRef.current, 0, 0, 612, 612)

        var image = canvas.toDataURL("image/jpg");
        downloadLinkRef.current.href = image;
    }

    return (
        <div className="room-wrapper">
            <div className="debug">
                <table>
                    <tr><td>Host: {isHost ? "yes" : "no"}</td></tr>
                    <tr><td>Online ({members.length === 0 ? 0 : members.length - 1})</td></tr>
                    {list}
                </table>
            </div>
            <Indicator isConnected={isConnected} />

            <div className="imageFrame" >
                <a download="birthday-cam.jpg" className="download-btn" href="" onClick={takePhoto} ref={downloadLinkRef}>Take Photo</a>
                <img src={japanFramePng} alt="" ref={imageFrameRef} />
                <video className={cn("first", isHost ? "guest" : "host", { "self": !isHost })} ref={firstVideoRef} />
                <video className={cn("second", isHost ? "host" : "guest", { "self": isHost })} ref={secondVideoRef} />
            </div>

            <canvas id="canvas" width={612} height={612} />
        </div>
    )
}
