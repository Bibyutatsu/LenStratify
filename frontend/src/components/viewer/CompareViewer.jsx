import { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ArrowLeft, 
  Eye, 
  Split, 
  Columns, 
  Grid, 
  Maximize2, 
  Minimize2, 
  RefreshCw,
  Settings
} from 'lucide-react';
import { db } from '../../db/db';
import { addImagesToGroup, deleteImageFromGroup } from '../../db/queries';
import SequenceStrip from './SequenceStrip';
import SliderOverlay from './SliderOverlay';
import SideBySide from './SideBySide';
import GroupEditPanel from '../groups/GroupEditPanel';

export default function CompareViewer({ groupId, onClose }) {
  const [mode, setMode] = useState('sequential'); // 'sequential' | 'slider' | 'side-by-side' | 'grid'
  const [activeIndex, setActiveIndex] = useState(0);
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // DB queries
  const group = useLiveQuery(() => groupId ? db.groups.get(groupId) : null, [groupId]);
  const images = useLiveQuery(async () => {
    if (!group || !groupId) return [];
    const imgs = await db.images.where({ groupId }).toArray();
    // Sort based on group order
    return group.imageIds
      .map(id => imgs.find(img => img.id === id))
      .filter(Boolean);
  }, [group, groupId]);

  // Set default indexes when images load
  useEffect(() => {
    if (images && images.length > 0) {
      // Latest version is A, second latest or first is B
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIndexA(images.length - 1);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIndexB(Math.max(0, images.length - 2));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(images.length - 1);
    }
  }, [images]);

  // Mouse pan/zoom events
  const [isDragging, setIsDragging] = useState(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPan = useRef({ x: 0, y: 0 });

  // Fullscreen management helper defined before use
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handlePointerDown = (e) => {
    if (mode === 'grid') return;
    if (e.target.closest('.cursor-ew-resize')) return; // ignore A/B slider handle clicks
    setIsDragging(true);
    startPointer.current = { x: e.clientX, y: e.clientY };
    startPan.current = { ...pan };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startPointer.current.x;
    const dy = e.clientY - startPointer.current.y;
    setPan({
      x: startPan.current.x + dx,
      y: startPan.current.y + dy
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    if (mode === 'grid') return;
    e.preventDefault();
    const factor = 1.15;
    if (e.deltaY < 0) {
      setZoom(z => Math.min(z * factor, 8));
    } else {
      setZoom(z => Math.max(z / factor, 0.5));
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeKey = e.key.toLowerCase();
      if (activeKey === 'escape') {
        if (isFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (activeKey === 'arrowleft') {
        if (mode === 'sequential') {
          setActiveIndex(prev => (prev - 1 + images.length) % images.length);
        }
      } else if (activeKey === 'arrowright') {
        if (mode === 'sequential') {
          setActiveIndex(prev => (prev + 1) % images.length);
        }
      } else if (activeKey === 'f') {
        toggleFullscreen();
      } else if (activeKey === 'm') {
        // Cycle mode
        const modes = ['sequential', 'slider', 'side-by-side', 'grid'];
        setMode(prev => {
          const nextIndex = (modes.indexOf(prev) + 1) % modes.length;
          return modes[nextIndex];
        });
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, mode, isFullscreen]);

  // Fullscreen management listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Pre-prepare Image URLs
  const activeImg = images?.[activeIndex];
  const imgA = images?.[indexA];
  const imgB = images?.[indexB];

  const activeUrl = useMemo(() => {
    return activeImg?.blob ? URL.createObjectURL(activeImg.blob) : '';
  }, [activeImg]);

  const imgAUrl = useMemo(() => {
    return imgA?.blob ? URL.createObjectURL(imgA.blob) : '';
  }, [imgA]);

  const imgBUrl = useMemo(() => {
    return imgB?.blob ? URL.createObjectURL(imgB.blob) : '';
  }, [imgB]);

  // Clean URLs on unmount/updates
  useEffect(() => {
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [activeUrl]);

  useEffect(() => {
    return () => {
      if (imgAUrl) URL.revokeObjectURL(imgAUrl);
    };
  }, [imgAUrl]);

  useEffect(() => {
    return () => {
      if (imgBUrl) URL.revokeObjectURL(imgBUrl);
    };
  }, [imgBUrl]);

  if (!group || !images || images.length === 0) {
    return (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-550 text-sm">Loading images...</div>
      </div>
    );
  }

  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await addImagesToGroup(groupId, files);
    e.target.value = ''; // Reset input
  };

  const handleDeleteImage = async (imageId) => {
    if (images.length <= 1) {
      if (confirm('Deleting the last image will delete this group. Continue?')) {
        await deleteImageFromGroup(groupId, imageId);
        onClose();
      }
    } else {
      if (confirm('Are you sure you want to delete this version?')) {
        await deleteImageFromGroup(groupId, imageId);
        
        // Adjust active index
        const deletedIndex = images.findIndex(img => img.id === imageId);
        if (deletedIndex === activeIndex) {
          setActiveIndex(Math.max(0, deletedIndex - 1));
        } else if (deletedIndex < activeIndex) {
          setActiveIndex(activeIndex - 1);
        }
        
        // Adjust A/B comparison indexes
        if (deletedIndex === indexA) {
          setIndexA(Math.max(0, images.length - 2));
        } else if (deletedIndex < indexA) {
          setIndexA(indexA - 1);
        }
        
        if (deletedIndex === indexB) {
          setIndexB(Math.max(0, images.length - 3));
        } else if (deletedIndex < indexB) {
          setIndexB(indexB - 1);
        }
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-zinc-950 flex flex-col select-none text-zinc-200"
    >
      {/* Top Toolbar */}
      <div className="bg-zinc-900/60 border-b border-zinc-850 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-zinc-200 leading-none">{group.name}</h1>
            <p className="text-zinc-550 text-xxs font-mono mt-0.5">
              {mode.toUpperCase()} MODE
            </p>
          </div>
        </div>

        {/* Modes & Views */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
          <button
            onClick={() => { setMode('sequential'); resetView(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'sequential' ? 'bg-accent text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Single</span>
          </button>
          <button
            onClick={() => { setMode('slider'); resetView(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'slider' ? 'bg-accent text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>A/B Slide</span>
          </button>
          <button
            onClick={() => { setMode('side-by-side'); resetView(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'side-by-side' ? 'bg-accent text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>2-Up</span>
          </button>
          <button
            onClick={() => { setMode('grid'); resetView(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'grid' ? 'bg-accent text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {mode !== 'grid' && (
            <>
              <div className="text-[11px] font-mono text-zinc-550 mr-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-850">
                Zoom: {Math.round(zoom * 100)}%
              </div>
              <button
                onClick={resetView}
                className="p-1.5 text-zinc-450 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-850/50"
                title="Reset Zoom/Pan"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-zinc-450 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-850/50"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-850 transition-colors ml-1"
            title="Manage Versions / Add & Delete Images"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage Group</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className={`flex-1 relative overflow-hidden select-none bg-zinc-950 flex items-center justify-center ${
          mode === 'grid' ? 'cursor-default' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {mode === 'sequential' && activeUrl && (
          <div 
            className="w-full h-full flex items-center justify-center p-4 transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            <img
              src={activeUrl}
              alt={activeImg.label}
              className="max-w-full max-h-full object-contain pointer-events-none shadow-2xl"
            />
            {/* Version Tag */}
            <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800 pointer-events-none z-20">
              <span className="text-xs font-mono font-semibold text-zinc-350">{activeImg.label}</span>
            </div>
          </div>
        )}

        {mode === 'slider' && imgAUrl && imgBUrl && (
          <SliderOverlay
            imgAUrl={imgAUrl}
            imgBUrl={imgBUrl}
            labelA={imgA.label}
            labelB={imgB.label}
            zoom={zoom}
            pan={pan}
          />
        )}

        {mode === 'side-by-side' && imgAUrl && imgBUrl && (
          <SideBySide
            imgAUrl={imgAUrl}
            imgBUrl={imgBUrl}
            labelA={imgA.label}
            labelB={imgB.label}
            zoom={zoom}
            pan={pan}
          />
        )}

        {mode === 'grid' && (
          <div className="w-full h-full p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
            {images.map((img) => {
              const url = img.blob ? URL.createObjectURL(img.blob) : '';
              return (
                <div key={img.id} className="relative bg-zinc-900 border border-zinc-850 rounded-xl overflow-hidden flex items-center justify-center p-2 min-h-[220px]">
                  {url && (
                    <img
                      src={url}
                      alt={img.label}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/75 px-2.5 py-1 rounded-md border border-zinc-800 text-[10px] font-mono text-zinc-300 font-semibold shadow">
                    {img.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Filmstrip */}
      <SequenceStrip
        images={images}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        indexA={indexA}
        setIndexA={setIndexA}
        indexB={indexB}
        setIndexB={setIndexB}
        mode={mode}
        onAddImages={handleAddImages}
        onDeleteImage={handleDeleteImage}
      />

      {/* Edit Panel Drawer */}
      <GroupEditPanel
        groupId={groupId}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </div>
  );
}
