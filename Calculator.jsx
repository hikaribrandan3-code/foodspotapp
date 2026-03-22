import React, { useState, useEffect, useCallback } from 'react';
import './Calculator.css';

const Calculator = ({ hiddenTabs = ['ai'], currentTab = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const isHidden = hiddenTabs.includes(currentTab.toLowerCase());

  const inputNumber = useCallback((num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const toggleSign = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  }, [display]);

  const percentage = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  const performOperation = useCallback((nextOperation) => {
    const value = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(value);
    } else if (operation) {
      const result = calculate(previousValue, value, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation]);

  const calculate = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const execute = useCallback(() => {
    const value = parseFloat(display);
    if (previousValue !== null && operation) {
      const result = calculate(previousValue, value, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operation]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key >= '0' && e.key <= '9') inputNumber(parseInt(e.key));
      if (e.key === '.') inputDecimal();
      if (e.key === 'Enter' || e.key === '=') execute();
      if (e.key === 'Escape') clear();
      if (e.key === '+') performOperation('+');
      if (e.key === '-') performOperation('−');
      if (e.key === '*') performOperation('×');
      if (e.key === '/') performOperation('÷');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputNumber, inputDecimal, execute, clear, performOperation]);

  const Button = ({ label, type = 'number', onClick, className = '' }) => {
    const btnClass = `calc-btn ${type} ${className}`;
    return (
      <button className={btnClass} onClick={onClick}>
        {label}
      </button>
    );
  };

  if (isHidden) return null;

  return (
    <>
      {/* Floating Mini Calculator Icon */}
      <button 
        className="calc-floating-icon"
        onClick={() => setIsOpen(true)}
        aria-label="Open calculator"
      >
        <div className="mini-calc">
          <div className="mini-screen"></div>
          <div className="mini-buttons">
            <span className="mini-dot gray"></span>
            <span className="mini-dot orange"></span>
          </div>
        </div>
      </button>

      {/* Full Calculator Modal */}
      {isOpen && (
        <div className="calc-overlay" onClick={() => setIsOpen(false)}>
          <div className="calc-container" onClick={(e) => e.stopPropagation()}>
            {/* Header with Close */}
            <div className="calc-header">
              <button 
                className="calc-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close calculator"
              >
                ✕
              </button>
            </div>

            {/* Display */}
            <div className="calc-display">
              <span className={display.length > 9 ? 'calc-display-small' : ''}>
                {display}
              </span>
            </div>

            {/* Button Grid */}
            <div className="calc-grid">
              {/* Row 1 */}
              <Button label="AC" type="function" onClick={clear} />
              <Button label="+/-" type="function" onClick={toggleSign} />
              <Button label="%" type="function" onClick={percentage} />
              <Button label="÷" type="operator" onClick={() => performOperation('÷')} />

              {/* Row 2 */}
              <Button label="7" onClick={() => inputNumber(7)} />
              <Button label="8" onClick={() => inputNumber(8)} />
              <Button label="9" onClick={() => inputNumber(9)} />
              <Button label="×" type="operator" onClick={() => performOperation('×')} />

              {/* Row 3 */}
              <Button label="4" onClick={() => inputNumber(4)} />
              <Button label="5" onClick={() => inputNumber(5)} />
              <Button label="6" onClick={() => inputNumber(6)} />
              <Button label="−" type="operator" onClick={() => performOperation('−')} />

              {/* Row 4 */}
              <Button label="1" onClick={() => inputNumber(1)} />
              <Button label="2" onClick={() => inputNumber(2)} />
              <Button label="3" onClick={() => inputNumber(3)} />
              <Button label="+" type="operator" onClick={() => performOperation('+')} />

              {/* Row 5 */}
              <Button label="0" className="zero" onClick={() => inputNumber(0)} />
              <Button label="." onClick={inputDecimal} />
              <Button label="=" type="operator" onClick={execute} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Calculator;
