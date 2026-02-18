/**
 * Calculator - Classic Mac OS Calculator app
 *
 * A simple 4-function calculator with the classic Mac aesthetic.
 * Features: basic arithmetic, clear, and equals functionality.
 */

import { useState, useCallback } from 'react';
import { useSoundStore } from '../../stores/soundStore';
import styles from './Calculator.module.css';

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const playSound = useSoundStore((state) => state.playSound);

  const inputDigit = useCallback((digit: string) => {
    playSound('click');
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand, playSound]);

  const inputDecimal = useCallback(() => {
    playSound('click');
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand, playSound]);

  const clear = useCallback(() => {
    playSound('click');
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, [playSound]);

  const performOperation = useCallback((nextOperation: string) => {
    playSound('click');
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue;
      let result: number;

      switch (operation) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        default:
          result = inputValue;
      }

      // Format result to avoid long decimals
      const formattedResult = parseFloat(result.toPrecision(12)).toString();
      setDisplay(formattedResult);
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation, playSound]);

  const calculate = useCallback(() => {
    playSound('click');
    if (operation === null || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result: number;

    switch (operation) {
      case '+':
        result = previousValue + inputValue;
        break;
      case '-':
        result = previousValue - inputValue;
        break;
      case '×':
        result = previousValue * inputValue;
        break;
      case '÷':
        result = inputValue !== 0 ? previousValue / inputValue : 0;
        break;
      default:
        result = inputValue;
    }

    // Format result to avoid long decimals
    const formattedResult = parseFloat(result.toPrecision(12)).toString();
    setDisplay(formattedResult);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  }, [display, previousValue, operation, playSound]);

  const toggleSign = useCallback(() => {
    playSound('click');
    const value = parseFloat(display);
    if (value !== 0) {
      setDisplay((-value).toString());
    }
  }, [display, playSound]);

  // Truncate display if too long
  const displayValue = display.length > 12 ? display.slice(0, 12) : display;

  return (
    <div className={styles.calculator}>
      {/* Display */}
      <div className={styles.display}>
        <span className={styles.displayText}>{displayValue}</span>
      </div>

      {/* Button grid */}
      <div className={styles.buttons}>
        {/* Row 1 */}
        <button className={styles.buttonClear} onClick={clear}>C</button>
        <button className={styles.buttonFunction} onClick={toggleSign}>±</button>
        <button className={styles.buttonFunction} onClick={() => {
          playSound('click');
          const value = parseFloat(display) / 100;
          setDisplay(value.toString());
        }}>%</button>
        <button className={styles.buttonOperator} onClick={() => performOperation('÷')}>÷</button>

        {/* Row 2 */}
        <button className={styles.buttonDigit} onClick={() => inputDigit('7')}>7</button>
        <button className={styles.buttonDigit} onClick={() => inputDigit('8')}>8</button>
        <button className={styles.buttonDigit} onClick={() => inputDigit('9')}>9</button>
        <button className={styles.buttonOperator} onClick={() => performOperation('×')}>×</button>

        {/* Row 3 */}
        <button className={styles.buttonDigit} onClick={() => inputDigit('4')}>4</button>
        <button className={styles.buttonDigit} onClick={() => inputDigit('5')}>5</button>
        <button className={styles.buttonDigit} onClick={() => inputDigit('6')}>6</button>
        <button className={styles.buttonOperator} onClick={() => performOperation('-')}>−</button>

        {/* Row 4 */}
        <button className={styles.buttonDigit} onClick={() => inputDigit('1')}>1</button>
        <button className={styles.buttonDigit} onClick={() => inputDigit('2')}>2</button>
        <button className={styles.buttonDigit} onClick={() => inputDigit('3')}>3</button>
        <button className={styles.buttonOperator} onClick={() => performOperation('+')}>+</button>

        {/* Row 5 */}
        <button className={`${styles.buttonDigit} ${styles.buttonZero}`} onClick={() => inputDigit('0')}>0</button>
        <button className={styles.buttonDigit} onClick={inputDecimal}>.</button>
        <button className={styles.buttonEquals} onClick={calculate}>=</button>
      </div>
    </div>
  );
}
