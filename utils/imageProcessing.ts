import heic2any from 'heic2any';

/**
 * Checks if a file is HEIC and converts it to JPEG if necessary.
 * Returns the original file if no conversion is needed or if conversion fails.
 */
export const processFileForDisplay = async (file: File): Promise<File> => {
  // Normalize name and type check
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  const isHeic = 
    fileType === 'image/heic' || 
    fileType === 'image/heif' || 
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif');

  if (isHeic) {
    try {
      console.log(`Converting HEIC file: ${file.name}`);
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.85
      });
      
      // heic2any can return a single Blob or an array of Blobs
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      
      // Create a new File object with the converted blob
      const newFileName = fileName.replace(/\.heic$|\.heif$/i, '.jpg');
      console.log(`Conversion successful: ${newFileName}`);
      
      return new File([blob], newFileName, {
        type: 'image/jpeg',
        lastModified: new Date().getTime()
      });
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      // We still return the file, but maybe App should handle the preview failure.
      // The original HEIC file cannot be previewed in <img> tags in most browsers.
      return file;
    }
  }
  
  return file;
};