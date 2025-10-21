"use client"

import * as React from "react"
import { format } from "date-fns"
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

        // Only allow numbers, decimal point, and minus sign
        if (!/^-?\d*\.?\d*$/.test(inputValue)) {
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
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-9",
                !props.value && "text-muted-foreground",
                error && "border-destructive",
                className
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {props.value ? format(props.value, "PPP") : <span>{placeholder || "Pick a date"}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={props.value}
              onSelect={props.onChange}
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
