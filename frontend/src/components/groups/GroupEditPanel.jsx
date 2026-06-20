import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Trash2, ArrowUp, ArrowDown, Plus, FileEdit, Check } from 'lucide-react';
import { db } from '../../db/db';
import { 
  addImagesToGroup, 
  deleteImageFromGroup, 
  updateImageLabel, 
  updateGroupImagesOrder, 
  renameGroup 
} from '../../db/queries';

export default function GroupEditPanel({ groupId, isOpen, onClose }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Fetch group
  const group = useLiveQuery(() => groupId ? db.groups.get(groupId) : null, [groupId]);
  
  // Fetch images for this group
  const images = useLiveQuery(async () => {
    if (!group || !groupId) return [];
    const imgs = await db.images.where({ groupId }).toArray();
    // Sort based on group's imageIds order
    return group.imageIds
      .map(id => imgs.find(img => img.id === id))
      .filter(Boolean);
  }, [group, groupId]);

  if (!isOpen || !group) return null;

  const handleStartRename = () => {
    setEditedName(group.name);
    setIsEditingName(true);
  };

  const handleSaveRename = async () => {
    if (editedName.trim()) {
      await renameGroup(groupId, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await addImagesToGroup(groupId, files);
    e.target.value = ''; // Reset input
  };

  const handleRemoveImage = async (imageId) => {
    if (images.length <= 1) {
      if (confirm('Deleting the last image will delete this group. Continue?')) {
        await deleteImageFromGroup(groupId, imageId);
        onClose();
      }
    } else {
      await deleteImageFromGroup(groupId, imageId);
    }
  };

  const handleMove = async (index, direction) => {
    const newImages = [...images];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;

    // Swap
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    const newIds = newImages.map(img => img.id);
    await updateGroupImagesOrder(groupId, newIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-2">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="bg-zinc-950 text-zinc-150 border border-accent focus:outline-none rounded px-2 py-1 text-sm font-semibold flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <button 
                  onClick={handleSaveRename}
                  className="p-1 bg-accent/20 hover:bg-accent/30 text-accent rounded transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group cursor-pointer" onClick={handleStartRename}>
                <h2 className="text-md font-bold text-zinc-155 truncate">{group.name}</h2>
                <FileEdit className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <p className="text-zinc-500 text-xs">Edit versions and settings</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-zinc-450 text-xs font-semibold uppercase tracking-wider">
                Versions ({images.length})
              </label>
              
              <label className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-semibold cursor-pointer bg-accent/10 px-2 py-1 rounded hover:bg-accent/15 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add Image
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAddImages}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              {images.map((img, index) => {
                if (!img) return null;
                const thumbUrl = img.thumbnail ? URL.createObjectURL(img.thumbnail) : '';
                return (
                  <div key={img.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-850 p-2 rounded-lg">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded bg-zinc-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-800">
                      {thumbUrl && <img src={thumbUrl} alt="" className="w-full h-full object-cover" />}
                    </div>

                    {/* Label Input */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={img.label}
                        onChange={(e) => updateImageLabel(img.id, e.target.value)}
                        className="w-full bg-transparent text-zinc-150 text-sm font-semibold border-b border-transparent focus:border-accent focus:border-b-2 outline-none py-0.5"
                      />
                      <p className="text-zinc-600 text-xxs truncate mt-0.5">{img.filename}</p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-zinc-550 hover:text-zinc-350 disabled:text-zinc-800 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 1)}
                        disabled={index === images.length - 1}
                        className="p-1 text-zinc-550 hover:text-zinc-350 disabled:text-zinc-800 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveImage(img.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
