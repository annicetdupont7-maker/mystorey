"use client";
import { useState } from "react";
import { COUNTRIES, joinPhone, splitPhone } from "./phone";

/**
 * Country picker + local number. The form receives the joined international number
 * under `name`, exactly the format the server validates.
 */
export function PhoneField({ name, label, defaultValue, defaultCountry, required, hint, error, id, placeholder = "97 00 00 00" }: {
  name: string;
  label: string;
  defaultValue?: string | null;
  defaultCountry?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  id?: string;
  placeholder?: string;
}) {
  const initial = splitPhone(defaultValue, defaultCountry);
  const [code, setCode] = useState(initial.code);
  const [local, setLocal] = useState(initial.local);
  const inputId = id ?? `${name}-local`;
  const value = joinPhone(code, local);
  return (
    <div className="field phone-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="phone-row">
        <select aria-label="Pays" value={code} onChange={(e) => setCode(e.target.value)} className="phone-country">
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} +{c.code} · {c.name}</option>)}
        </select>
        <input id={inputId} type="tel" inputMode="tel" autoComplete="tel-national" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} required={required} aria-invalid={error ? true : undefined} />
      </div>
      <input type="hidden" name={name} value={value} />
      {error ? <small className="field-error">{error}</small> : hint ? <small className="field-hint">{hint}</small> : null}
      {value && !error && <small className="field-hint phone-preview">Numéro enregistré : {value}</small>}
    </div>
  );
}
