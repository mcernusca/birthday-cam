import React from 'react'
import cn from 'classname'
import styled from 'styled-components'

export default function Indicator({isConnected}) {
  return <Wrapper className={cn({connected: isConnected})} />
}

const Wrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 20px;
  height: 20px;
  border-radius: 20px;
  background: lightcoral;

  &.connected {
    background: lightgreen;
  }
`
