// services/capacitorFileShare.ts
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Convierte ArrayBuffer a base64 para Filesystem.writeFile
 */
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

/**
 * Guarda un archivo binario (ArrayBuffer) en el device y abre el diálogo nativo para compartir.
 * filename debe incluir la extensión: "archivo.pdf" o "archivo.xlsx"
 */
export async function saveAndShareBinaryFile(fileName: string, arrayBuffer: ArrayBuffer) {
  try {
    const base64Data = arrayBufferToBase64(arrayBuffer);

    // Guardar en Documents (iOS/Android)
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    // Obtener la URI del archivo guardado
    const uriRes = await Filesystem.getUri({
      directory: Directory.Documents,
      path: fileName,
    });

    // uriRes.uri es el url local (file://...) que se puede compartir
    await Share.share({
      title: fileName,
      url: uriRes.uri,
    });

  } catch (err) {
    console.error('saveAndShareBinaryFile error', err);
    throw err;
  }
}

/**
 * Helpers específicos
 */
export const saveAndSharePdf = async (fileName: string, arrayBuffer: ArrayBuffer) => {
  return saveAndShareBinaryFile(fileName, arrayBuffer);
};

export const saveAndShareExcel = async (fileName: string, arrayBuffer: ArrayBuffer) => {
  return saveAndShareBinaryFile(fileName, arrayBuffer);
};