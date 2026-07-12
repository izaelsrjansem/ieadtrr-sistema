import { useMemo, useState } from 'react'
import { boaVistaNeighborhoods } from '../data/church'

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function OptionsCombobox({
  value,
  onChange,
  className,
  options,
  placeholder = 'Digite para buscar',
  emptyText = 'Nenhum item encontrado',
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  options: string[]
  placeholder?: string
  emptyText?: string
}) {
  const [open, setOpen] = useState(false)
  const normalizedValue = normalizeSearch(value)
  const filteredOptions = useMemo(() => {
    if (!normalizedValue) {
      return options
    }

    return options.filter((option) => normalizeSearch(option).includes(normalizedValue))
  }, [normalizedValue, options])

  return (
    <div className="neighborhood-combobox">
      <input
        className={className}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        value={value}
      />
      {open ? (
        <div className="neighborhood-options">
          {filteredOptions.length > 0 ? (
            filteredOptions.slice(0, 12).map((option) => (
              <button
                key={option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                type="button"
              >
                {option}
              </button>
            ))
          ) : (
            <span>{emptyText}</span>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function NeighborhoodCombobox({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <OptionsCombobox
      className={className}
      emptyText="Nenhum bairro encontrado"
      onChange={onChange}
      options={boaVistaNeighborhoods}
      placeholder="Digite para buscar o bairro"
      value={value}
    />
  )
}
