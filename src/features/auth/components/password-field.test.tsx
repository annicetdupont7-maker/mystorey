import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasswordField } from "./password-field";
describe("PasswordField",()=>{
  afterEach(cleanup);
  const inputSelector = { selector: "input" as const };
  it("masks the password by default and exposes a show toggle",()=>{render(<PasswordField label="Mot de passe" name="password" autoComplete="new-password"/>);expect(screen.getByLabelText("Mot de passe",inputSelector)).toHaveAttribute("type","password");expect(screen.getByRole("button",{name:"Afficher le mot de passe"})).toBeInTheDocument()});
  it("reveals the password then hides it via the eye toggle",()=>{render(<PasswordField label="Mot de passe" name="password" autoComplete="new-password"/>);const input=screen.getByLabelText("Mot de passe",inputSelector);fireEvent.click(screen.getByRole("button",{name:"Afficher le mot de passe"}));expect(input).toHaveAttribute("type","text");fireEvent.click(screen.getByRole("button",{name:"Masquer le mot de passe"}));expect(input).toHaveAttribute("type","password")});
});
describe("PasswordField, règle de longueur",()=>{
  afterEach(cleanup);
  it("pose minLength seulement quand on le lui demande",()=>{
    const { unmount }=render(<PasswordField label="Mot de passe" name="password" autoComplete="current-password"/>);
    expect(screen.getByLabelText("Mot de passe",{selector:"input"})).not.toHaveAttribute("minLength");
    unmount();
    render(<PasswordField label="Nouveau mot de passe" name="password" autoComplete="new-password" minLength={8}/>);
    expect(screen.getByLabelText("Nouveau mot de passe",{selector:"input"})).toHaveAttribute("minLength","8");
  });
  it("garde ce qui est tapé, pour qu'un refus ne vide pas le champ",()=>{
    render(<PasswordField label="Mot de passe" name="password" autoComplete="new-password"/>);
    const input=screen.getByLabelText("Mot de passe",{selector:"input"});
    fireEvent.change(input,{target:{value:"Boutique2026!"}});
    expect(input).toHaveValue("Boutique2026!");
  });
});
