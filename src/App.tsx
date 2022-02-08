import { ButtonHTMLAttributes, createContext, createRef, Fragment, ReactFragment, useContext, useEffect, useRef, useState } from 'react'
import PWAPrompt from 'react-ios-pwa-prompt'
import formatNumber from './format-number'
import './App.css'

type ClassSpec = string | boolean | undefined | { [className: string]: boolean }
const makeClasses = (classes: ClassSpec | ClassSpec[]): string => {
  if (Array.isArray(classes)) {
    return classes.map(makeClasses).filter(v => v).join(' ')
  }
  if (typeof classes === 'string') {
    return classes
  }
  if (typeof classes === 'boolean' || typeof classes === 'undefined') {
    return ''
  }
  return Object.entries(classes).map(([k, v]) => v ? k : '').filter(v => v).join(' ')
}

const CalculatorButton = ({
  children,
  dark,
  light,
  className,
  action,
  shortcuts,
}: {
  children: ReactFragment;
  dark?: boolean;
  light?: boolean;
  className?: string,
  action: () => void;
  shortcuts?: string | string[],
}) => {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const onPress = () => {
    setPressed(true)
  }

  const onDragOut = () => {
    setPressed(false)
  }

  const onRelease = () => {
    if (pressed) {
      action()
    }
    setPressed(false)
  }

  if (shortcuts) {
    shortcuts = coerceArray(shortcuts)
    for (const shortcut of shortcuts) {
      useEventListener('keydown', modifyForHotkey(shortcut, onPress))
      useEventListener('keyup', modifyForHotkey(shortcut, onRelease))
    }
  }

  const events: ButtonHTMLAttributes<HTMLButtonElement> = 'ontouchstart' in window
    ? {
      onTouchStart() {
        onPress()
      },
      onTouchMove(e) {
        const touch = e.touches[0]
        const currentElement = document.elementFromPoint(touch.pageX, touch.pageY)
        if (currentElement !== elementRef.current) {
          onDragOut()
        }
      },
      onTouchEnd() {
        onRelease()
      },
      onTouchCancel() {
        onRelease()
      },
    }
    : {
      onMouseDown() {
        onPress()
      },
      onMouseUp() {
        onRelease()
      },
      onMouseEnter(e) {
        setHovered(true)
        if (e.buttons) {
          onPress()
        }
      },
      onMouseLeave() {
        setHovered(false)
        onDragOut()
      },
    }

  const elementRef = createRef<HTMLButtonElement>()
  return (
    <button
      ref={elementRef}
      type="button"
      className={makeClasses([
        'calculator-button',
        dark && 'calculator-button-dark',
        light && 'calculator-button-light',
        { pressed, hovered },
        className,
      ])}
      {...events}
    >
      {children}
    </button>
  )
}
CalculatorButton.defaultProps = {
  dark: false,
  light: false,
  className: '',
}

const CalculatorContext = createContext({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  typeDigit: (digit: number) => { /* noop */ },
})

const DigitButton = ({ digit }: { digit: number }) => {
  const { typeDigit } = useContext(CalculatorContext)
  return (
    <CalculatorButton dark action={() => typeDigit(digit)} shortcuts={digit.toString()}>
      {digit.toString()}
    </CalculatorButton>
  )
}

function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  callback: (e: WindowEventMap[K]) => void,
) {
  const callbackRef = useRef<typeof callback>()
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const eventListener = (e: WindowEventMap[K]) => {
      if (callbackRef.current) {
        callbackRef.current(e)
      }
    }

    window.addEventListener(eventName, eventListener)
    return () => {
      window.removeEventListener(eventName, eventListener)
    }
  }, [eventName])
}

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.log(error)
      return initialValue
    }
  })
  const setValue = (value: React.SetStateAction<T>) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.log(error)
    }
  }
  return [storedValue, setValue]
}

function coerceArray<T> (v: (T | T[])): T[] {
  if (Array.isArray(v)) {
    return v
  }
  return [v]
}

const modifyForHotkey = (key: string, handler: (e: KeyboardEvent) => void): (e: KeyboardEvent) => void => {
  let ctrl = false
  let shift = false
  let keyToListen: string | number = ''
  if (typeof key === 'string' && key.includes('+')) {
    const spl = key.split('+');
    [keyToListen] = spl.slice(-1)
    ctrl = spl.includes('ctrl')
    shift = spl.includes('shift')
  } else {
    keyToListen = key
  }

  return (e: KeyboardEvent) => {
    if (ctrl !== e.ctrlKey) return
    if (shift !== e.shiftKey) return
    if (e.key === keyToListen || e.code === keyToListen) {
      handler(e)
    }
  }
}

const useHotkey = (
  key: string | number,
  callback: (e: KeyboardEvent) => void,
) => {
  useEventListener('keydown', modifyForHotkey(key.toString(), callback))
}

const Calculator = () => {
  const stackDiv = useRef<HTMLDivElement>(null)
  const [nextTypeWillClearBuffer, setNextTypeWillClearBuffer] = useState(false)
  const [nextTypeWillPushBuffer, setNextTypeWillPushBuffer] = useState(false)
  const [stack, setStack] = useState<number[]>([])
  const pushStack = (v: number) => {
    setNextTypeWillClearBuffer(true)
    setStack([...stack, v])
    setTimeout(() => {
      stackDiv.current?.scrollTo(0, stackDiv.current.scrollHeight)
    })
  }

  const [buffer, setBuffer] = useState('0')
  const setBufferN = (v: number) => setBuffer(v.toString())

  const pushBuffer = () => {
    pushStack(+buffer)
    setNextTypeWillPushBuffer(false)
  }

  const copyToClipboard = () => {
    if (!window.getSelection()?.toString()) {
      navigator.clipboard.writeText(buffer)
    }
  }
  useHotkey('ctrl+KeyC', copyToClipboard)

  const pasteFromClipboard = async () => {
    const text = await navigator.clipboard.readText()
    const lines = text.split('\n')
    const nums = lines
      .map((l) => +l.replace(/[,]/g, ''))
      .filter((n) => !Number.isNaN(n))
    if (!nums.length) return

    setStack([...stack, +buffer, ...nums.slice(0, -1)])
    setBufferN(nums.slice(-1)[0])
    setNextTypeWillClearBuffer(false)
    setNextTypeWillPushBuffer(true)
  }
  useHotkey('ctrl+KeyV', pasteFromClipboard)

  const popStack = () => {
    setStack(stack.slice(0, -1))
  }
  useHotkey('ctrl+Delete', popStack)

  const normalizeBuffer = (b: string) =>
    b.replace(/^0+(?=\d)/g, '').replace(/^\.$/, '0.')

  const typeKey = (k: string) => {
    if (nextTypeWillPushBuffer) {
      pushBuffer()
      setBuffer(normalizeBuffer(k))
    } else if (nextTypeWillClearBuffer) {
      setBuffer(normalizeBuffer(k))
    } else if (k !== '.' || !buffer.includes('.')) {
      setBuffer(normalizeBuffer(buffer + k))
    }
    setNextTypeWillClearBuffer(false)
    setNextTypeWillPushBuffer(false)
    setAltEnabled(false)
  }

  const typeDigit = (d: number) => {
    typeKey(d.toString())
  }

  const typePeriod = () => {
    typeKey('.')
  }

  const backspace = () => {
    if (buffer.length === 1) {
      setBuffer('0')
    } else {
      setBuffer(buffer.slice(0, -1))
    }
    setNextTypeWillClearBuffer(false)
    setNextTypeWillPushBuffer(false)
  }

  const clearBuffer = () => {
    setBuffer('0')
    setNextTypeWillPushBuffer(false)
    setNextTypeWillClearBuffer(false)
  }

  const clearAll = () => {
    clearBuffer()
    setStack([])
    setAltEnabled(false)
  }

  const willClearAll = !nextTypeWillClearBuffer && buffer === '0'

  const clearOrClearAll = () => {
    if (willClearAll) {
      clearAll()
    } else {
      clearBuffer()
    }
  }

  const [altEnabled, setAltEnabled] = useState(false)
  const toggle2nd = () => {
    setAltEnabled(!altEnabled)
  }

  const unaryOp = (fn: (x: number) => number) => () => {
    setBufferN(fn(+buffer))
    setNextTypeWillPushBuffer(true)
    setAltEnabled(false)
  }

  const binaryOp = (fn: (a: number, b: number) => number) => () => {
    if (!stack.length) return
    const a = stack.slice(-1)[0]
    setStack(stack.slice(0, -1))
    const b = +buffer
    setBufferN(fn(a, b))
    setNextTypeWillPushBuffer(true)
    setAltEnabled(false)
  }

  const opPercent = unaryOp((x) => x / 100)

  const opReciprocal = unaryOp((x) => 1 / x)

  const opSquare = unaryOp(x => x * x)

  const opExponent = binaryOp((a, b) => Math.pow(a, b))

  const opSquareRoot = unaryOp((x) => Math.sqrt(x))

  const opNRoot = binaryOp((a, b) => Math.pow(a, 1/b))

  const opDivide = binaryOp((a, b) => a / b)

  const opMultiply = binaryOp((a, b) => a * b)

  const opSubtract = binaryOp((a, b) => a - b)

  const opAdd = binaryOp((a, b) => a + b)

  const opInvertSign = unaryOp((x) => -x)

  const [degrees, setDegrees] = useLocalStorage('calculator-degrees', false)
  const toggleDegrees = () => {
    setDegrees(!degrees)
  }

  const opFloor = unaryOp(x => Math.floor(x))
  const opCeiling = unaryOp(x => Math.ceil(x))

  const opLog10 = unaryOp(x => Math.log10(x))
  const opLn = unaryOp(x => Math.log(x))

  const maybeConvertFromDegrees = (x: number) => {
    if (degrees) {
      return x / 180 * Math.PI
    }
    return x
  }

  const maybeConvertToDegrees = (x: number) => {
    if (degrees) {
      return x / Math.PI * 180
    }
    return x
  }

  const makeTrigFunc = (fn: (v: number) => number) => unaryOp(x => fn(maybeConvertFromDegrees(x)))

  const opSin = makeTrigFunc(Math.sin)
  const opCos = makeTrigFunc(Math.cos)
  const opTan = makeTrigFunc(Math.tan)
  const opSinh = makeTrigFunc(Math.sinh)
  const opCosh = makeTrigFunc(Math.cosh)
  const opTanh = makeTrigFunc(Math.tanh)

  const makeInverseTrigFunc = (fn: (v: number) => number) => unaryOp(x => maybeConvertToDegrees(fn(x)))

  const opAsin = makeInverseTrigFunc(Math.asin)
  const opAcos = makeInverseTrigFunc(Math.acos)
  const opAtan = makeInverseTrigFunc(Math.atan)
  const opAsinh = makeInverseTrigFunc(Math.asinh)
  const opAcosh = makeInverseTrigFunc(Math.acosh)
  const opAtanh = makeInverseTrigFunc(Math.atanh)

  const makeConst = (v: number) => () => {
    if (!nextTypeWillClearBuffer) {
      pushBuffer()
    }
    setBufferN(v)
    setNextTypeWillClearBuffer(false)
    setNextTypeWillPushBuffer(true)
  }

  const constPi = makeConst(Math.PI)
  const constE = makeConst(Math.E)

  let nextStackId = 0

  return (
    <div className="calculator">
      <div className="calculator-top">
        <div className="calculator-stack" ref={stackDiv}>
          {stack.map((s) => (
            <div key={nextStackId++}>{formatNumber(s)}</div>
          ))}
        </div>
        <div className="calculator-buffer">{formatNumber(buffer)}</div>
      </div>

      <CalculatorContext.Provider value={{ typeDigit }}>
        <div className="calculator-extra-buttons">
          <div></div>
          <div></div>
          <div></div>

          <div></div>
          <CalculatorButton action={opFloor}>&lfloor;𝑥&rfloor;</CalculatorButton>
          <CalculatorButton action={opCeiling}>&lceil;𝑥&rceil;</CalculatorButton>

          <div></div>
          <CalculatorButton action={opLn}>ln</CalculatorButton>
          <CalculatorButton action={opLog10}>log<sub>10</sub></CalculatorButton>

          <CalculatorButton action={toggleDegrees}>{degrees ? 'Deg' : 'Rad'}</CalculatorButton>
          <CalculatorButton action={constPi}>&pi;</CalculatorButton>
          <CalculatorButton action={constE}>e</CalculatorButton>

          {altEnabled
            ? <Fragment>
              <CalculatorButton action={opAsin} light>sin<sup>-1</sup></CalculatorButton>
              <CalculatorButton action={opAcos} light>cos<sup>-1</sup></CalculatorButton>
              <CalculatorButton action={opAtan} light>tan<sup>-1</sup></CalculatorButton>

              <CalculatorButton action={opAsinh} light>sinh<sup>-1</sup></CalculatorButton>
              <CalculatorButton action={opAcosh} light>cosh<sup>-1</sup></CalculatorButton>
              <CalculatorButton action={opAtanh} light>tanh<sup>-1</sup></CalculatorButton>
            </Fragment>
            : <Fragment>
              <CalculatorButton action={opSin}>sin</CalculatorButton>
              <CalculatorButton action={opCos}>cos</CalculatorButton>
              <CalculatorButton action={opTan}>tan</CalculatorButton>

              <CalculatorButton action={opSinh}>sinh</CalculatorButton>
              <CalculatorButton action={opCosh}>cosh</CalculatorButton>
              <CalculatorButton action={opTanh}>tanh</CalculatorButton>
            </Fragment>}

        </div>

        <div className="calculator-buttons">
          <CalculatorButton action={toggle2nd} className={altEnabled ? 'calculator-button-active' : ''}>2<sup>nd</sup></CalculatorButton>
          <CalculatorButton action={opPercent} shortcuts="shift+Digit5">%</CalculatorButton>
          <CalculatorButton action={clearOrClearAll} shortcuts="ctrl+Backspace">
            {willClearAll ? 'C' : 'CE'}
          </CalculatorButton>
          <CalculatorButton action={backspace} shortcuts="Backspace">⌫</CalculatorButton>

          <CalculatorButton action={opReciprocal} shortcuts="shift+Digit4">⅟𝑥</CalculatorButton>
          {altEnabled
            ? <CalculatorButton action={opExponent} light>𝑥<sup>𝑦</sup></CalculatorButton>
            : <CalculatorButton action={opSquare} shortcuts="shift+Digit6">𝑥<sup>2</sup></CalculatorButton>
          }
          {altEnabled
            ? <CalculatorButton action={opNRoot} light><sup>𝑦</sup>√<span className="text-decoration-overline">𝑥</span></CalculatorButton>
            : <CalculatorButton action={opSquareRoot} shortcuts="shift+ctrl+Digit6">√<span className="text-decoration-overline">𝑥</span></CalculatorButton>
          }
          <CalculatorButton action={opDivide} shortcuts={['NumpadDivide', 'Slash']}>÷</CalculatorButton>

          <DigitButton digit={7} />
          <DigitButton digit={8} />
          <DigitButton digit={9} />
          <CalculatorButton action={opMultiply} shortcuts={['NumpadMultiply', 'shift+Digit8']}>&times;</CalculatorButton>

          <DigitButton digit={4} />
          <DigitButton digit={5} />
          <DigitButton digit={6} />
          <CalculatorButton action={opSubtract} shortcuts={['NumpadSubtract', 'Minus']}>&minus;</CalculatorButton>

          <DigitButton digit={1} />
          <DigitButton digit={2} />
          <DigitButton digit={3} />
          <CalculatorButton action={opAdd} shortcuts={['NumpadAdd', 'shift+Equal']}>+</CalculatorButton>

          <CalculatorButton dark action={opInvertSign} shortcuts="shift+Minus">
            &plusmn;
          </CalculatorButton>
          <DigitButton digit={0} />
          <CalculatorButton dark action={typePeriod} shortcuts={['Period', 'NumpadDecimal']}>
            .
          </CalculatorButton>
          <CalculatorButton light action={pushBuffer} shortcuts="Enter">
            ⎆
          </CalculatorButton>
        </div>
      </CalculatorContext.Provider>
    </div>
  )
}

const VersionIndicator = () => {
  const [confirmUpdate, setConfirmUpdate] = useState<() => void>()
  useEventListener('SW_UPDATE_WAITING', e => {
    setConfirmUpdate(() => e.detail)
  })
  return (
    <div className="version">
      Ralc v{process.env.REACT_APP_VERSION ?? 0}
      {confirmUpdate && <Fragment>
        &nbsp;
        <a href="#" onClick={e => {
          e.preventDefault()
          confirmUpdate()
        }}>
          Update
        </a>
      </Fragment>}
    </div>
  )
}

export default function App() {
  return <Fragment>
    <VersionIndicator />
    <Calculator />
    <PWAPrompt />
  </Fragment>
}
