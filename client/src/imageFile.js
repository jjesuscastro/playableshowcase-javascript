const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1280;
const MAX_DATA_URL_SIZE = 9 * 1024 * 1024;

export function imageFileToPngDataUrl(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Choose a PNG, JPG, or WebP image.'));
  }
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error('Choose an image smaller than 15 MB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The selected file is not a valid image.'));
      image.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

        try {
          const dataUrl = canvas.toDataURL('image/png');
          if (dataUrl.length > MAX_DATA_URL_SIZE) {
            reject(new Error('The converted image is too large. Choose a smaller image.'));
            return;
          }
          resolve(dataUrl);
        } catch {
          reject(new Error('Could not convert the selected image.'));
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
