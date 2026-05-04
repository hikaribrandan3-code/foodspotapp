import React, { useState } from 'react';
import { translations } from '../../utils/translations';

export default function CalculatorModal({ onClose, onUseResult, lang }) {
  const [display, setDisplay] = useState('0');
  const [operation, setOperation] = useState(null);
  const [prevValue, setPrevValue] = useState(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num) => {
    if (newNumber) {
      setDisplay(String(num));
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay('0.');
      setNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op) => {
    const currentValue = parseFloat(display);
    if (prevValue === null) {
      setPrevValue(currentValue);
    } else if (operation) {
      const result = calculate(prevValue, currentValue, operation);
      setDisplay(String(result));
      setPrevValue(result);
    }
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (prev, current, op) => {
    switch (op) {
      case '+':
        return prev + current;
      case '-':
        return prev - current;
      case '×':
        return prev * current;
      case '÷':
        return prev / current;
      default:
        return current;
    }
  };

  const handleEquals = () => {
    if (operation && prevValue !== null) {
      const result = calculate(prevValue, parseFloat(display), operation);
      setDisplay(String(result));
      setPrevValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setOperation(null);
    setPrevValue(null);
    setNewNumber(true);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setNewNumber(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-950 rounded-t-2xl md:rounded-2xl w-full md:w-[320px] shadow-lg p-md space-y-md">
        <div className="flex justify-between items-center">
          <h2 className="font-h3 text-h3 text-on-surface font-bold">
            {translations.calculator?.[lang] || 'Calculator'}
          </h2>
          <button onClick={onClose} className="text-outline hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Display */}
        <div className="bg-surface-container-low border border-outline-variant rounded p-md text-right">
          <p className="font-data-mono text-h1 text-on-surface break-words">{display}</p>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-xs">
          {/* Row 1 */}
          <button
            onClick={handleClear}
            className="col-span-2 bg-error text-on-primary font-label-md text-label-md py-sm rounded hover:opacity-80"
          >
            C
          </button>
          <button
            onClick={handleBackspace}
            className="bg-outline text-on-surface font-label-md text-label-md py-sm rounded hover:opacity-80"
          >
            ⌫
          </button>
          <button
            onClick={() => handleOperation('÷')}
            className="bg-primary text-on-primary font-label-md text-label-md py-sm rounded hover:opacity-80"
          >
            ÷
          </button>

          {/* Row 2 */}
          {[7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(num)}
              className="bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md py-sm rounded hover:bg-surface-container-high"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleOperation('×')}
            className="bg-primary text-on-primary font-label-md text-label-md py-sm rounded hover:opacity-80"
          >
            ×
          </button>

          {/* Row 3 */}
          {[4, 5, 6].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(num)}
              className="bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md py-sm rounded hover:bg-surface-container-high"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleOperation('-')}
            className="bg-primary text-on-primary font-label-md text-label-md py-sm rounded hover:opacity-80"
          >
            −
          </button>

          {/* Row 4 */}
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(num)}
              className="bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md py-sm rounded hover:bg-surface-container-high"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleOperation('+')}
            className="bg-primary text-on-primary font-label-md text-label-md py-sm rounded hover:opacity-80"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={() => handleNumber(0)}
            className="col-span-2 bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md py-sm rounded hover:bg-surface-container-high"
          >
            0
          </button>
          <button
            onClick={handleDecimal}
            className="bg-surface-container border border-outline-variant text-on-surface font-label-md text-label-md py-sm rounded hover:bg-surface-container-high"
          >
            .
          </button>
          <button
            onClick={handleEquals}
            className="bg-secondary text-on-secondary font-label-md text-label-md py-sm rounded hover:opacity-80"
          >
            =
          </button>
        </div>

        {/* Use Result Button */}
        <button
          onClick={() => onUseResult(display)}
          className="w-full bg-primary text-on-primary font-label-md text-label-md py-sm rounded hover:bg-primary-container transition-colors"
        >
          {translations.use_result?.[lang] || 'Use Result'}
        </button>
      </div>
    </div>
  );
}
