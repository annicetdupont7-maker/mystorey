import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemePreview } from "./theme-preview";
describe("ThemePreview",()=>{it("renders the active storefront theme",()=>{render(<ThemePreview/>);expect(screen.getByText("Maison Naya")).toBeInTheDocument();expect(screen.getByRole("tab",{name:"Boutique Atelier"})).toHaveAttribute("aria-selected","true");});});
