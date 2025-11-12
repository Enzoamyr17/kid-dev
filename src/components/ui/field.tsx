"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface BaseFieldProps {
  className?: string
  disabled?: boolean
  placeholder?: string
  label?: React.ReactNode
  error?: string
}

interface TextFieldProps extends BaseFieldProps {
  type: "text"
  value?: string
  onChange?: (value: string) => void
}

interface TextareaFieldProps extends BaseFieldProps {
  type: "textarea"
  value?: string
  onChange?: (value: string) => void
  rows?: number
}

interface PasswordFieldProps extends BaseFieldProps {
  type: "password"
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
}

interface NumberFieldProps extends BaseFieldProps {
  type: "number"
  value?: number | string
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
}

interface DateFieldProps extends BaseFieldProps {
  type: "date"
  value?: Date
  onChange?: (value: Date | undefined) => void
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years"
  fromYear?: number
  toYear?: number
}

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends BaseFieldProps {
  type: "select"
  value?: string
  onChange?: (value: string) => void
  options: SelectOption[]
}

type FieldProps = TextFieldProps | TextareaFieldProps | PasswordFieldProps | NumberFieldProps | DateFieldProps | SelectFieldProps

export function Field(props: FieldProps) {
  const { className, disabled, placeholder, label, error } = props

  // Number field state (only initialized when type is number)
  const [internalValue, setInternalValue] = React.useState<string>("")
  const [isFocused, setIsFocused] = React.useState(false)
  const [selectOpen, setSelectOpen] = React.useState(false)

  // Date field state
  const [dateInputValue, setDateInputValue] = React.useState("")
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  // Format date to MM-DD-YYYY (using UTC to avoid timezone issues)
  const formatDateToInput = React.useCallback((date: Date | undefined) => {
    if (!date) return ""
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${month}-${day}-${year}`
  }, [])

  // Parse MM-DD-YYYY input to Date (at noon UTC to avoid timezone issues)
  const parseInputToDate = React.useCallback((input: string): Date | undefined => {
    const cleaned = input.replace(/[^\d-]/g, '')
    const parts = cleaned.split('-')

    if (parts.length === 3) {
      const month = parseInt(parts[0], 10)
      const day = parseInt(parts[1], 10)
      const year = parseInt(parts[2], 10)

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
        // Create date at noon UTC to avoid timezone shifting
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
        // Validate the date is real (e.g., not Feb 30)
        const testDate = new Date(year, month - 1, day)
        if (testDate.getMonth() === month - 1 && testDate.getDate() === day) {
          return date
        }
      }
    }
    return undefined
  }, [])

  // Sync external value to internal state when not focused (for number fields)
  React.useEffect(() => {
    if (props.type === "number" && !isFocused) {
      const value = props.type === "number" ? props.value : undefined
      const valueStr = value !== undefined && value !== "" && value !== 0
        ? value.toString()
        : ""
      setInternalValue(valueStr)
    }
  }, [props.type, props.value, isFocused])

  // Sync external date value to input (for date fields)
  React.useEffect(() => {
    if (props.type === "date") {
      setDateInputValue(formatDateToInput(props.value))
    }
  }, [props.type, props.value, formatDateToInput])

  const renderField = () => {
    if (props.type === "text") {
      return (
        <input
          type="text"
          value={props.value || ""}
          onChange={(e) => props.onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            error && "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-destructive",
            className
          )}
          aria-invalid={!!error}
        />
      )
    }

    if (props.type === "textarea") {
      return (
        <textarea
          value={props.value || ""}
          onChange={(e) => props.onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={props.rows || 4}
          className={cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            error && "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-destructive",
            className
          )}
          aria-invalid={!!error}
        />
      )
    }

    if (props.type === "password") {
      return (
        <input
          type="password"
          value={props.value || ""}
          onChange={(e) => props.onChange?.(e.target.value)}
          onBlur={props.onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            error && "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-destructive",
            className
          )}
          aria-invalid={!!error}
        />
      )
    }

    if (props.type === "number") {

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value

        // Allow empty string
        if (inputValue === "") {
          setInternalValue("")
          return
        }

        // Only allow numbers and decimal point (no minus sign for non-negative values)
        // If min is set and is negative, allow minus sign, otherwise don't
        const allowNegative = props.min !== undefined && props.min < 0
        const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/

        console.log('Field number input:', { inputValue, allowNegative, min: props.min, pattern })

        if (!pattern.test(inputValue)) {
          return
        }

        // Prevent multiple decimal points
        if ((inputValue.match(/\./g) || []).length > 1) {
          return
        }

        setInternalValue(inputValue)
      }

      const handleBlur = () => {
        setIsFocused(false)

        const inputValue = internalValue.trim()

        // Handle empty or invalid input
        if (inputValue === "" || inputValue === "-" || inputValue === ".") {
          setInternalValue("")
          props.onChange?.(0)
          return
        }

        const numValue = parseFloat(inputValue)

        if (!isNaN(numValue)) {
          // Apply min/max constraints
          let finalValue = numValue
          if (props.min !== undefined && finalValue < props.min) {
            finalValue = props.min
          }
          if (props.max !== undefined && finalValue > props.max) {
            finalValue = props.max
          }

          // Round to specified decimals if provided (optional constraint)
          if (props.decimals !== undefined) {
            finalValue = parseFloat(finalValue.toFixed(props.decimals))
          }

          props.onChange?.(finalValue)
          setInternalValue(finalValue.toString())
        } else {
          // Invalid number, reset to 0
          setInternalValue("")
          props.onChange?.(0)
        }
      }

      const handleFocus = () => {
        setIsFocused(true)
        // Set internal value to current prop value when focusing
        const valueStr = props.value !== undefined && props.value !== "" && props.value !== 0
          ? props.value.toString()
          : ""
        setInternalValue(valueStr)
      }

      return (
        <input
          type="text"
          inputMode="decimal"
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder || "0"}
          disabled={disabled}
          className={cn(
            "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            error && "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-destructive",
            className
          )}
          aria-invalid={!!error}
        />
      )
    }

    if (props.type === "date") {
      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setDateInputValue(value)

        // Try to parse and update if valid
        const parsedDate = parseInputToDate(value)
        if (parsedDate) {
          props.onChange?.(parsedDate)
        }
      }

      const handleInputBlur = () => {
        // If input is empty, set to current date at noon UTC
        if (!dateInputValue.trim()) {
          const now = new Date()
          const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0))
          props.onChange?.(today)
          setDateInputValue(formatDateToInput(today))
        } else {
          // Reformat to ensure consistency
          const parsedDate = parseInputToDate(dateInputValue)
          if (parsedDate) {
            setDateInputValue(formatDateToInput(parsedDate))
          } else {
            // Invalid date, revert to previous value or current date
            if (props.value) {
              setDateInputValue(formatDateToInput(props.value))
            } else {
              const now = new Date()
              const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0))
              props.onChange?.(today)
              setDateInputValue(formatDateToInput(today))
            }
          }
        }
      }

      return (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <div className="relative">
            <input
              type="text"
              value={dateInputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder={placeholder || formatDateToInput(new Date())}
              disabled={disabled}
              className={cn(
                "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent pl-3 pr-9 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                error && "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-destructive",
                className
              )}
              aria-invalid={!!error}
            />
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
          </div>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={props.value}
              onSelect={(date) => {
                if (date) {
                  // Normalize to noon UTC to avoid timezone issues
                  const normalizedDate = new Date(Date.UTC(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    12, 0, 0
                  ))
                  props.onChange?.(normalizedDate)
                } else {
                  props.onChange?.(date)
                }
                setPopoverOpen(false)
              }}
              captionLayout={props.captionLayout || "label"}
              fromYear={props.fromYear}
              toYear={props.toYear}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )
    }

    if (props.type === "select") {
      return (
        <Popover open={selectOpen} onOpenChange={setSelectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-between text-left font-normal h-9",
                !props.value && "text-muted-foreground",
                error && "border-destructive",
                className
              )}
              disabled={disabled}
            >
              <span>
                {props.value
                  ? props.options.find((opt) => opt.value === props.value)?.label
                  : placeholder || "Select..."}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="max-h-[300px] overflow-y-auto">
              {props.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    props.onChange?.(option.value)
                    setSelectOpen(false)
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                    props.value === option.value && "bg-accent"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )
    }

    return null
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      {renderField()}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
