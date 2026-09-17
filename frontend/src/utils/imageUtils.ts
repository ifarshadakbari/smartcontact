/**
 * Image processing utilities for client-side avatar resizing and compression.
 * Converts uploaded user pictures into optimized Base64 JPEG strings (max 300x300, ~20-40KB)
 * to keep database payload lightweight and UI rendering fast.
 */

export interface ResizeOptions {
  maxSize?: number; // Maximum width or height in pixels (default: 300)
  quality?: number; // JPEG compression quality 0.0 - 1.0 (default: 0.85)
}

/**
 * Resizes and compresses an image file to an optimized Base64 JPEG Data URL.
 * Supports JPG, PNG, WEBP, GIF, SVG, etc.
 */
export const resizeAvatarImage = (
  file: File,
  options: ResizeOptions = {}
): Promise<string> => {
  const { maxSize = 300, quality = 0.85 } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('فایل انتخاب شده باید از نوع تصویر (عکس) باشد.'));
      return;
    }

    // Safety check: Don't process extremely giant files over 20MB in browser
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error('حجم فایل انتخاب شده نباید بیشتر از ۲۰ مگابایت باشد.'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('خطا در خواندن اطلاعات فایل تصویر.'));
    };

    reader.onload = (event) => {
      const result = event.target?.result;
      if (!result || typeof result !== 'string') {
        reject(new Error('محتوای فایل تصویر نامعتبر است.'));
        return;
      }

      const img = new Image();

      img.onerror = () => {
        reject(new Error('امکان رمزگشایی و بارگذاری تصویر وجود ندارد.'));
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate aspect-ratio preserving dimensions
          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          // Ensure positive integer dimensions
          width = Math.max(1, width);
          height = Math.max(1, height);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('عدم پشتیبانی مرورگر از بوم پردازش تصویر (Canvas).'));
            return;
          }

          // Fill clean white background for PNG/WebP with alpha channel so it never renders black
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          // High-quality downsampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed Base64 JPEG data URL
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(new Error('خطا در فشرده‌سازی و تغییر ابعاد تصویر.'));
        }
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Calculates approximate size in Kilobytes of a base64 string
 */
export const getBase64SizeInKb = (base64String: string): number => {
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = Math.ceil((base64Length * 3) / 4);
  return Math.round(sizeInBytes / 1024);
};
