"use client";
import { useActionState, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createStore } from "../actions";
import { THEME_PRESETS } from "@/features/themes/presets";
import type { PresetId } from "@/features/themes/theme-schema";
const slugify=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
export function OnboardingForm(){
  const [step,setStep]=useState(1);
  const [name,setName]=useState("");
  const [slug,setSlug]=useState("");
  const [whatsapp,setWhatsapp]=useState("");
  const [preset,setPreset]=useState<PresetId>("elegant");
  const [state,action,pending]=useActionState(createStore,{});
  const preview=useMemo(()=>THEME_PRESETS[preset],[preset]);
  return <form className="onboarding-card" action={action}>
    <input type="hidden" name="presetId" value={preset}/>
    <div className="onboarding-progress"><span style={{width:`${step*25}%`}}/></div>
    {step===1&&<section>
      <p className="vf-eyebrow">Étape 1 sur 4</p>
      <h1>Bienvenue sur VendoFlow 👋</h1>
      <p className="muted">Comment pouvons-nous appeler votre boutique ?</p>
      <label className="field"><span>Nom de la boutique</span><input autoFocus value={name} onChange={e=>{setName(e.target.value);setSlug(slugify(e.target.value));}} placeholder="Amina Fashion"/></label>
      <button type="button" className="vf-button" disabled={name.trim().length<2} onClick={()=>setStep(2)}>Continuer</button>
    </section>}
    {step===2&&<section>
      <p className="vf-eyebrow">Étape 2 sur 4</p>
      <h1>Choisissez votre adresse.</h1>
      <p className="muted">Elle deviendra votre lien public VendoFlow.</p>
      <label className="field"><span>vendoflow.com/store/</span><input name="slug" value={slug} onChange={e=>setSlug(slugify(e.target.value))} placeholder="amina-fashion"/></label>
      {state.fieldErrors?.slug&&<p className="form-error">{state.fieldErrors.slug[0]}</p>}
      <div className="form-row"><button type="button" className="vf-button vf-button--ghost" onClick={()=>setStep(1)}>Retour</button><button type="button" className="vf-button" disabled={slug.length<3} onClick={()=>setStep(3)}>Continuer</button></div>
    </section>}
    {step===3&&<section>
      <p className="vf-eyebrow">Étape 3 sur 4</p>
      <h1>Choisissez votre style.</h1>
      <p className="muted">Vous pourrez tout ajuster plus tard.</p>
      <div className="preset-picker">{Object.values(THEME_PRESETS).map(theme=><button type="button" key={theme.id} onClick={()=>setPreset(theme.id)} className={`preset-option ${preset===theme.id?"is-selected":""}`} style={{"--swatch":theme.tokens.colors.primary,"--paper":theme.tokens.colors.background} as CSSProperties}><span className="preset-swatch"/><strong>{theme.label}</strong><small>{theme.mood}</small></button>)}</div>
      <div className="form-row"><button type="button" className="vf-button vf-button--ghost" onClick={()=>setStep(2)}>Retour</button><button type="button" className="vf-button" onClick={()=>setStep(4)}>Voir ma boutique</button></div>
    </section>}
    {step===4&&<section>
      <p className="vf-eyebrow">Étape 4 sur 4</p>
      <h1>Votre boutique est prête 🎉</h1>
      <p className="muted">Dernière étape : indiquez le numéro WhatsApp qui recevra vos commandes.</p>
      <label className="field"><span>Numéro WhatsApp (recommandé)</span><input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="+237 6 90 00 00 00"/><small className="field-hint">Sans numéro, vos clients ne pourront pas commander. Il reste modifiable dans vos paramètres.</small></label>
      {state.fieldErrors?.whatsapp&&<p className="form-error">{state.fieldErrors.whatsapp[0]}</p>}
      <div className="onboarding-preview" style={{background:preview.tokens.colors.background,color:preview.tokens.colors.text}}><span style={{color:preview.tokens.colors.primary}}>Maison {name||"Vendo"}</span><strong style={{fontFamily:preview.tokens.typography.headingFont}}>Votre histoire commence ici.</strong><button type="button" style={{background:preview.tokens.colors.primary}}>Voir la collection</button></div>
      <input type="hidden" name="name" value={name}/>
      <input type="hidden" name="slug" value={slug}/>
      <input type="hidden" name="whatsapp" value={whatsapp}/>
      {state.error&&<p className="form-error" role="alert">{state.error}</p>}
      <div className="form-row"><button type="button" className="vf-button vf-button--ghost" onClick={()=>setStep(3)}>Retour</button><button className="vf-button" disabled={pending}>{pending?"Création…":"Accéder à mon espace vendeur"}</button></div>
    </section>}
  </form>;
}