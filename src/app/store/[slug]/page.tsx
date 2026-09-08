import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveStoreTheme, themeCssVariables } from "@/features/themes/resolve-theme";
import { Storefront } from "@/features/storefront/components";
import { toProductView } from "@/features/storefront/storefront-types";
export const dynamic="force-dynamic";
export default async function PublicStorePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=await createSupabaseServerClient();
  const {data:store}=await supabase.from("stores").select("id,name,slug,description,status,whatsapp,cover_url,logo_url,slogan").eq("slug",slug).maybeSingle();
  if(!store)notFound();
  if(store.status!=="published"){
    return <main className="store-coming-soon"><div className="store-coming-soon-card"><span className="store-logo-mark">V</span><h1>{store.name}</h1><p>Cette boutique n’est pas encore publique. Revenez très bientôt.</p></div></main>;
  }
  const {data:products}=await supabase.from("products").select("id,name,note,description,price,image_url,is_featured,category_id").eq("store_id",store.id).eq("is_available",true).order("created_at",{ascending:false});
  const {data:media}=await supabase.from("product_media").select("id,product_id,public_url,position").in("product_id",(products??[]).map((product)=>product.id)).order("position");
  const mediaByProduct=new Map<string, {id:string;public_url:string;position:number}[]>();
  for(const item of media??[]){const list=mediaByProduct.get(item.product_id)??[];list.push({id:item.id,public_url:item.public_url,position:item.position});mediaByProduct.set(item.product_id,list);}
  const {data:categories}=await supabase.from("categories").select("id,name").eq("store_id",store.id).order("name",{ascending:true});
  const {data:theme}=await supabase.from("store_themes").select("preset_id,overrides,layout,version").eq("store_id",store.id).maybeSingle();
  const {tokens}=resolveStoreTheme(theme??{preset_id:"modern",version:1});
  return <div style={themeCssVariables(tokens)}><Storefront tokens={tokens} products={(products??[]).map((product)=>toProductView({...product,product_media:mediaByProduct.get(product.id)??[]}))} categories={(categories??[]).map((c)=>({id:c.id,name:c.name}))} storeName={store.name} description={store.description} whatsapp={store.whatsapp ?? ""} coverUrl={store.cover_url ?? ""} slug={store.slug}/></div>;
}