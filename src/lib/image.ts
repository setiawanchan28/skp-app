/**
 * Client-side image compressor using HTML Canvas
 * Reduces resolution and quality dynamically if needed while keeping high clarity
 */
export async function compressImage(file: File, maxWidth: number = 1600, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const compressedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

/**
 * Convert File object to Base64 string for PDF rendering
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}
