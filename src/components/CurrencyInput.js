"use client";

export default function CurrencyInput({
  value,
  onValueChange,
  className,
  placeholder = "0",
  required,
}) {
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, "");
    onValueChange(digits);
  }

  const display = value ? Number(value).toLocaleString("id-ID") : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      required={required}
      value={display}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
}
