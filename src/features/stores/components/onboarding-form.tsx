"use client";
import { useActionState, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { createStore } from "../actions";
import { THEME_PRESETS } from "@/features/themes/presets";
import type { PresetId } from "@/features/themes/theme-schema";
import { PhoneField } from "@/features/phone/phone-field";
const slugify=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60);
const STEPS=4;
export function OnboardingForm({host}:{host:string}){
  const [step,setStep]=useState(1);
  const [name,setName]=useState("");
  const [slug,setSlug]=useState("");
  const [slugTouched,setSlugTouched]=useState(false);
  const [preset,setPreset]=useState<PresetId>("elegant");
  const [phoneFilled,setPhoneFilled]=useState(false);
  const [state,action,pending]=useActionState(createStore,{});
  const preview=useMemo(()=>THEME_PRESETS[preset],[preset]);
  const slugError=state.fieldErrors?.slug?.[0]??(state.error?.includes("adresse")?state.error:undefined);
  return <form className="onboarding-card" action={action} onKeyDown={(e)=>{if(e.key==="Enter"&&step<STEPS&&(e.target as HTMLElement).tagName==="INPUT")e.preventDefault();}} onInput={(e)=>{const t=e.target as HTMLInputElement;if(t.type==="tel")setPhoneFilled(t.value.replace(/\D/g,"").length>=6);}}>
    <input type="hidden" name="presetId" value={preset}/>
    <input type="hidden" name="name" value={name}/>
    <input type="hidden" name="slug" value={slug}/>
    <div className="onboarding-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step} aria-label={`Étape ${step} sur ${STEPS}`}><span style={{width:`${step*(100/STEPS)}%`}}/></div>
    <p className="vf-eyebrow">Étape {step} sur {STEPS}</p>

    <section hidden={step!==1}>
      <h1>Comment s’appelle votre boutique ?</h1>
      <p className="muted">Le nom que vos clientes connaissent déjà. Vous pourrez le changer plus tard.</p>
      <label className="field"><span>Nom de la boutique</span><input autoFocus value={name} maxLength={80} onChange={e=>{setName(e.target.value);if(!slugTouched)setSlug(slugify(e.target.value));}} placeholder="Ex. : Awa Fashion" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(name.trim().length>=2)setStep(2);}}}/></label>
      <button type="button" className="vf-button" disabled={name.trim().length<2} onClick={()=>setStep(2)}>Continuer</button>
    </section>

    <section hidden={step!==2}>
      <h1>Votre lien de boutique</h1>
      <p className="muted">C’est le lien que vous partagerez sur WhatsApp, Instagram ou TikTok.</p>
      <label className="field onboarding-slug"><span>Adresse</span>
        <span className="onboarding-slug-row"><span className="onboarding-slug-host">{host}/store/</span><input value={slug} maxLength={60} onChange={e=>{setSlugTouched(true);setSlug(slugify(e.target.value));}} placeholder="awa-fashion" autoCapitalize="none" autoCorrect="off"/></span>
      </label>
      <p className="onboarding-link-preview">Votre lien : <strong>{host}/store/{slug||"…"}</strong></p>
      {slugError&&<p className="form-error" role="alert">{slugError}</p>}
      <div className="form-row"><button type="button" className="vf-button vf-button--ghost" onClick={()=>setStep(1)}>Retour</button><button type="button" className="vf-button" disabled={slug.length<3} onClick={()=>setStep(3)}>Continuer</button></div>
    </section>

    <section hidden={step!==3}>
      <h1>Choisissez votre style</h1>
      <p className="muted">Touchez un thème : il habille votre boutique. Vous pourrez en changer à tout moment.</p>
      <div className="preset-picker">{Object.values(THEME_PRESETS).map(theme=><button type="button" key={theme.id} onClick={()=>setPreset(theme.id)} aria-pressed={preset===theme.id} className={`preset-option ${preset===theme.id?"is-selected":""}`} style={{"--swatch":theme.tokens.colors.primary,"--paper":theme.tokens.colors.background} as CSSProperties}><span className="preset-swatch"/>{preset===theme.id&&<span className="preset-check" aria-hidden="true"><Check size={12}/></span>}<strong>{theme.label}</strong><small>{theme.mood}</small></button>)}</div>
      <div className="onboarding-preview" style={{background:preview.tokens.colors.background,color:preview.tokens.colors.text}}><span style={{color:preview.tokens.colors.primary}}>{name||"Votre boutique"}</span><strong style={{fontFamily:preview.tokens.typography.headingFont}}>Bienvenue chez {name||"vous"}</strong><button type="button" style={{background:preview.tokens.colors.primary}}>Voir les produits</button></div>
      <div className="form-row"><button type="button" className="vf-button vf-button--ghost" onClick={()=>setStep(2)}>Retour</button><button type="button" className="vf-button" onClick={()=>setStep(4)}>Continuer</button></div>
    </section>

    <section hidden={step!==4}>
      <h1>Où recevoir vos commandes ?</h1>
      <p className="muted">Quand une cliente commande, elle vous envoie le récapitulatif sur ce numéro WhatsApp. Sans lui, personne ne peut commander.</p>
      <PhoneField name="whatsapp" label="Votre numéro WhatsApp" required hint="Choisissez votre pays, puis tapez votre numéro comme d’habitude." error={state.fieldErrors?.whatsapp?.[0]} />
      {state.error&&!slugError&&<p className="form-error" role="alert">{state.error}</p>}
      {/* Submission happens here, so an error about an earlier step must be readable here too. */}
      {(slugError||state.fieldErrors?.name)&&<p className="form-error" role="alert">{slugError??state.fieldErrors?.name?.[0]} <button type="button" className="text-button" onClick={()=>setStep(slugError?2:1)}>Corriger</button></p>}
      <div className="form-row"><button type="button" className="vf-button vf-button--ghost" onClick={()=>setStep(3)}>Retour</button><button className="vf-button" disabled={pending||!phoneFilled}>{pending?"Création…":"Créer ma boutique"}</button></div>
    </section>
  </form>;
}
