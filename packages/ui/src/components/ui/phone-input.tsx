"use client";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { ChevronDown } from "lucide-react";
import type { Country, Value } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

// Import logic from the safe minified entry point
// Use libphonenumber-js instead of the problematic react-phone-number-input/min
import { getCountryCallingCode as getCallingCode } from "libphonenumber-js";
const getCountryCallingCode = (country: Country) => getCallingCode(country);

import { cn } from "../../lib/utils";

import "react-phone-number-input/style.css";

interface PhoneInputProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	defaultCountry?: Country;
}

export function PhoneInput({
	value,
	onChange,
	placeholder = "Enter phone number",
	className,
	disabled,
	defaultCountry = "IN",
}: PhoneInputProps) {
	const [defaultCountryCode, setDefaultCountryCode] =
		useState<Country>(defaultCountry);
	const [PhoneInputWithCountry, setPhoneInputWithCountry] =
		useState<React.ElementType | null>(null);

	useEffect(() => {
		import("react-phone-number-input").then((mod) => {
			setPhoneInputWithCountry(() => mod.default);
		});
	}, []);

	const customInputComponent = useMemo(() => {
		return ({
			value: inputValue,
			onChange: onInputChange,
			ref,
			...props
		}: React.InputHTMLAttributes<HTMLInputElement> & {
			value?: string;
			onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
			ref?: React.Ref<HTMLInputElement>;
		}) => {
			const callingCode = getCountryCallingCode(defaultCountryCode);
			const prefix = `+${callingCode}`;

			// Aggressively strip both international and national prefixes for display
			let displayValue = (inputValue as string) || "";
			if (displayValue.startsWith(prefix)) {
				displayValue = displayValue.slice(prefix.length).trim();
			}
			if (defaultCountryCode === "IN" && displayValue.startsWith("0")) {
				displayValue = displayValue.slice(1);
			}

			return (
				<input
					{...props}
					ref={ref}
					value={displayValue}
					onChange={onInputChange}
				/>
			);
		};
	}, [defaultCountryCode]);

	if (!PhoneInputWithCountry) {
		return (
			<div
				className={cn(
					"h-[52px] w-full bg-[var(--surface-container-low)] animate-pulse rounded-[var(--r-sm)]",
					className,
				)}
			/>
		);
	}

	return (
		<div className={cn("phone-input-container w-full", className)}>
			<style>{`
        .phone-input-container .PhoneInput {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--surface-container-low);
          padding: 0;
          border-radius: var(--r-sm);
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          height: 52px;
          overflow: hidden;
        }
        .phone-input-container .PhoneInput:focus-within {
          background: var(--surface-container-lowest);
          border-bottom-color: var(--primary);
          box-shadow: var(--shadow-sm);
        }
        .phone-input-container .PhoneInputInput {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--on-surface);
          font-size: 0.9rem;
          font-weight: 500;
          font-family: inherit;
          padding: 0 1rem;
          height: 100%;
        }
        .phone-input-container .PhoneInputInput::placeholder {
          color: var(--on-surface-variant);
          font-weight: 400;
        }
        .phone-input-container .PhoneInputCountry {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          position: relative;
          padding: 0 1rem;
          border-right: 1px solid var(--outline-variant);
          background: var(--surface-container-low);
          height: 100%;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .phone-input-container .PhoneInput:focus-within .PhoneInputCountry {
          background: var(--surface-container-lowest);
        }
        .phone-input-container .PhoneInputCountrySelect {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 10;
        }
        .phone-input-container .PhoneInputCountryIcon {
          width: 1.5rem;
          height: auto;
          border-radius: 2px;
          box-shadow: 0 0 0 1px var(--outline-variant);
          flex-shrink: 0;
        }
        .phone-input-container .PhoneInputCountrySelectArrow {
          display: none;
        }
        /* Custom calling code display */
        .phone-input-container .country-selection-info {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--on-surface);
          white-space: nowrap;
        }
      `}</style>
			<PhoneInputWithCountry
				international={false}
				defaultCountry={defaultCountryCode}
				onCountryChange={setDefaultCountryCode}
				value={value as Value}
				onChange={(val: Value | undefined) => onChange?.(val || "")}
				placeholder={placeholder}
				disabled={disabled}
				countrySelectComponent={CustomCountrySelect}
				inputComponent={customInputComponent}
			/>
		</div>
	);
}

interface CountrySelectOption {
	value?: Country;
	label: string;
}

interface CustomCountrySelectProps {
	value?: Country;
	onChange: (value?: Country) => void;
	options: CountrySelectOption[];
	disabled?: boolean;
}

function CustomCountrySelect({
	value,
	onChange,
	options,
	disabled,
}: CustomCountrySelectProps) {
	const selectedOption = options.find((o) => o.value === value);
	const callingCode = value ? getCountryCallingCode(value) : "";
	const FlagIcon = value ? flags[value] : null;

	return (
		<div className="PhoneInputCountry">
			<select
				className="PhoneInputCountrySelect"
				value={value || ""}
				onChange={(event: ChangeEvent<HTMLSelectElement>) =>
					onChange((event.target.value as Country) || undefined)
				}
				disabled={disabled}
			>
				{options.map((option) => (
					<option key={option.value || "ZZ"} value={option.value || ""}>
						{option.label}{" "}
						{option.value && `+${getCountryCallingCode(option.value)}`}
					</option>
				))}
			</select>

			{/* Visual representation */}
			{FlagIcon && (
				<div className="PhoneInputCountryIcon">
					<FlagIcon title={selectedOption?.label || ""} />
				</div>
			)}

			<div className="country-selection-info">
				{callingCode && (
					<span className="text-[var(--primary)]">+{callingCode}</span>
				)}
				<ChevronDown size={14} className="opacity-55" />
			</div>
		</div>
	);
}
