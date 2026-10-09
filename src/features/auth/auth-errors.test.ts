import { describe, expect, it } from "vitest";
import { ALREADY_REGISTERED, isUnreachable, SERVICE_UNREACHABLE, signUpErrorMessage } from "./auth-errors";

describe("isUnreachable", () => {
  it("reconnaît l’échec réseau tel que supabase-js le renvoie", () => {
    // La panne du 09/10/2026, mot pour mot : status 0, aucun code, « fetch failed ».
    expect(isUnreachable({ status: 0, message: "fetch failed" })).toBe(true);
    expect(isUnreachable({ message: "getaddrinfo ENOTFOUND projet.supabase.co" })).toBe(true);
    expect(isUnreachable({ message: "connect ECONNREFUSED 127.0.0.1:54321" })).toBe(true);
  });

  it("ne confond pas un refus métier avec une panne", () => {
    expect(isUnreachable({ code: "weak_password", status: 422, message: "Password is known to be weak" })).toBe(false);
    expect(isUnreachable({ code: "invalid_credentials", status: 400, message: "Invalid login credentials" })).toBe(false);
  });
});

describe("signUpErrorMessage", () => {
  it("dit que la panne est de notre côté quand la base est injoignable", () => {
    expect(signUpErrorMessage({ status: 0, message: "fetch failed" })).toBe(SERVICE_UNREACHABLE);
  });

  it("renvoie vers la connexion quand l’adresse est déjà inscrite", () => {
    expect(signUpErrorMessage({ code: "user_already_exists", status: 422, message: "User already registered" })).toBe(ALREADY_REGISTERED);
    // Les anciennes versions de GoTrue ne renvoient pas de code, seulement la phrase.
    expect(signUpErrorMessage({ message: "User already registered" })).toBe(ALREADY_REGISTERED);
  });

  it("nomme la vraie raison d’un mot de passe refusé", () => {
    const weak = (reasons: string[]) => signUpErrorMessage({ code: "weak_password", status: 422, message: "Password is known to be weak", reasons });
    expect(weak(["pwned"])).toMatch(/fuites de données/i);
    expect(weak(["characters"])).toMatch(/lettres, chiffres et symboles/i);
    expect(weak(["length"])).toMatch(/trop court/i);
    // Sans raison exploitable, on reste honnête plutôt que d’inventer une règle.
    expect(weak([])).toMatch(/trop facile à deviner/i);
  });

  it("dit que l’email de confirmation est en panne, pas le mot de passe", () => {
    const message = signUpErrorMessage({ code: "unexpected_failure", status: 500, message: "Error sending confirmation email" });
    expect(message).toMatch(/email de confirmation/i);
    expect(message).toMatch(/ne vient pas de votre mot de passe/i);
  });

  it("fait patienter sur une limite d’envoi plutôt que d’accuser l’adresse", () => {
    expect(signUpErrorMessage({ code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" })).toMatch(/patientez quelques minutes/i);
    expect(signUpErrorMessage({ status: 429, message: "Too many requests" })).toMatch(/patientez quelques minutes/i);
  });

  it("explique une inscription fermée et une adresse refusée", () => {
    expect(signUpErrorMessage({ code: "signup_disabled", status: 422, message: "Signups not allowed for this instance" })).toMatch(/inscriptions sont momentanément fermées/i);
    expect(signUpErrorMessage({ code: "email_address_invalid", status: 400, message: 'Email address "a@b.c" is invalid' })).toMatch(/adresse email est refusée/i);
  });

  it("reste vague sur une erreur inconnue sans laisser fuiter le détail technique", () => {
    const message = signUpErrorMessage({ code: "unexpected_failure", status: 500, message: "Database error saving new user" });
    expect(message).toMatch(/réessayez dans quelques minutes/i);
    expect(message).not.toMatch(/database|Database/);
  });
});
