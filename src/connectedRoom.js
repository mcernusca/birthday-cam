import React from 'react'

import Room from './room'

export default function ConnectedRoom({stream}) {
  return <Room stream={stream} />
}
