import imageCompression from "browser-image-compression";

/** Reduz a foto no aparelho antes de enviar: economiza dados e espaço no armazenamento gratuito. */
export async function compressPhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  try {
    const out = await imageCompression(file, {
      maxSizeMB: 0.9,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    });
    return new File([out], "foto.jpg", { type: "image/jpeg" });
  } catch {
    // Se a compressão falhar (formato raro), o servidor ainda redimensiona.
    return file;
  }
}

/** Miniatura (lado maior 400 px) gerada no aparelho: o Worker gratuito não tem biblioteca de imagem. */
export async function makeThumb(file) {
  try {
    const out = await imageCompression(file, {
      maxSizeMB: 0.06,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.75,
    });
    return new File([out], "mini.jpg", { type: "image/jpeg" });
  } catch {
    return null; // sem miniatura própria, o servidor usa a foto como miniatura
  }
}

/** Foto de perfil quadrada pequena (256 px): leve para guardar e rápida para carregar. */
export async function makeAvatar(file) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const out = await imageCompression(file, { maxSizeMB: 0.15, maxWidthOrHeight: 256, useWebWorker: true, fileType: "image/jpeg", initialQuality: 0.8 });
  return new File([out], "perfil.jpg", { type: "image/jpeg" });
}
