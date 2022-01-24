import { createContext, Fragment, ReactFragment, useEffect, useRef, useState } from 'react'
import formatNumber from './format-number'
import './App.css'

const CalculatorButton = ({
  children,
  dark,
  light,
  className,
  onClick,
}: {
  children: ReactFragment;
  dark?: boolean;
  light?: boolean;
  className?: string,
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      className={`calculator-button ${dark ? 'calculator-button-dark' : ''} ${light ? 'calculator-button-light' : ''} ${className}`}
      onClick={(e) => {
        onClick()
        e.currentTarget.blur()
      }}
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
  return (
    <CalculatorContext.Consumer>
      {({ typeDigit }) => (
        <CalculatorButton dark onClick={() => typeDigit(digit)}>
          {digit.toString()}
        </CalculatorButton>
      )}
    </CalculatorContext.Consumer>
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

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.log(error)
      return initialValue
    }
  })
  const setValue = (value: T) => {
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

const useHotkey = (
  key: string | number,
  callback: (e: KeyboardEvent) => void,
) => {
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

  useEventListener('keydown', (e: KeyboardEvent) => {
    if (ctrl !== e.ctrlKey) return
    if (shift !== e.shiftKey) return
    if (e.key === keyToListen || e.code === keyToListen) {
      callback(e)
    }
  })
}

const Calculator = () => {
  const stackDiv = useRef<HTMLDivElement>(null)
  const [nextTypeWillClearBuffer, setNextTypeWillClearBuffer] = useLocalStorage('calculator-next-type-will-clear-buffer', false)
  const [nextTypeWillPushBuffer, setNextTypeWillPushBuffer] = useLocalStorage('calculator-next-type-will-push-buffer', false)
  const [stack, setStack] = useLocalStorage<number[]>('calculator-stack', [])
  const pushStack = (v: number) => {
    setNextTypeWillClearBuffer(true)
    setStack([...stack, v])
    setTimeout(() => {
      stackDiv.current?.scrollTo(0, stackDiv.current.scrollHeight)
    })
  }

  const [buffer, setBuffer] = useLocalStorage('calculator-buffer', '0')
  const setBufferN = (v: number) => setBuffer(v.toString())

  const pushBuffer = () => {
    pushStack(+buffer)
    setNextTypeWillPushBuffer(false)
  }
  useHotkey('Enter', pushBuffer)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(buffer)
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
  useHotkey('0', () => typeDigit(0))
  useHotkey('1', () => typeDigit(1))
  useHotkey('2', () => typeDigit(2))
  useHotkey('3', () => typeDigit(3))
  useHotkey('4', () => typeDigit(4))
  useHotkey('5', () => typeDigit(5))
  useHotkey('6', () => typeDigit(6))
  useHotkey('7', () => typeDigit(7))
  useHotkey('8', () => typeDigit(8))
  useHotkey('9', () => typeDigit(9))

  const typePeriod = () => {
    typeKey('.')
  }
  useHotkey('Period', typePeriod)
  useHotkey('NumpadDecimal', typePeriod)

  const backspace = () => {
    if (buffer.length === 1) {
      setBuffer('0')
    } else {
      setBuffer(buffer.slice(0, -1))
    }
    setNextTypeWillClearBuffer(false)
    setNextTypeWillPushBuffer(false)
  }
  useHotkey('Backspace', backspace)

  const clearBuffer = () => {
    setBuffer('0')
    setNextTypeWillPushBuffer(false)
    setNextTypeWillClearBuffer(false)
  }
  useHotkey('shift+Backspace', clearBuffer)

  const clearAll = () => {
    clearBuffer()
    setStack([])
    setAltEnabled(false)
  }
  useHotkey('ctrl+Backspace', clearAll)

  const willClearAll = !nextTypeWillClearBuffer && buffer === '0'

  const clearOrClearAll = () => {
    if (willClearAll) {
      clearAll()
    } else {
      clearBuffer()
    }
  }

  const [altEnabled, setAltEnabled] = useLocalStorage('calculator-alt-enabled', false)
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
  useHotkey('shift+Digit5', opPercent)

  const opReciprocal = unaryOp((x) => 1 / x)
  useHotkey('shift+Digit4', opReciprocal)

  const opSquare = unaryOp(x => x * x)
  useHotkey('shift+Digit6', opSquare)

  const opExponent = binaryOp((a, b) => Math.pow(a, b))

  const opSquareRoot = unaryOp((x) => Math.sqrt(x))
  useHotkey('shift+ctrl+Digit6', opSquareRoot)

  const opNRoot = binaryOp((a, b) => Math.pow(a, 1/b))

  const opDivide = binaryOp((a, b) => a / b)
  useHotkey('NumpadDivide', opDivide)
  useHotkey('Slash', opDivide)

  const opMultiply = binaryOp((a, b) => a * b)
  useHotkey('NumpadMultiply', opMultiply)
  useHotkey('shift+Digit8', opMultiply)

  const opSubtract = binaryOp((a, b) => a - b)
  useHotkey('NumpadSubtract', opSubtract)
  useHotkey('Minus', opSubtract)

  const opAdd = binaryOp((a, b) => a + b)
  useHotkey('NumpadAdd', opAdd)
  useHotkey('shift+Equal', opAdd)

  const opInvertSign = unaryOp((x) => -x)
  useHotkey('shift+Minus', opInvertSign)

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
    if (nextTypeWillPushBuffer) {
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
      <div className="version">
        Ralc v{process.env.REACT_APP_VERSION ?? 0}
      </div>

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
          <CalculatorButton onClick={opFloor}>&lfloor;𝑥&rfloor;</CalculatorButton>
          <CalculatorButton onClick={opCeiling}>&lceil;𝑥&rceil;</CalculatorButton>

          <div></div>
          <CalculatorButton onClick={opLn}>ln</CalculatorButton>
          <CalculatorButton onClick={opLog10}>log<sub>10</sub></CalculatorButton>

          <CalculatorButton onClick={toggleDegrees}>{degrees ? 'Deg' : 'Rad'}</CalculatorButton>
          <CalculatorButton onClick={constPi}>&pi;</CalculatorButton>
          <CalculatorButton onClick={constE}>e</CalculatorButton>

          {altEnabled
            ? <Fragment>
              <CalculatorButton onClick={opAsin} light>sin<sup>-1</sup></CalculatorButton>
              <CalculatorButton onClick={opAcos} light>cos<sup>-1</sup></CalculatorButton>
              <CalculatorButton onClick={opAtan} light>tan<sup>-1</sup></CalculatorButton>

              <CalculatorButton onClick={opAsinh} light>sinh<sup>-1</sup></CalculatorButton>
              <CalculatorButton onClick={opAcosh} light>cosh<sup>-1</sup></CalculatorButton>
              <CalculatorButton onClick={opAtanh} light>tanh<sup>-1</sup></CalculatorButton>
            </Fragment>
            : <Fragment>
              <CalculatorButton onClick={opSin}>sin</CalculatorButton>
              <CalculatorButton onClick={opCos}>cos</CalculatorButton>
              <CalculatorButton onClick={opTan}>tan</CalculatorButton>

              <CalculatorButton onClick={opSinh}>sinh</CalculatorButton>
              <CalculatorButton onClick={opCosh}>cosh</CalculatorButton>
              <CalculatorButton onClick={opTanh}>tanh</CalculatorButton>
            </Fragment>}

        </div>

        <div className="calculator-buttons">
          <CalculatorButton onClick={toggle2nd} className={altEnabled ? 'calculator-button-active' : ''}>2<sup>nd</sup></CalculatorButton>
          <CalculatorButton onClick={opPercent}>%</CalculatorButton>
          <CalculatorButton onClick={clearOrClearAll}>
            {willClearAll ? 'C' : 'CE'}
          </CalculatorButton>
          <CalculatorButton onClick={backspace}>⌫</CalculatorButton>

          <CalculatorButton onClick={opReciprocal}>⅟𝑥</CalculatorButton>
          {altEnabled
            ? <CalculatorButton onClick={opExponent} light>𝑥<sup>𝑦</sup></CalculatorButton>
            : <CalculatorButton onClick={opSquare}>𝑥<sup>2</sup></CalculatorButton>
          }
          {altEnabled
            ? <CalculatorButton onClick={opNRoot} light><sup>𝑦</sup>√<span className="text-decoration-overline">𝑥</span></CalculatorButton>
            : <CalculatorButton onClick={opSquareRoot}>√<span className="text-decoration-overline">𝑥</span></CalculatorButton>
          }
          <CalculatorButton onClick={opDivide}>÷</CalculatorButton>

          <DigitButton digit={7} />
          <DigitButton digit={8} />
          <DigitButton digit={9} />
          <CalculatorButton onClick={opMultiply}>&times;</CalculatorButton>

          <DigitButton digit={4} />
          <DigitButton digit={5} />
          <DigitButton digit={6} />
          <CalculatorButton onClick={opSubtract}>&minus;</CalculatorButton>

          <DigitButton digit={1} />
          <DigitButton digit={2} />
          <DigitButton digit={3} />
          <CalculatorButton onClick={opAdd}>+</CalculatorButton>

          <CalculatorButton dark onClick={opInvertSign}>
            &plusmn;
          </CalculatorButton>
          <DigitButton digit={0} />
          <CalculatorButton dark onClick={typePeriod}>
            .
          </CalculatorButton>
          <CalculatorButton light onClick={pushBuffer}>
            ⎆
          </CalculatorButton>
        </div>
      </CalculatorContext.Provider>
    </div>
  )
}

export default function App() {
  return <Calculator />
}
