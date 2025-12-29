/**
 * Image injection utilities for DOCX export.
 *
 * Replaces placeholder images in the template with actual property photos.
 * Works by swapping the byte content of existing images in word/media/.
 */

import type { GutachtenData } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSZipInstance = any; // JSZip instance type (avoiding esModuleInterop issues)

/**
 * Image slot mapping based on template analysis.
 *
 * Template structure:
 * - image1.jpg: Cover/header (keep as-is)
 * - image5.png: Logo (keep as-is)
 * - image9.jpg: GoogleMaps/Luftbild (replace with aerial)
 * - image11,13,15,17,23,25,27,29,31,33,35.png: Property photos (replace)
 */
const IMAGE_SLOTS = {
  aerial: 'word/media/image9.jpg',
  photos: [
    'word/media/image11.png',
    'word/media/image13.png',
    'word/media/image15.png',
    'word/media/image17.png',
    'word/media/image23.png',
    'word/media/image25.png',
    'word/media/image27.png',
    'word/media/image29.png',
    'word/media/image31.png',
    'word/media/image33.png',
    'word/media/image35.png',
  ],
} as const;

/**
 * Inject images into the DOCX ZIP.
 *
 * @param zip - JSZip instance with loaded template
 * @param data - Gutachten data with assets
 * @returns Modified zip (mutates in place)
 */
export async function injectImages(
  zip: JSZipInstance,
  data: GutachtenData
): Promise<JSZipInstance> {
  const assets = data.assets;
  if (!assets) {
    console.log('No assets to inject');
    return zip;
  }

  // Inject aerial image
  if (assets.aerial?.imageUrl) {
    try {
      const imageBuffer = await fetchImageAsBuffer(assets.aerial.imageUrl);
      if (imageBuffer) {
        // Keep the same extension as original for compatibility
        zip.file(IMAGE_SLOTS.aerial, imageBuffer);
        console.log(`Injected aerial image (${imageBuffer.length} bytes)`);
      }
    } catch (error) {
      console.error('Failed to inject aerial image:', error);
    }
  }

  // Inject property photos
  if (assets.photos && assets.photos.length > 0) {
    for (let i = 0; i < assets.photos.length && i < IMAGE_SLOTS.photos.length; i++) {
      const photo = assets.photos[i];
      if (photo.imageUrl) {
        try {
          const imageBuffer = await fetchImageAsBuffer(photo.imageUrl);
          if (imageBuffer) {
            zip.file(IMAGE_SLOTS.photos[i], imageBuffer);
            console.log(`Injected photo ${i + 1}: ${photo.caption} (${imageBuffer.length} bytes)`);
          }
        } catch (error) {
          console.error(`Failed to inject photo ${i + 1}:`, error);
        }
      }
    }
  }

  return zip;
}

/**
 * Fetch an image from URL or file path and return as Buffer.
 */
async function fetchImageAsBuffer(urlOrPath: string): Promise<Buffer | null> {
  // Handle data URLs (base64)
  if (urlOrPath.startsWith('data:')) {
    const base64Data = urlOrPath.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  // Handle file paths
  if (urlOrPath.startsWith('/') || urlOrPath.startsWith('C:') || urlOrPath.startsWith('.')) {
    const fs = await import('fs');
    if (fs.existsSync(urlOrPath)) {
      return fs.readFileSync(urlOrPath);
    }
    console.warn(`Image file not found: ${urlOrPath}`);
    return null;
  }

  // Handle HTTP URLs
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    try {
      const response = await fetch(urlOrPath);
      if (!response.ok) {
        console.warn(`Failed to fetch image: ${response.status}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.warn(`Error fetching image from ${urlOrPath}:`, error);
      return null;
    }
  }

  console.warn(`Unknown image URL format: ${urlOrPath}`);
  return null;
}

/**
 * Remove unused photo slots from the document.
 *
 * If fewer photos are provided than slots available, this removes
 * the unused drawing elements to avoid showing placeholder images.
 *
 * @param xml - Document XML
 * @param photoCount - Number of actual photos injected
 * @returns Modified XML
 */
export function removeUnusedPhotoSlots(xml: string, photoCount: number): string {
  // For now, we don't remove slots - we'd need to track which
  // drawings correspond to which image slots
  // TODO: Implement if needed
  return xml;
}

/**
 * Get the maximum number of photos that can be injected.
 */
export function getMaxPhotoSlots(): number {
  return IMAGE_SLOTS.photos.length;
}
