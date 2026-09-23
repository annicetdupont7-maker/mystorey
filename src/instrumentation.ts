import type { Instrumentation } from "next";

/**
 * Toute erreur serveur non rattrapée passe ici : rendu d'une page, action de
 * formulaire, route webhook. Sans ce fichier, une vendeuse voyait « une erreur
 * est survenue » et nous n'en savions rien.
 *
 * L'erreur est écrite sur une seule ligne JSON, préfixée `[mystorey-error]` :
 * les logs Vercel (Observability > Logs) se filtrent sur ce préfixe, et le jour
 * où un Sentry est branché, c'est le seul endroit à changer.
 *
 * Rien n'est envoyé à l'extérieur : pas de compte tiers à ouvrir, pas de donnée
 * cliente qui sort. Seuls le chemin, le type de route et le message partent.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  console.error(
    "[mystorey-error]",
    JSON.stringify({
      message,
      digest,
      path: request.path,
      method: request.method,
      route: context.routePath,
      type: context.routeType,
      at: new Date().toISOString(),
    }),
  );
  if (error instanceof Error && error.stack) console.error(error.stack);
};
