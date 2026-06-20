import Dexie from 'dexie';

export const db = new Dexie('LenStratifyDB');

db.version(1).stores({
  groups: 'id, name, createdAt, updatedAt',
  images: 'id, groupId, filename, label, addedAt, order'
});
