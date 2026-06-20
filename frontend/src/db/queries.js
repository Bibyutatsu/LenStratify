import { db } from './db';
import { generateThumbnail, getImageDimensions, alignImageToDimensions } from '../utils/thumbnail';

export async function createGroup(name, files, customLabels = []) {
  const groupId = crypto.randomUUID();
  const now = Date.now();
  const imageIds = [];
  const imagesToInsert = [];

  // Find largest dimensions first (upscale all other images to match the largest one)
  let targetWidth = 0;
  let targetHeight = 0;
  let maxArea = 0;

  for (let i = 0; i < files.length; i++) {
    const dimensions = await getImageDimensions(files[i]).catch(() => ({ width: 0, height: 0 }));
    const area = dimensions.width * dimensions.height;
    if (area > maxArea) {
      maxArea = area;
      targetWidth = dimensions.width;
      targetHeight = dimensions.height;
    }
  }

  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    
    if (targetWidth > 0 && targetHeight > 0) {
      // Resize/Align all images to target dimensions (upscaling smaller ones)
      file = await alignImageToDimensions(file, targetWidth, targetHeight).catch((err) => {
        console.warn('Failed to align dimensions:', err);
        return file;
      });
    }

    const imageId = crypto.randomUUID();
    const thumbnail = await generateThumbnail(file).catch(() => file);
    const label = customLabels[i] || `Version ${i + 1}`;

    imagesToInsert.push({
      id: imageId,
      groupId,
      filename: file.name,
      label,
      blob: file,
      thumbnail,
      width: targetWidth,
      height: targetHeight,
      fileSize: file.size,
      addedAt: now,
      order: i
    });

    imageIds.push(imageId);
  }

  const group = {
    id: groupId,
    name: name || `Group - ${new Date().toLocaleDateString()}`,
    createdAt: now,
    updatedAt: now,
    imageIds,
    tags: []
  };

  await db.transaction('rw', [db.groups, db.images], async () => {
    await db.groups.add(group);
    for (const img of imagesToInsert) {
      await db.images.add(img);
    }
  });

  return groupId;
}

export async function addImagesToGroup(groupId, files) {
  const now = Date.now();
  const group = await db.groups.get(groupId);
  if (!group) return;

  const imageIds = [...group.imageIds];
  const imagesToInsert = [];
  const startOrder = imageIds.length;
  const existingImgs = await db.images.where({ groupId }).toArray();

  // Find the max area among existing and new images to upscale smaller images
  let targetWidth = 0;
  let targetHeight = 0;
  let maxArea = 0;

  // 1. Check existing images
  for (const img of existingImgs) {
    const area = img.width * img.height;
    if (area > maxArea) {
      maxArea = area;
      targetWidth = img.width;
      targetHeight = img.height;
    }
  }

  // 2. Check new images
  for (let i = 0; i < files.length; i++) {
    const dimensions = await getImageDimensions(files[i]).catch(() => ({ width: 0, height: 0 }));
    const area = dimensions.width * dimensions.height;
    if (area > maxArea) {
      maxArea = area;
      targetWidth = dimensions.width;
      targetHeight = dimensions.height;
    }
  }

  // 3. If target dimensions increased, we need to upscale existing images in DB
  const existingUpdates = [];
  if (maxArea > 0) {
    for (const img of existingImgs) {
      if (img.width !== targetWidth || img.height !== targetHeight) {
        const alignedFile = await alignImageToDimensions(img.blob, targetWidth, targetHeight).catch((err) => {
          console.warn('Failed to align existing image:', err);
          return null;
        });
        if (alignedFile) {
          const thumbnail = await generateThumbnail(alignedFile).catch(() => alignedFile);
          existingUpdates.push({
            id: img.id,
            blob: alignedFile,
            thumbnail,
            width: targetWidth,
            height: targetHeight
          });
        }
      }
    }
  }

  // 4. Align and prepare the new images
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    
    if (targetWidth > 0 && targetHeight > 0) {
      file = await alignImageToDimensions(file, targetWidth, targetHeight).catch((err) => {
        console.warn('Failed to align dimensions:', err);
        return file;
      });
    }

    const imageId = crypto.randomUUID();
    const thumbnail = await generateThumbnail(file).catch(() => file);
    const label = `Version ${imageIds.length + 1}`;

    imagesToInsert.push({
      id: imageId,
      groupId,
      filename: file.name,
      label,
      blob: file,
      thumbnail,
      width: targetWidth,
      height: targetHeight,
      fileSize: file.size,
      addedAt: now,
      order: startOrder + i
    });

    imageIds.push(imageId);
  }

  await db.transaction('rw', [db.groups, db.images], async () => {
    await db.groups.update(groupId, {
      imageIds,
      updatedAt: now
    });
    
    // Apply upscaling to existing images
    for (const update of existingUpdates) {
      await db.images.update(update.id, {
        blob: update.blob,
        thumbnail: update.thumbnail,
        width: update.width,
        height: update.height
      });
    }

    // Add new images
    for (const img of imagesToInsert) {
      await db.images.add(img);
    }
  });
}

export async function deleteGroup(groupId) {
  await db.transaction('rw', [db.groups, db.images], async () => {
    await db.groups.delete(groupId);
    await db.images.where({ groupId }).delete();
  });
}

export async function deleteImageFromGroup(groupId, imageId) {
  const group = await db.groups.get(groupId);
  if (!group) return;

  const imageIds = group.imageIds.filter(id => id !== imageId);
  const now = Date.now();

  await db.transaction('rw', [db.groups, db.images], async () => {
    if (imageIds.length === 0) {
      await db.groups.delete(groupId);
    } else {
      await db.groups.update(groupId, {
        imageIds,
        updatedAt: now
      });
    }
    await db.images.delete(imageId);
  });
}

export async function updateImageLabel(imageId, label) {
  await db.images.update(imageId, { label });
}

export async function updateGroupImagesOrder(groupId, imageIds) {
  const now = Date.now();
  await db.transaction('rw', [db.groups, db.images], async () => {
    await db.groups.update(groupId, {
      imageIds,
      updatedAt: now
    });
    
    for (let i = 0; i < imageIds.length; i++) {
      await db.images.update(imageIds[i], { order: i });
    }
  });
}

export async function renameGroup(groupId, name) {
  await db.groups.update(groupId, {
    name,
    updatedAt: Date.now()
  });
}
