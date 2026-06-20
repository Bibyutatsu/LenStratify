import { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

export default function DropZone({ onFilesSelected, accept = 'image/*', multiple = true }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const traverseFileTree = (item, path = '') => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file) => {
          // Rename file to include relative path
          const relativePath = path + file.name;
          const renamedFile = new File([file], relativePath, { type: file.type });
          resolve([renamedFile]);
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        let allEntries = [];
        
        const readAllEntries = () => {
          dirReader.readEntries(async (entries) => {
            if (entries.length === 0) {
              const filePromises = allEntries.map(entry => traverseFileTree(entry, path + item.name + '/'));
              const results = await Promise.all(filePromises);
              resolve(results.flat());
            } else {
              allEntries = allEntries.concat(entries);
              readAllEntries();
            }
          }, (error) => {
            console.error(error);
            resolve([]);
          });
        };
        
        readAllEntries();
      } else {
        resolve([]);
      }
    });
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const entries = Array.from(e.dataTransfer.items)
        .map(item => item.webkitGetAsEntry())
        .filter(Boolean);
      
      const filePromises = entries.map(entry => traverseFileTree(entry));
      const fileArrays = await Promise.all(filePromises);
      const files = fileArrays.flat().filter(file => 
        file.type.startsWith('image/') || 
        file.name.toLowerCase().endsWith('.jpg') || 
        file.name.toLowerCase().endsWith('.jpeg') || 
        file.name.toLowerCase().endsWith('.png') || 
        file.name.toLowerCase().endsWith('.webp') || 
        file.name.toLowerCase().endsWith('.gif') ||
        file.name.toLowerCase().endsWith('.zip')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
      const files = Array.from(e.target.files).map(file => {
        if (file.webkitRelativePath) {
          return new File([file], file.webkitRelativePath, { type: file.type });
        }
        return file;
      });
      onFilesSelected(files);
      e.target.value = ''; // Reset input so same folder/files can be selected again
    }
  };

  const onBrowseFiles = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const onBrowseFolder = (e) => {
    e.stopPropagation();
    folderInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onBrowseFiles}
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
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center text-center p-6 pointer-events-none">
        <UploadCloud 
          className={`w-10 h-10 mb-3 transition-colors ${
            isDragActive ? 'text-accent' : 'text-zinc-500'
          }`} 
        />
        <p className="text-zinc-300 font-medium mb-1">
          Drag & drop images/folders here, or{' '}
          <span onClick={onBrowseFiles} className="text-accent hover:underline pointer-events-auto">
            browse files
          </span>{' '}
          /{' '}
          <span onClick={onBrowseFolder} className="text-accent hover:underline pointer-events-auto">
            select folder
          </span>
        </p>
        <p className="text-zinc-550 text-xs mt-1.5">
          Supports JPEG, PNG, WEBP, GIF (including nested folders or ZIP)
        </p>
      </div>
    </div>
  );
}
