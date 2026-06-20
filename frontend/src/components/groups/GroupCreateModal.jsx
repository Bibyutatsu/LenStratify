import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import DropZone from '../upload/DropZone';
import { createGroup } from '../../db/queries';

export default function GroupCreateModal({ isOpen, onClose, onGroupCreated }) {
  const [name, setName] = useState('');
  const [files, setFiles] = useState([]);
  const [labels, setLabels] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleFilesSelected = (selectedFiles) => {
    const updatedFiles = [...files, ...selectedFiles];
    setFiles(updatedFiles);
    
    // Default labels
    const updatedLabels = [...labels];
    selectedFiles.forEach((file) => {
      // Try to extract logical names from file name, or default
      const cleanName = file.name.split('.')[0].replace(/[-_]/g, ' ');
      updatedLabels.push(cleanName.substring(0, 20));
    });
    setLabels(updatedLabels);
  };

  const handleLabelChange = (index, val) => {
    const updated = [...labels];
    updated[index] = val;
    setLabels(updated);
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedLabels = labels.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setLabels(updatedLabels);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setIsCreating(true);
    try {
      const gName = name.trim() || `Comparison Group (${files.length} images)`;
      const newGroupId = await createGroup(gName, files, labels);
      onGroupCreated(newGroupId);
      onClose();
      // Reset state
      setName('');
      setFiles([]);
      setLabels([]);
    } catch (err) {
      console.error(err);
      alert('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Create Image Group</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Landing Page Hero Shot, Portrait Editing"
              className="w-full bg-zinc-950 border border-zinc-850 focus:border-accent text-zinc-100 rounded-lg px-4 py-2.5 outline-none transition-colors placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Add Version Images
            </label>
            <DropZone onFilesSelected={handleFilesSelected} />
          </div>

          {files.length > 0 && (
            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Selected Images & Version Labels ({files.length})
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {files.map((file, index) => {
                  const url = URL.createObjectURL(file);
                  return (
                    <div key={index} className="flex items-center gap-3 bg-zinc-950 border border-zinc-850 p-2 rounded-lg">
                      <div className="w-12 h-12 rounded bg-zinc-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-800">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-400 text-xs truncate">{file.name}</p>
                        <input
                          type="text"
                          value={labels[index] || ''}
                          onChange={(e) => handleLabelChange(index, e.target.value)}
                          placeholder={`Version ${index + 1}`}
                          className="w-full bg-transparent text-zinc-100 text-sm font-semibold border-b border-transparent focus:border-accent outline-none py-0.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={files.length === 0 || isCreating}
            className="bg-accent hover:bg-accent-hover disabled:bg-zinc-800 disabled:text-zinc-650 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
