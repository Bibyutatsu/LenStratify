
export default function SideBySide({ 
  imgAUrl, 
  imgBUrl, 
  labelA, 
  labelB, 
  zoom = 1, 
  pan = { x: 0, y: 0 } 
}) {
  const transformStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
  };

  return (
    <div className="w-full h-full grid grid-cols-2 divide-x divide-zinc-900 bg-zinc-950 select-none overflow-hidden">
      {/* Left panel (Image A) */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4">
        <div 
          className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={transformStyle}
        >
          <img
            src={imgAUrl}
            alt={labelA}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
          />
        </div>
        {/* Label Overlay */}
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800 pointer-events-none">
          <span className="text-xs font-mono font-semibold text-zinc-300">{labelA}</span>
        </div>
      </div>

      {/* Right panel (Image B) */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4">
        <div 
          className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={transformStyle}
        >
          <img
            src={imgBUrl}
            alt={labelB}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
          />
        </div>
        {/* Label Overlay */}
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800 pointer-events-none">
          <span className="text-xs font-mono font-semibold text-zinc-300">{labelB}</span>
        </div>
      </div>
    </div>
  );
}
