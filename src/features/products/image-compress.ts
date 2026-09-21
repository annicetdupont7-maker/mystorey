/**
 * Phone photos weigh 3 to 8 MB. They used to be refused outright ("5 Mo maximum"), and
 * several of them together blew the upload limit — the most common reason a seller could
 * not add her first product. Photos are now shrunk in the browser before they leave the
 * phone: faster on a weak connection, and always under the server limits.
 */
export const MAX_PHOTOS = 8;
/** Vercel refuses request bodies above ~4.5 MB; stay well under it for the whole form. */
export const MAX_UPLOAD_TOTAL_BYTES = 4 * 1024 * 1024;

export function scaleToFit(width: number, height: number, maxSide: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      /* fall back to <img>, which some browsers decode more formats with */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function encode(source: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black in JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("encode");
  return blob;
}

/**
 * Returns a JPEG no larger than ~900 KB and 1600 px on its longest side. Throws when the
 * browser cannot read the file (for example a HEIC photo on a desktop browser).
 */
export async function compressImage(file: File, { maxSide = 1600, quality = 0.82, targetBytes = 900_000 } = {}): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) throw new Error("not-image");
  const image = await decode(file);
  try {
    const small = file.size <= targetBytes && Math.max(image.width, image.height) <= maxSide && ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (small) return file;
    let size = scaleToFit(image.width, image.height, maxSide);
    let blob = await encode(image.source, size.width, size.height, quality);
    if (blob.size > targetBytes) {
      size = scaleToFit(image.width, image.height, 1280);
      blob = await encode(image.source, size.width, size.height, 0.74);
    }
    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    image.release();
  }
}
