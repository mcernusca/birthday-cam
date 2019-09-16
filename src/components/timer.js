import React from 'react'
import styled from 'styled-components'

const noop = () => {}

export default function Timer({onCountdownComplete = noop}) {
  const [startCountDown, setStartCountdown] = React.useState(false)
  const [counter, setCounter] = React.useState(3)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setStartCountdown(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    if (startCountDown) {
      let timer = null
      if (counter > 0) {
        timer = setTimeout(() => {
          setCounter(prev => prev - 1)
        }, 1000)
      } else {
        timer = setTimeout(() => {
          onCountdownComplete()
        }, 500)
      }
      return () => clearTimeout(timer)
    }
  }, [counter, startCountDown, onCountdownComplete])

  if (!startCountDown) return null
  return (
    <Wrapper>
      {counter > 0 && <Number>{counter}</Number>}
      {counter === 0 && <LookUpMessage>&#8593; look up</LookUpMessage>}
    </Wrapper>
  )
}

const Wrapper = styled.div`
  position: absolute;
  top: 206px;
  left: 206px;
  width: 200px;
  height: 200px;
  text-align: center;
  color: white;
  font-weight: 800;
  z-index: 1000;
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
  opacity: 0.8;
`
const Number = styled.div`
  font-size: 200px;
  line-height: 200px;
`
const LookUpMessage = styled.div`
  font-size: 40px;
  line-height: 200px;
`
