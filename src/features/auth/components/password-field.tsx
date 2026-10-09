"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
/**
 * Champ contrôlé à dessein : React réinitialise les champs non contrôlés d'un
 * formulaire après une action serveur, donc le mot de passe s'effaçait à chaque
 * refus et il fallait le retaper au doigt sur un téléphone. Vu de la vendeuse, le
 * formulaire avait l'air de refuser son mot de passe sans rien expliquer.
 *
 * `minLength` dit « trop court » sur place, sans aller-retour serveur. Il n'est
 * posé que là où la règle s'applique vraiment : à la création et au changement de
 * mot de passe, jamais à la connexion, où un ancien compte peut être plus court.
 */
export function PasswordField({label,name,autoComplete,error,minLength}:{label:string;name:string;autoComplete:string;error?:string;minLength?:number}){
  const [visible,setVisible]=useState(false);
  const [value,setValue]=useState("");
  const id=name;
  return <div className="field"><label htmlFor={id}>{label}</label><span className="password-wrap"><input required name={name} id={id} type={visible?"text":"password"} value={value} onChange={(event)=>setValue(event.target.value)} minLength={minLength} autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="password-input" aria-invalid={error?true:undefined} aria-describedby={error?`${id}-error`:undefined}/><button type="button" className="password-toggle" aria-label={visible?"Masquer le mot de passe":"Afficher le mot de passe"} onClick={()=>setVisible((v)=>!v)}>{visible?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button></span>{error&&<small className="field-error" id={`${id}-error`}>{error}</small>}</div>;
}
