import { AuthForm } from "@/features/auth/components/auth-form";
export const dynamic = "force-dynamic";
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;reset?:string}>}){const {error,reset}=await searchParams;return <main className="auth-page"><AuthForm mode="login" callbackError={error==="auth"} resetSuccess={reset==="success"}/></main>}