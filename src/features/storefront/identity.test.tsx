import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Storefront } from "./components";
import { demoProducts } from "./storefront-types";
import { resolveStoreTheme } from "@/features/themes/resolve-theme";

afterEach(cleanup);

const { tokens } = resolveStoreTheme({ preset_id: "elegant", version: 1 });

describe("Storefront identity", () => {
  it("shows slogan, description and logo on the public storefront", () => {
    render(
      <Storefront
        tokens={tokens}
        products={demoProducts}
        storeName="Maison Naya"
        slogan="Des pièces qui vous ressemblent."
        description="Notre histoire commence à Abidjan."
        logoUrl="/logo.png"
        coverUrl="/cover.jpg"
        whatsapp="+2250700000000"
        slug="maison-naya"
      />,
    );
    expect(screen.getAllByText("Des pièces qui vous ressemblent.").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "À propos de Maison Naya" })).toBeInTheDocument();
    expect(screen.getAllByText("Notre histoire commence à Abidjan.").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  it("omits the à-propos section and shows the initials placeholder when no description or logo", () => {
    render(<Storefront tokens={tokens} products={demoProducts} storeName="Maison Naya" slug="maison-naya" />);
    expect(screen.queryByRole("heading", { name: /À propos de/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("M").length).toBeGreaterThan(0);
  });
});
