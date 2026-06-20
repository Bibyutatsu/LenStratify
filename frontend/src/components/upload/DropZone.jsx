import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

export default function DropZone({ onFilesSelected, accept = 'image/*', multiple = true }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/') || file.name.endsWith('.zip')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      className={`relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? 'border-accent bg-accent/10 scale-[0.98]'
          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/60'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center text-center p-6 pointer-events-none">
        <UploadCloud 
          className={`w-10 h-10 mb-3 transition-colors ${
            isDragActive ? 'text-accent' : 'text-zinc-500'
          }`} 
        />
        <p className="text-zinc-300 font-medium mb-1">
          Drag & drop images here, or <span className="text-accent hover:underline">browse</span>
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          Supports JPEG, PNG, WEBP, GIF (or LenStratify ZIP)
        </p>
      </div>
    </div>
  );
}
