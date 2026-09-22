import { z } from "zod";

export const FEEDBACK_KINDS = ["problem", "suggestion", "help"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_STATUSES = ["new", "in_progress", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  problem: "Signaler un problème",
  suggestion: "Proposer une idée",
  help: "Demander de l’aide",
};
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  resolved: "Traité",
};

export const feedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS, { message: "Choisissez le type de message." }),
  message: z.string().trim().min(5, "Décrivez en quelques mots (5 caractères minimum).").max(2000, "2000 caractères maximum."),
  contact: z.string().trim().max(120, "120 caractères maximum.").optional().default(""),
  page: z.string().trim().max(200).optional().default(""),
});

export const feedbackStatusSchema = z.object({
  id: z.string().uuid("Message introuvable."),
  status: z.enum(FEEDBACK_STATUSES),
  adminNote: z.string().trim().max(2000, "2000 caractères maximum.").optional().default(""),
});

export type FeedbackActionState = { error?: string; success?: string; successId?: number; fieldErrors?: Record<string, string[]> };

/** Support address shown when the in-app channel is unavailable. */
export const SUPPORT_EMAIL = "mystorey.support@gmail.com";
