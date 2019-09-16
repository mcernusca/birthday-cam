import React from 'react'

const useEventCallback = function(fn) {
  let ref = React.useRef()
  React.useLayoutEffect(() => {
    ref.current = fn
  })
  return React.useMemo(() => (...args) => (0, ref.current)(...args), [])
}

export default useEventCallback
