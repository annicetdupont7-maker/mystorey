"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ProductForm } from "./product-form";
import type { ProductPreview } from "./product-form";
import { formatPrice } from "@/features/storefront/storefront-types";

type CategoryRef = { id: string; name: string };
type ProductFormData = { id: string; name: string; note: string; description: string; price: number; imageUrl: string | null; isAvailable: boolean; isFeatured: boolean; categoryId: string | null };

export function ProductFormWithPreview({ storeId, categories, initialProduct }: { storeId: string; categories: CategoryRef[]; initialProduct?: ProductFormData }) {
  const [preview, setPreview] = useState<ProductPreview>({
    name: initialProduct?.name ?? "Titre du produit",
    price: initialProduct?.price ?? 0,
    imageUrl: initialProduct?.imageUrl ?? null,
    description: initialProduct?.description ?? "Description du produit",
    category: initialProduct?.categoryId ?? "",
    isAvailable: initialProduct?.isAvailable ?? true,
  });

  return (
    <div className="product-create-layout">
      {/* Left: Form */}
      <div className="product-create-form">
        <ProductForm
          storeId={storeId}
          categories={categories}
          product={initialProduct}
          onPreviewChange={setPreview}
        />
      </div>

      {/* Right: Live Preview */}
      <div className="product-create-preview">
        <div className="preview-header">
          <p className="vf-eyebrow">Aperçu en direct</p>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", fontWeight: 700 }}>Comment ça apparaît</p>
        </div>

        <div className="product-preview-card">
          {/* Product Image */}
          {preview.imageUrl ? (
            <img
              src={preview.imageUrl}
              alt={preview.name}
              className="product-preview-image"
              loading="lazy"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const placeholder = img.nextElementSibling as HTMLDivElement;
                if (placeholder) placeholder.style.display = "grid";
              }}
            />
          ) : null}
          <div
            className="product-preview-image-placeholder"
            style={{
              display: preview.imageUrl ? "none" : "grid",
            }}
          >
            📸
          </div>

          {/* Product Info */}
          <div className="product-preview-content">
            <h2 className="product-preview-name">{preview.name || "Titre du produit"}</h2>

            {preview.category && (
              <p className="product-preview-category">{categories.find((c) => c.id === preview.category)?.name || "Catégorie"}</p>
            )}

            <p className="product-preview-description">
              {preview.description || "Description du produit"}
            </p>

            <div className="product-preview-footer">
              <div className="product-preview-price">
                {preview.price > 0 ? formatPrice(preview.price) : "0 F"}
              </div>

              <button
                className="vf-button"
                disabled={!preview.isAvailable}
                style={{ opacity: preview.isAvailable ? 1 : 0.5, cursor: preview.isAvailable ? "pointer" : "not-allowed" }}
              >
                {preview.isAvailable ? "Ajouter au panier" : "Indisponible"}
              </button>
            </div>
          </div>
        </div>

        <p style={{ margin: "1.2rem 0 0", fontSize: "0.8rem", color: "var(--ink-soft)", fontStyle: "italic", textAlign: "center" }}>
          C&apos;est comme ça que vos clients verront ce produit
        </p>
      </div>
    </div>
  );
}
