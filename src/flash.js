import React from 'react'
import styled from 'styled-components'

export default function Flash() {
  return <FullScreenFlash />
}

const FullScreenFlash = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
  opacity: 0;
  animation: flash 250ms linear;
  pointer-events: none;
`
