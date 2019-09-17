import React from 'react'
import styled from 'styled-components'

import flashJpg from './images/flash.jpg'

export default function GetUserMedia({children}) {
  const [stream, setStream] = React.useState(null)
  const [isRequesting, setIsRequesting] = React.useState(false)

  function getStream() {
    setIsRequesting(true)
    window.navigator.mediaDevices
      .getUserMedia({audio: false, video: true})
      .then(stream => {
        setStream(stream)
      })
  }

  if (!stream) {
    return (
      <>
        <BackgroundWrapper />
        <Wrapper>
          <p>Welcome!</p>
          <p>
            <small>
              This is a video only (no sound) multiplayer photo booth
              experience. Put on clothes before you continue{' '}
              <span role="img" aria-label="shy emoji">
                😳
              </span>
              .
            </small>
          </p>
          <p>
            <small>
              To increase your odds of this working please use incognito mode if
              you use an ad blocker. No mobile devices please!{' '}
              <span role="img" aria-label="fingers crossed emoji">
                🤞
              </span>
            </small>
          </p>
          <StartButton
            className="goAgainButton"
            onClick={getStream}
            disabled={isRequesting}
          >
            Ready!
          </StartButton>
        </Wrapper>
      </>
    )
  } else {
    return React.cloneElement(children, {stream})
  }
}

const BackgroundWrapper = styled.div`
  position: absolute;
  height: 100vh;
  width: 100vw;
  background: url(${flashJpg});
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  opacity: 0.03;
`

const Wrapper = styled.div`
  position: absolute;

  height: calc(100vh - 40px);
  width: calc(100vw - 40px);

  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  padding: 20px;

  color: #fff;

  p {
    font-size: 20px;
    max-width: 500px;
  }

  p + p {
    margin: 10px 0;
  }

  small {
    font-size: 17px;
    span {
      font-size: 25px;
    }
  }
`

const StartButton = styled.button`
  padding: 0px 30px;
  color: #0d1725;
  background: #ffc400;
  text-align: center;
  text-decoration: none;
  border-radius: 20px;
  font-weight: 600;
  font-size: 16px;
  border: 0;
  cursor: pointer;
  outline: none;
  margin-top: 50px;
  margin-bottom: 20px;
  transform: scale(1.3);
`
