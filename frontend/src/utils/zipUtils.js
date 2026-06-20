import JSZip from 'jszip';
import { db } from '../db/db';
import { generateThumbnail } from './thumbnail';

export async function exportGroup(group, images) {
  const zip = new JSZip();
  
  // Create manifest
  const manifest = {
    name: group.name,
    tags: group.tags || [],
    images: images.map(img => ({
      id: img.id,
      filename: img.filename,
      label: img.label,
      order: img.order,
      addedAt: img.addedAt,
      width: img.width,
      height: img.height,
      fileSize: img.fileSize
    }))
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Add images to zip
  for (const img of images) {
    zip.file(`images/${img.id}_${img.filename}`, img.blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  
  // Download zip
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lenstratify.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importGroup(zipFile) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  
  const manifestFile = loadedZip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid backup: manifest.json not found');
  }

  const manifestText = await manifestFile.async('string');
  const manifest = JSON.parse(manifestText);

  // Generate new group
  const newGroupId = crypto.randomUUID();
  const now = Date.now();

  const newGroup = {
    id: newGroupId,
    name: manifest.name,
    createdAt: now,
    updatedAt: now,
    tags: manifest.tags,
    imageIds: []
  };

  const newImages = [];

  for (const imgData of manifest.images) {
    const fileInZip = loadedZip.file(`images/${imgData.id}_${imgData.filename}`);
    if (!fileInZip) {
      continue;
    }

    const fileBlob = await fileInZip.async('blob');
    const newImageId = crypto.randomUUID();
    
    // Generate thumbnail
    const thumbnailBlob = await generateThumbnail(fileBlob);

    newImages.push({
      id: newImageId,
      groupId: newGroupId,
      filename: imgData.filename,
      label: imgData.label,
      blob: fileBlob,
      thumbnail: thumbnailBlob,
      width: imgData.width,
      height: imgData.height,
      fileSize: imgData.fileSize || fileBlob.size,
      addedAt: imgData.addedAt || now,
      order: imgData.order
    });

    newGroup.imageIds.push(newImageId);
  }

  // Save to DB in transaction
  await db.transaction('rw', [db.groups, db.images], async () => {
    await db.groups.add(newGroup);
    for (const newImg of newImages) {
      await db.images.add(newImg);
    }
  });

  return newGroup;
}
