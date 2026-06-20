import { useState, useRef, useEffect } from 'react';

export default function SliderOverlay({ 
  imgAUrl, 
  imgBUrl, 
  labelA, 
  labelB, 
  zoom = 1, 
  pan = { x: 0, y: 0 } 
}) {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 - 100)
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full select-none overflow-hidden bg-zinc-950 flex items-center justify-center"
    >
      {/* Underlay Image (B) - Right Side (Always visible underneath) */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="w-full h-full flex items-center justify-center p-4 transition-transform duration-100 ease-out"
          style={transformStyle}
        >
          <img
            src={imgBUrl}
            alt={labelB}
            className="max-w-full max-h-full object-contain pointer-events-none select-none shadow-2xl"
          />
        </div>
      </div>

      {/* Overlay Image (A) - Left Side (Clipped at screen level) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <div 
          className="w-full h-full flex items-center justify-center p-4 transition-transform duration-100 ease-out"
          style={transformStyle}
        >
          <img
            src={imgAUrl}
            alt={labelA}
            className="max-w-full max-h-full object-contain pointer-events-none select-none shadow-2xl"
          />
        </div>
      </div>

      {/* Static overlay labels (outside of zoom/pan transformation) */}
      <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800 pointer-events-none z-30">
        <span className="text-xs font-mono font-semibold text-zinc-300">{labelA}</span>
      </div>
      <div className="absolute top-4 right-4 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800 pointer-events-none z-30">
        <span className="text-xs font-mono font-semibold text-zinc-300">{labelB}</span>
      </div>

      {/* Slider Bar & Handle */}
      <div 
        className="absolute top-0 bottom-0 z-40 w-8 -ml-4 cursor-ew-resize select-none flex justify-center group/sliderbar"
        style={{ left: `${sliderPosition}%` }}
        onPointerDown={handlePointerDown}
      >
        {/* Visible line */}
        <div className="w-0.5 h-full bg-accent group-hover/sliderbar:bg-accent-hover transition-colors" />

        {/* Grab Handle Circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent border-2 border-zinc-900 shadow-lg shadow-accent/40 flex items-center justify-center text-white pointer-events-none select-none">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-white/80 rounded-full" />
            <div className="w-0.5 h-3 bg-white/80 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
