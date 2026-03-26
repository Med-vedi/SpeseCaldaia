import { useEffect, useState } from 'react'
import { Button, FloatButton, Modal, message } from 'antd'
import { CalculatorOutlined } from '@ant-design/icons'

const EUROPEAN_LOCALE = 'it-IT'

function formatEuropeanNumber(value: number, precision: number) {
  return new Intl.NumberFormat(EUROPEAN_LOCALE, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

function parseEuropeanNumber(value: string | undefined) {
  if (!value) return NaN
  const cleaned = value.trim().replace(/\s/g, '')
  if (!cleaned) return NaN

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) return Number(cleaned.replace(/\./g, '').replace(',', '.'))
    return Number(cleaned.replace(/,/g, ''))
  }

  if (lastComma !== -1) return Number(cleaned.replace(',', '.'))
  return Number(cleaned)
}

const FloatingCalculator = () => {
  const [open, setOpen] = useState(false)
  const [expression, setExpression] = useState('')
  const [display, setDisplay] = useState('0')

  const pushToken = (token: string) => {
    setExpression((prev) => prev + token)
    setDisplay((prev) => (prev === '0' ? token : prev + token))
  }

  const clear = () => {
    setExpression('')
    setDisplay('0')
  }

  const backspace = () => {
    setExpression((prev) => prev.slice(0, -1))
    setDisplay((prev) => {
      const next = prev.slice(0, -1)
      return next || '0'
    })
  }

  const evaluate = () => {
    try {
      const baseExpression = expression.replace(/×/g, '*').replace(/÷/g, '/')
      const normalizedExpression = baseExpression.replace(/[0-9][0-9.,]*/g, (token) => {
        const parsed = parseEuropeanNumber(token)
        return Number.isFinite(parsed) ? String(parsed) : token
      })

      if (!/^[0-9+\-*/().\s]+$/.test(normalizedExpression)) {
        throw new Error('Invalid characters')
      }

      const result = Function(`"use strict"; return (${normalizedExpression})`)()
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error('Invalid result')
      }

      setExpression(String(result))
      setDisplay(formatEuropeanNumber(result, 2))
    } catch {
      message.error('Espressione non valida')
    }
  }

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(display)
      message.success('Valore copiato')
    } catch {
      message.error('Impossibile copiare il valore')
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const sanitized = text
        .replace(/\s+/g, '')
        .replace(/[xX]/g, '×')
        .replace(/:/g, '÷')
        .replace(/[^0-9+\-×÷*/().,]/g, '')

      if (!sanitized) {
        message.warning('Nessun valore valido da incollare')
        return
      }

      setExpression((prev) => prev + sanitized)
      setDisplay((prev) => (prev === '0' ? sanitized : prev + sanitized))
    } catch {
      message.error('Impossibile leggere dagli appunti')
    }
  }

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key

      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === 'v') {
        event.preventDefault()
        void pasteFromClipboard()
        return
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault()
        evaluate()
        return
      }
      if (key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (key === 'Backspace' || key === 'Delete') {
        event.preventDefault()
        backspace()
        return
      }

      if (/[0-9]/.test(key)) {
        event.preventDefault()
        pushToken(key)
        return
      }

      const keyMap: Record<string, string> = {
        '.': ',',
        ',': ',',
        '+': '+',
        '-': '-',
        '*': '×',
        '/': '÷',
        '(': '(',
        ')': ')',
      }
      if (key in keyMap) {
        event.preventDefault()
        pushToken(keyMap[key])
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, expression, display])

  return (
    <>
      <FloatButton
        icon={<CalculatorOutlined />}
        type="primary"
        tooltip={<span>Apri calcolatrice</span>}
        onClick={() => setOpen(true)}
      />

      <Modal
        title="Calcolatrice"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        centered
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500 mb-1">Risultato</div>
            <div className="text-2xl font-semibold text-right break-all">{display}</div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button onClick={clear}>C</Button>
            <Button onClick={backspace}>DEL</Button>
            <Button onClick={() => pushToken('(')}>(</Button>
            <Button onClick={() => pushToken(')')}>)</Button>

            <Button onClick={() => pushToken('7')}>7</Button>
            <Button onClick={() => pushToken('8')}>8</Button>
            <Button onClick={() => pushToken('9')}>9</Button>
            <Button onClick={() => pushToken('÷')}>÷</Button>

            <Button onClick={() => pushToken('4')}>4</Button>
            <Button onClick={() => pushToken('5')}>5</Button>
            <Button onClick={() => pushToken('6')}>6</Button>
            <Button onClick={() => pushToken('×')}>×</Button>

            <Button onClick={() => pushToken('1')}>1</Button>
            <Button onClick={() => pushToken('2')}>2</Button>
            <Button onClick={() => pushToken('3')}>3</Button>
            <Button onClick={() => pushToken('-')}>-</Button>

            <Button onClick={() => pushToken('0')}>0</Button>
            <Button onClick={() => pushToken(',')}>,</Button>
            <Button type="primary" onClick={evaluate}>=</Button>
            <Button onClick={() => pushToken('+')}>+</Button>
          </div>

          <Button block onClick={copyResult}>
            Copia risultato
          </Button>
          <Button block onClick={pasteFromClipboard}>
            Incolla da appunti
          </Button>
        </div>
      </Modal>
    </>
  )
}

export default FloatingCalculator

