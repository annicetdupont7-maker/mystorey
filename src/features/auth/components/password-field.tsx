"use client";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordField({label,name,autoComplete,error}:{label:string;name:string;autoComplete:string;error?:string}){
  const [visible,setVisible]=useState(false);
  const id=useId();
  return <div className="field"><label htmlFor={id}>{label}</label><span className="password-wrap"><input required name={name} id={id} type={visible?"text":"password"} autoComplete={autoComplete} className="password-input" aria-invalid={error?true:undefined} aria-describedby={error?`${id}-error`:undefined}/><button type="button" className="password-toggle" aria-label={visible?"Masquer le mot de passe":"Afficher le mot de passe"} onClick={()=>setVisible((v)=>!v)}>{visible?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button></span>{error&&<small id={`${id}-error`}>{error}</small>}</div>;
}