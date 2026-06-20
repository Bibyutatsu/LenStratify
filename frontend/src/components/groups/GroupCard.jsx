import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings, Download, Trash2, Layers } from 'lucide-react';
import { db } from '../../db/db';
import { exportGroup } from '../../utils/zipUtils';

export default function GroupCard({ 
  group, 
  onOpenViewer, 
  onOpenEditPanel, 
  onDeleteGroup,
  isSelected,
  onToggleSelect,
  isSelectionMode
}) {
  const [coverUrl, setCoverUrl] = useState('');

  // Get images for this group to count and fetch cover
  const images = useLiveQuery(async () => {
    const imgs = await db.images.where({ groupId: group.id }).toArray();
    // Sort based on group's imageIds order
    return group.imageIds
      .map(id => imgs.find(img => img.id === id))
      .filter(Boolean);
  }, [group]);

  useEffect(() => {
    if (images && images.length > 0) {
      const coverImage = images[0];
      if (coverImage && coverImage.thumbnail) {
        const url = URL.createObjectURL(coverImage.thumbnail);
        setCoverUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [images]);

  const handleExport = async (e) => {
    e.stopPropagation();
    if (!images || images.length === 0) return;
    try {
      await exportGroup(group, images);
    } catch (err) {
      console.error(err);
      alert('Failed to export ZIP');
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDeleteGroup(group.id);
  };

  const handleCardClick = (e) => {
    if (isSelectionMode) {
      onToggleSelect(group.id);
    } else {
      onOpenViewer(group.id);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onToggleSelect(group.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col bg-zinc-950 border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'border-accent bg-accent/5 ring-1 ring-accent'
          : 'border-zinc-850 hover:border-zinc-700 hover:-translate-y-0.5 shadow-md shadow-black/20'
      }`}
    >
      {/* Cover Image */}
      <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden flex items-center justify-center border-b border-zinc-900">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={group.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <Layers className="w-10 h-10 text-zinc-750" />
        )}

        {/* Selection Checkbox */}
        {(isSelectionMode || isSelected) && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxClick}
              className="w-5 h-5 rounded border-zinc-800 bg-zinc-950 text-accent focus:ring-accent cursor-pointer accent-accent"
            />
          </div>
        )}

        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenEditPanel(group.id); }}
            className="p-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors border border-zinc-800 shadow"
            title="Edit Group"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors border border-zinc-800 shadow"
            title="Export Group (.zip)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-red-950/90 hover:bg-red-900 text-red-400 hover:text-red-200 rounded-lg transition-colors border border-red-900/40 shadow"
            title="Delete Group"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 truncate mb-1">
            {group.name}
          </h3>
          <p className="text-zinc-500 text-xs flex items-center gap-1.5">
            <span>{group.imageIds.length} version{group.imageIds.length !== 1 ? 's' : ''}</span>
            <span className="text-zinc-700">•</span>
            <span>Updated {new Date(group.updatedAt).toLocaleDateString()}</span>
          </p>
        </div>
        
        {/* Version list indicator */}
        {images && images.length > 0 && (
          <div className="flex items-center gap-1 mt-3.5 overflow-x-auto pb-1 max-w-full">
            {images.slice(0, 5).map((img, i) => {
              const url = img.thumbnail ? URL.createObjectURL(img.thumbnail) : '';
              return (
                <div key={img.id} className="relative w-6 h-6 rounded-md overflow-hidden bg-zinc-900 border border-zinc-850 flex-shrink-0" title={img.label}>
                  {url && <img src={url} alt="" className="w-full h-full object-cover" />}
                </div>
              );
            })}
            {images.length > 5 && (
              <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-850 flex items-center justify-center text-[10px] text-zinc-500 font-bold flex-shrink-0">
                +{images.length - 5}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
