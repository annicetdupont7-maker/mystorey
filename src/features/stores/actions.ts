"use server";
import { redirect } from "next/navigation";
import { onboardingSchema, storeIdentitySchema, storeSettingsSchema } from "./schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeThemeSchema } from "@/features/themes/theme-schema";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/features/products/schemas";
export type StoreActionState={error?:string;success?:string;fieldErrors?:Record<string,string[]>};
type StoreClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
const storeImageExtensionFor=(type:string)=>(type==="image/jpeg"?"jpg":type==="image/png"?"png":"webp");
async function uploadStoreImage(supabase:StoreClient,file:File,userId:string,purpose:"logo"|"cover"):Promise<{ok:true;url:string}|{ok:false;message:string}>{
  if(file.size>MAX_IMAGE_BYTES)return {ok:false,message:"Image trop lourde (5 Mo maximum)."};
  const allowed=ALLOWED_IMAGE_TYPES as readonly string[];
  if(!allowed.includes(file.type))return {ok:false,message:"Format d’image non accepté (JPEG, PNG ou WebP)."};
  const path=`${userId}/${purpose}-${crypto.randomUUID()}.${storeImageExtensionFor(file.type)}`;
  const {error}=await supabase.storage.from("store-images").upload(path,file,{contentType:file.type});
  if(error)return {ok:false,message:error.message==="Bucket not found"?"Le stockage d’images de boutique n’est pas activé.":"Impossible d’enregistrer l’image."};
  return {ok:true,url:supabase.storage.from("store-images").getPublicUrl(path).data.publicUrl};
}
export async function createStore(_:StoreActionState,formData:FormData):Promise<StoreActionState>{const parsed=onboardingSchema.safeParse({name:formData.get("name"),slug:formData.get("slug"),presetId:formData.get("presetId"),whatsapp:String(formData.get("whatsapp")??"")});if(!parsed.success)return {error:"Vérifiez les informations de votre boutique.",fieldErrors:parsed.error.flatten().fieldErrors};const supabase=await createSupabaseServerClient();const {data,error}=await supabase.rpc("create_store_with_theme",{store_name:parsed.data.name,store_slug:parsed.data.slug,theme_preset:parsed.data.presetId});if(error)return {error:error.code==="23505"?"Cette adresse de boutique est déjà utilisée. Choisissez-en une autre.":"Impossible de créer la boutique. Réessayez."};const whatsapp=parsed.data.whatsapp.trim();if(whatsapp){const {error:updateError}=await supabase.from("stores").update({whatsapp}).eq("id",data?.id);if(updateError)return {error:"Boutique créée, mais impossible d’enregistrer votre numéro WhatsApp."};}redirect("/dashboard");}
export async function saveStoreSettings(_:StoreActionState,formData:FormData):Promise<StoreActionState>{const id=String(formData.get("storeId")||"");const parsed=storeSettingsSchema.safeParse({name:formData.get("name"),description:String(formData.get("description")??""),whatsapp:String(formData.get("whatsapp")??"")});if(!parsed.success)return {error:"Vérifiez les informations de votre boutique.",fieldErrors:parsed.error.flatten().fieldErrors};const supabase=await createSupabaseServerClient();const {error}=await supabase.from("stores").update({name:parsed.data.name,description:parsed.data.description,whatsapp:parsed.data.whatsapp}).eq("id",id);if(error)return {error:"Impossible d’enregistrer les paramètres."};return {success:"Paramètres enregistrés."};}
export async function saveTheme(_:StoreActionState,formData:FormData):Promise<StoreActionState>{const id=String(formData.get("storeId")||"");const reset=formData.get("reset")==="true";let overrides:unknown={},layout:unknown={};if(!reset){try{overrides=JSON.parse(String(formData.get("overrides")||"{}"));layout=JSON.parse(String(formData.get("layout")||"{}"));}catch{return {error:"Configuration de thème invalide."};}}const parsed=storeThemeSchema.safeParse({preset_id:formData.get("presetId"),overrides,layout,version:1});if(!parsed.success)return {error:"Configuration de thème invalide."};const supabase=await createSupabaseServerClient();const {error}=await supabase.from("store_themes").update({preset_id:parsed.data.preset_id,overrides:parsed.data.overrides??{},layout:parsed.data.layout??{}}).eq("store_id",id);if(error)return {error:"Impossible d’enregistrer le thème."};if(formData.get("publish")==="true"){const {error:publishError}=await supabase.from("stores").update({status:"published"}).eq("id",id);if(publishError)return {error:"Thème enregistré, mais publication impossible."};}return {success:formData.get("publish")==="true"?"Thème publié.":reset?"Thème réinitialisé.":"Aperçu enregistré."};}
export async function publishStore(storeId:string){const supabase=await createSupabaseServerClient();const {error}=await supabase.from("stores").update({status:"published"}).eq("id",storeId);if(error)throw new Error("Impossible de publier la boutique.");}
export async function saveStoreIdentity(_:StoreActionState,formData:FormData):Promise<StoreActionState>{
  const id=String(formData.get("storeId")||"");
  const parsed=storeIdentitySchema.safeParse({name:formData.get("name"),slogan:String(formData.get("slogan")??""),description:String(formData.get("description")??""),whatsapp:String(formData.get("whatsapp")??"")});
  if(!parsed.success)return {error:"Vérifiez les informations de votre boutique.",fieldErrors:parsed.error.flatten().fieldErrors};
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {error:"Session expirée. Reconnectez-vous."};
  const removeLogo=formData.get("removeLogo")==="true";
  const removeCover=formData.get("removeCover")==="true";
  let logo_url:string|null|undefined=undefined;
  let cover_url:string|null|undefined=undefined;
  const logoFile=formData.get("logo");
  if(logoFile instanceof File&&logoFile.size>0){const uploaded=await uploadStoreImage(supabase,logoFile,user.id,"logo");if(!uploaded.ok)return {error:uploaded.message};logo_url=uploaded.url;}
  else if(removeLogo)logo_url=null;
  const coverFile=formData.get("cover");
  if(coverFile instanceof File&&coverFile.size>0){const uploaded=await uploadStoreImage(supabase,coverFile,user.id,"cover");if(!uploaded.ok)return {error:uploaded.message};cover_url=uploaded.url;}
  else if(removeCover)cover_url=null;
  const payload:Partial<Record<string,unknown>>={name:parsed.data.name,slogan:parsed.data.slogan,description:parsed.data.description,whatsapp:parsed.data.whatsapp};
  if(logo_url!==undefined)payload.logo_url=logo_url;
  if(cover_url!==undefined)payload.cover_url=cover_url;
  const {error}=await supabase.from("stores").update(payload).eq("id",id);
  if(error)return {error:"Impossible d’enregistrer l’identité de votre boutique."};
  return {success:"Identité de la boutique enregistrée ✓"};
}
