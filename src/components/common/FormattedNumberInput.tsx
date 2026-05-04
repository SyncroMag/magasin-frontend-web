import { useEffect, useState } from 'react'
import { formatNumberInput, parseNumberInput } from '../../utils/format'

type FormattedNumberInputProps = {
  value: number
  onValueChange?: (value: number) => void
  min?: number
  readOnly?: boolean
  required?: boolean
  placeholder?: string
}

export function FormattedNumberInput({
  value,
  onValueChange,
  min,
  readOnly,
  required,
  placeholder,
}: FormattedNumberInputProps) {
  const [text, setText] = useState(() => formatNumberInput(value))
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setText(formatNumberInput(value))
    }
  }, [isFocused, value])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isFocused ? text : formatNumberInput(value)}
      placeholder={placeholder}
      readOnly={readOnly}
      required={required}
      onFocus={() => {
        setIsFocused(true)
        setText(value ? String(value) : '')
      }}
      onBlur={() => {
        const parsed = parseNumberInput(text)
        const nextValue = typeof min === 'number' ? Math.max(min, parsed) : parsed
        if (onValueChange) onValueChange(nextValue)
        setText(formatNumberInput(nextValue))
        setIsFocused(false)
      }}
      onChange={(event) => {
        const nextText = event.target.value
        setText(nextText)
        if (onValueChange) {
          const parsed = parseNumberInput(nextText)
          onValueChange(typeof min === 'number' ? Math.max(min, parsed) : parsed)
        }
      }}
    />
  )
}
