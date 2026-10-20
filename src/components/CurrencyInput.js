"use client";

export default function CurrencyInput({
  value,
  onValueChange,
  className,
  placeholder = "0",
  required,
  id,
  ariaInvalid,
  ariaDescribedBy,
}) {
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, "");
    onValueChange(digits);
  }

  const display = value ? Number(value).toLocaleString("id-ID") : "";

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      required={required}
      value={display}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      aria-invalid={ariaInvalid || undefined}
      aria-describedby={ariaDescribedBy}
    />
  );
}
