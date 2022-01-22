import { useEffect, useRef, useState } from 'react';
import './App.css';

const CalculatorButton = ({
  children,
  dark,
  light,
  onClick,
}: {
  children: string;
  dark?: boolean;
  light?: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      className={`calculator-button ${dark ? 'calculator-button-dark' : ''} ${
        light ? 'calculator-button-light' : ''
      }`}
      role="none"
      onClick={onClick}
    >
      {children}
    </div>
  );
};
CalculatorButton.defaultProps = {
  dark: false,
  light: false,
};

function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  callback: (e: WindowEventMap[K]) => void
) {
  const callbackRef = useRef<typeof callback>();
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const eventListener = (e: WindowEventMap[K]) => {
      if (callbackRef.current) {
        callbackRef.current(e);
      }
    };

    window.addEventListener(eventName, eventListener);
    return () => {
      window.removeEventListener(eventName, eventListener);
    };
  }, [eventName]);
}

const useHotkey = (
  key: string | number,
  callback: (e: KeyboardEvent) => void
) => {
  let ctrl = false;
  let shift = false;
  let keyToListen: string | number = '';
  if (typeof key === 'string' && key.includes('+')) {
    const spl = key.split('+');
    [keyToListen] = spl.slice(-1);
    ctrl = spl.includes('ctrl');
    shift = spl.includes('shift');
  } else {
    keyToListen = key;
  }

  useEventListener('keydown', (e: KeyboardEvent) => {
    if (ctrl !== e.ctrlKey) return;
    if (shift !== e.shiftKey) return;
    if (e.key === keyToListen || e.code === keyToListen) {
      callback(e);
    }
  });
};

const useIpcEvent = (eventName: string, callback: () => void) => {
  const callbackRef = useRef<typeof callback>();
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const eventListener = () => {
      if (callbackRef.current) {
        callbackRef.current();
      }
    };

    // @ts-expect-error no type here
    if (window.electron) {
      // @ts-expect-error no type here
      return window.electron.ipcRenderer.on(eventName, eventListener);
    }

    return () => {};
  }, [eventName]);
};

const Calculator = () => {
  const stackDiv = useRef<HTMLDivElement>(null);
  const [nextTypeWillClearBuffer, setNextTypeWillClearBuffer] = useState(false);
  const [nextTypeWillPushBuffer, setNextTypeWillPushBuffer] = useState(false);
  const [stack, setStack] = useState<number[]>([]);
  const pushStack = (v: number) => {
    setNextTypeWillClearBuffer(true);
    setStack([...stack, v]);
    setTimeout(() => {
      stackDiv.current?.scrollTo(0, stackDiv.current.scrollHeight);
    });
  };

  const [buffer, setBuffer] = useState('0');
  const setBufferN = (v: number) => setBuffer(v.toString());

  const pushBuffer = () => {
    pushStack(+buffer);
    setNextTypeWillPushBuffer(false);
  };
  useHotkey('Enter', pushBuffer);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(buffer);
  };
  useIpcEvent('calculator-copy', copyToClipboard);
  useHotkey('ctrl+KeyC', copyToClipboard);

  const pasteFromClipboard = async () => {
    const text = await navigator.clipboard.readText();
    const lines = text.split('\n');
    const nums = lines
      .map((l) => +l.replace(/[,]/g, ''))
      .filter((n) => !Number.isNaN(n));
    if (!nums.length) return;

    setStack([...stack, +buffer, ...nums.slice(0, -1)]);
    setBufferN(nums.slice(-1)[0]);
    setNextTypeWillClearBuffer(false);
    setNextTypeWillPushBuffer(true);
  };
  useIpcEvent('calculator-paste', pasteFromClipboard);
  useHotkey('ctrl+KeyV', pasteFromClipboard);

  const popStack = () => {
    setStack(stack.slice(0, -1));
  };
  useHotkey('ctrl+Delete', popStack);

  const normalizeBuffer = (b: string) =>
    b.replace(/^0+(?=\d)/g, '').replace(/^\.$/, '0.');

  const typeKey = (k: string) => {
    if (nextTypeWillPushBuffer) {
      pushBuffer();
      setBuffer(normalizeBuffer(k));
    } else if (nextTypeWillClearBuffer) {
      setBuffer(normalizeBuffer(k));
    } else if (k !== '.' || !buffer.includes('.')) {
      setBuffer(normalizeBuffer(buffer + k));
    }
    setNextTypeWillClearBuffer(false);
    setNextTypeWillPushBuffer(false);
  };

  const typeDigit = (d: number) => {
    typeKey(d.toString());
  };
  useHotkey('0', () => typeDigit(0));
  useHotkey('1', () => typeDigit(1));
  useHotkey('2', () => typeDigit(2));
  useHotkey('3', () => typeDigit(3));
  useHotkey('4', () => typeDigit(4));
  useHotkey('5', () => typeDigit(5));
  useHotkey('6', () => typeDigit(6));
  useHotkey('7', () => typeDigit(7));
  useHotkey('8', () => typeDigit(8));
  useHotkey('9', () => typeDigit(9));

  const typePeriod = () => {
    typeKey('.');
  };
  useHotkey('Period', typePeriod);
  useHotkey('NumpadDecimal', typePeriod);

  const backspace = () => {
    setBuffer(buffer.slice(0, -1));
    if (buffer === '') {
      setBuffer('0');
    }
  };
  useHotkey('Backspace', backspace);

  const clearBuffer = () => {
    setBuffer('0');
    setNextTypeWillPushBuffer(false);
    setNextTypeWillClearBuffer(false);
  };
  useHotkey('shift+Backspace', clearBuffer);

  const clearAll = () => {
    clearBuffer();
    setStack([]);
  };
  useHotkey('ctrl+Backspace', clearAll);

  const unaryOp = (fn: (x: number) => number) => {
    setBufferN(fn(+buffer));
    setNextTypeWillPushBuffer(true);
  };

  const binaryOp = (fn: (a: number, b: number) => number) => {
    if (!stack.length) return;
    const a = stack.slice(-1)[0];
    setStack(stack.slice(0, -1));
    const b = +buffer;
    setBufferN(fn(a, b));
    setNextTypeWillPushBuffer(true);
  };

  const opPercent = () => {
    unaryOp((x) => x / 100);
  };
  useHotkey('shift+Digit5', opPercent);

  const opReciprocal = () => {
    unaryOp((x) => 1 / x);
  };
  useHotkey('shift+Digit4', opReciprocal);

  const opSquare = () => {
    unaryOp((x) => x * x);
  };
  useHotkey('shift+Digit6', opSquare);

  const opSquareRoot = () => {
    unaryOp((x) => Math.sqrt(x));
  };
  useHotkey('shift+ctrl+Digit6', opSquareRoot);

  const opDivide = () => {
    binaryOp((a, b) => a / b);
  };
  useHotkey('NumpadDivide', opDivide);
  useHotkey('Slash', opDivide);

  const opMultiply = () => {
    binaryOp((a, b) => a * b);
  };
  useHotkey('NumpadMultiply', opMultiply);
  useHotkey('shift+Digit8', opMultiply);

  const opSubtract = () => {
    binaryOp((a, b) => a - b);
  };
  useHotkey('NumpadSubtract', opSubtract);
  useHotkey('Minus', opSubtract);

  const opAdd = () => {
    binaryOp((a, b) => a + b);
  };
  useHotkey('NumpadAdd', opAdd);
  useHotkey('shift+Equal', opAdd);

  const opInvertSign = () => {
    unaryOp((x) => -x);
  };
  useHotkey('shift+Minus', opInvertSign);

  const formatBuffer = () => {
    const parts = buffer.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const DigitButton = ({ digit }: { digit: number }) => {
    return (
      <CalculatorButton dark onClick={() => typeDigit(digit)}>
        {digit.toString()}
      </CalculatorButton>
    );
  };

  let nextStackId = 0;

  return (
    <div className="calculator">
      <div className="calculator-top">
        <div className="calculator-stack" ref={stackDiv}>
          {stack.map((s) => (
            <div key={nextStackId++}>{s.toLocaleString()}</div>
          ))}
        </div>
        <div className="calculator-buffer">{formatBuffer()}</div>
      </div>

      <CalculatorButton onClick={opPercent}>%</CalculatorButton>
      <CalculatorButton onClick={clearBuffer}>CE</CalculatorButton>
      <CalculatorButton onClick={clearAll}>C</CalculatorButton>
      <CalculatorButton onClick={backspace}>⌫</CalculatorButton>

      <CalculatorButton onClick={opReciprocal}>⅟𝑥</CalculatorButton>
      <CalculatorButton onClick={opSquare}>𝑥²</CalculatorButton>
      <CalculatorButton onClick={opSquareRoot}>√𝑥</CalculatorButton>
      <CalculatorButton onClick={opDivide}>÷</CalculatorButton>

      <DigitButton digit={7} />
      <DigitButton digit={8} />
      <DigitButton digit={9} />
      <CalculatorButton onClick={opMultiply}>×</CalculatorButton>

      <DigitButton digit={4} />
      <DigitButton digit={5} />
      <DigitButton digit={6} />
      <CalculatorButton onClick={opSubtract}>-</CalculatorButton>

      <DigitButton digit={1} />
      <DigitButton digit={2} />
      <DigitButton digit={3} />
      <CalculatorButton onClick={opAdd}>+</CalculatorButton>

      <CalculatorButton dark onClick={opInvertSign}>
        ±
      </CalculatorButton>
      <DigitButton digit={0} />
      <CalculatorButton dark onClick={typePeriod}>
        .
      </CalculatorButton>
      <CalculatorButton light onClick={pushBuffer}>
        ⎆
      </CalculatorButton>
    </div>
  );
};

export default function App() {
  return <Calculator />;
}
