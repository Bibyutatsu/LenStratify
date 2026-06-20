export function generateThumbnail(blob, maxWidth = 300) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      const scale = maxWidth / img.width;
      if (scale >= 1) {
        // Image is smaller than thumbnail limit
        resolve(blob);
        return;
      }

      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((thumbnailBlob) => {
        if (thumbnailBlob) {
          resolve(thumbnailBlob);
        } else {
          reject(new Error('Thumbnail generation failed'));
        }
      }, 'image/jpeg', 0.8);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function getImageDimensions(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function alignImageToDimensions(file, targetWidth, targetHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // If already matching target dimensions, skip processing
      if (img.width === targetWidth && img.height === targetHeight) {
        resolve(file);
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // Simply draw image covering full canvas to resize without cropping
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const alignedFile = new File([blob], file.name, { type: file.type || 'image/jpeg' });
          resolve(alignedFile);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, file.type || 'image/jpeg', 0.95);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
