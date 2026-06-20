import { Plus, Trash2 } from 'lucide-react';

export default function SequenceStrip({ 
  images, 
  activeIndex, 
  setActiveIndex, 
  indexA, 
  setIndexA, 
  indexB, 
  setIndexB, 
  mode,
  onAddImages,
  onDeleteImage
}) {
  const isABMode = mode === 'slider' || mode === 'side-by-side';

  const handleThumbClick = (index) => {
    if (isABMode) {
      // In A/B comparison modes, toggle or set A first, then B
      if (index === indexA) return;
      if (index === indexB) {
        // Swap
        setIndexB(indexA);
        setIndexA(index);
      } else {
        // Set as active A, and make previous A become B
        setIndexB(indexA);
        setIndexA(index);
      }
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <div className="bg-zinc-900 border-t border-zinc-850 px-6 py-4 flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
        <span>VERSIONS</span>
        <span>
          {isABMode 
            ? 'Click a thumbnail to compare. Sets A (latest) and B (previous).' 
            : `${activeIndex + 1} of ${images.length} • Select to view`}
        </span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto py-1 max-w-full">
        {images.map((img, index) => {
          if (!img) return null;
          const url = img.thumbnail ? URL.createObjectURL(img.thumbnail) : '';
          
          let borderClass = 'border-zinc-800';
          let badge = null;

          if (isABMode) {
            if (index === indexA) {
              borderClass = 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-zinc-900';
              badge = <span className="absolute top-1 left-1 bg-accent text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">A</span>;
            } else if (index === indexB) {
              borderClass = 'border-violet-500 ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900';
              badge = <span className="absolute top-1 left-1 bg-violet-500 text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">B</span>;
            }
          } else {
            if (index === activeIndex) {
              borderClass = 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-zinc-900';
            }
          }

          return (
            <div
              key={img.id}
              onClick={() => handleThumbClick(index)}
              className={`group/thumb relative w-20 h-16 rounded-lg overflow-hidden bg-zinc-950 border flex-shrink-0 cursor-pointer transition-all ${borderClass}`}
            >
              {url && <img src={url} alt="" className="w-full h-full object-cover" />}
              {badge}
              {/* Delete button (small trash icon on hover) */}
              {onDeleteImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage(img.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-950 border border-zinc-800 hover:border-red-900 text-zinc-400 hover:text-red-450 rounded opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10"
                  title="Delete this version"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {/* Overlay with labels */}
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center truncate">
                <span className="text-[10px] font-mono text-zinc-300 font-semibold">{img.label}</span>
              </div>
            </div>
          );
        })}

        {/* Add Image Button */}
        {onAddImages && (
          <label className="relative w-20 h-16 rounded-lg border border-dashed border-zinc-800 hover:border-accent/40 flex flex-col items-center justify-center text-zinc-550 hover:text-accent bg-zinc-950/20 hover:bg-accent/5 cursor-pointer transition-all flex-shrink-0">
            <Plus className="w-4 h-4" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Add</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={onAddImages}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
