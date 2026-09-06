import type { PresetId, ThemeTokens } from "./theme-schema";

type Preset = { id: PresetId; label: string; mood: string; tokens: ThemeTokens };

const base = (
  colors: ThemeTokens["colors"],
  headingFont: string,
  bodyFont: string,
  radius: number,
  buttonStyle: ThemeTokens["components"]["buttonStyle"],
  cardStyle: ThemeTokens["components"]["cardStyle"],
  layout: ThemeTokens["layout"],
  headingTracking = "-0.02em",
): ThemeTokens => ({
  colors,
  typography: { headingFont, bodyFont, headingTracking },
  components: {
    buttonStyle,
    cardStyle,
    radius,
    shadow:
      cardStyle === "elevated" ? "0 14px 34px rgba(21,25,31,.13)" :
      cardStyle === "outlined" ? "none" : "none",
  },
  layout,
});

export const THEME_PRESETS: Record<PresetId, Preset> = {
  elegant: {
    id: "elegant", label: "Boutique Atelier", mood: "Pièces uniques, matières et récit éditorial",
    tokens: base(
      { primary: "#8D4156", secondary: "#342C32", accent: "#D49A72", background: "#FFF8F2", surface: "#FFFFFF", text: "#2D252B" },
      "Georgia, 'Palatino Linotype', serif", "'Segoe UI', Roboto, Arial, sans-serif", 16, "soft", "elevated",
      { catalogLayout: "grid", columns: 3, headerStyle: "editorial", heroVariant: "editorial", spacing: "airy" }, "-0.02em",
    ),
  },
  minimal: {
    id: "minimal", label: "Marché Moderne", mood: "Concept-store clair, rapide et commercial",
    tokens: base(
      { primary: "#1E2933", secondary: "#53616C", accent: "#8DB3A3", background: "#FAFAF8", surface: "#FFFFFF", text: "#17202A" },
      "'Segoe UI', Arial, sans-serif", "'Segoe UI', Arial, sans-serif", 6, "sharp", "outlined",
      { catalogLayout: "grid", columns: 4, headerStyle: "classic", heroVariant: "compact", spacing: "comfortable" }, "-0.035em",
    ),
  },
  luxury: {
    id: "luxury", label: "Maison & Beauté", mood: "Sensoriel, lumineux et délicatement premium",
    tokens: base(
      { primary: "#B89353", secondary: "#8C7A56", accent: "#EEE0BF", background: "#15120F", surface: "#24201D", text: "#F8F1E7" },
      "Georgia, 'Times New Roman', serif", "'Segoe UI', Georgia, serif", 2, "sharp", "outlined",
      { catalogLayout: "grid", columns: 3, headerStyle: "centered", heroVariant: "featured", spacing: "airy" }, "-0.015em",
    ),
  },
  modern: {
    id: "modern", label: "MYSTOREY", mood: "Chaleur éditoriale, terre cuite et récit de marque",
    tokens: base(
      { primary: "#7B3048", secondary: "#7B3048", accent: "#7B3048", background: "#FFF9F3", surface: "#FFFFFF", text: "#241B1B" },
      "Georgia, 'Times New Roman', serif", "'Segoe UI', Arial, sans-serif", 14, "soft", "elevated",
      { catalogLayout: "grid", columns: 3, headerStyle: "classic", heroVariant: "split", spacing: "comfortable" }, "-0.04em",
    ),
  },
  bold: {
    id: "bold", label: "Street & Bold", mood: "Contraste franc, rythme urbain et caractère",
    tokens: base(
      { primary: "#FF3D00", secondary: "#13111A", accent: "#D8FF36", background: "#FFF0E8", surface: "#FFFFFF", text: "#15131C" },
      "Impact, 'Arial Black', sans-serif", "Arial, sans-serif", 0, "sharp", "outlined",
      { catalogLayout: "grid", columns: 3, headerStyle: "editorial", heroVariant: "banner", spacing: "compact" }, "-0.01em",
    ),
  },
  natural: {
    id: "natural", label: "Douceur", mood: "Blush, burgundy et gestes délicats",
    tokens: base(
      { primary: "#557155", secondary: "#35483A", accent: "#C77F54", background: "#F6F1E6", surface: "#FFFDF7", text: "#2B382D" },
      "Georgia, 'Trebuchet MS', serif", "'Trebuchet MS', 'Segoe UI', sans-serif", 24, "soft", "flat",
      { catalogLayout: "list", columns: 2, headerStyle: "classic", heroVariant: "editorial", spacing: "airy" }, "-0.02em",
    ),
  },
  colorful: {
    id: "colorful", label: "Éclat Pop", mood: "Joyeux, expressif et pensé pour les nouveautés",
    tokens: base(
      { primary: "#7547E8", secondary: "#193D85", accent: "#FF9A3D", background: "#F8F5FF", surface: "#FFFFFF", text: "#1D1D42" },
      "'Trebuchet MS', 'Segoe UI', sans-serif", "'Trebuchet MS', 'Segoe UI', sans-serif", 16, "pill", "elevated",
      { catalogLayout: "grid", columns: 3, headerStyle: "centered", heroVariant: "compact", spacing: "comfortable" }, "-0.03em",
    ),
  },
};