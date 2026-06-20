import { useState } from 'react';
import { X, Sparkles, Loader2, ArrowRight, Check, AlertCircle, Plus, Trash2 } from 'lucide-react';
import DropZone from '../upload/DropZone';
import { createGroup } from '../../db/queries';

export default function AutoGroupModal({ isOpen, onClose, onGroupsSaved }) {
  const [files, setFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null); // { groups: [], ungrouped: [] }
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFilesSelected = (selectedFiles) => {
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setError('');

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      // Connect to local backend (port 8000)
      const res = await fetch('http://localhost:8000/api/auto-group', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error(err);
      setError('Could not connect to grouping backend. Make sure the FastAPI server is running on port 8000.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Group editing actions
  const handleRenameSuggestedGroup = (groupId, name) => {
    setAnalysisResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map(g => g.id === groupId ? { ...g, suggested_name: name } : g)
      };
    });
  };

  const handleRemoveFromGroup = (groupId, filename) => {
    setAnalysisResult(prev => {
      if (!prev) return prev;
      const targetGroup = prev.groups.find(g => g.id === groupId);
      if (!targetGroup) return prev;
      
      const newImages = targetGroup.images.filter(img => img.filename !== filename);
      const newGroups = newImages.length > 0 
        ? prev.groups.map(g => g.id === groupId ? { ...g, images: newImages } : g)
        : prev.groups.filter(g => g.id !== groupId);

      return {
        groups: newGroups,
        ungrouped: [...prev.ungrouped, filename]
      };
    });
  };

  const handleAddToGroup = (groupId, filename) => {
    setAnalysisResult(prev => {
      if (!prev) return prev;
      return {
        ungrouped: prev.ungrouped.filter(name => name !== filename),
        groups: prev.groups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              images: [...g.images, { filename, order: g.images.length }]
            };
          }
          return g;
        })
      };
    });
  };

  const handleCreateNewGroup = () => {
    setAnalysisResult(prev => {
      if (!prev) return prev;
      const newId = `suggested-${prev.groups.length + 1}`;
      return {
        ...prev,
        groups: [
          ...prev.groups,
          { id: newId, suggested_name: `Group ${prev.groups.length + 1}`, images: [] }
        ]
      };
    });
  };

  const handleSaveResult = async () => {
    if (!analysisResult) return;
    setIsSaving(true);

    try {
      // Loop over groups and create them in IndexedDB
      for (const groupData of analysisResult.groups) {
        if (groupData.images.length === 0) continue;
        
        // Find matching File objects from the original uploaded files array
        const groupFiles = [];
        const groupLabels = [];

        groupData.images.forEach((img, idx) => {
          const fileObj = files.find(f => f.name === img.filename);
          if (fileObj) {
            groupFiles.push(fileObj);
            groupLabels.push(`Version ${idx + 1}`);
          }
        });

        if (groupFiles.length > 0) {
          await createGroup(groupData.suggested_name, groupFiles, groupLabels);
        }
      }

      onGroupsSaved();
      onClose();
      // Reset state
      setFiles([]);
      setAnalysisResult(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save auto-grouped results');
    } finally {
      setIsSaving(false);
    }
  };

  const getFilePreviewUrl = (filename) => {
    const fileObj = files.find(f => f.name === filename);
    return fileObj ? URL.createObjectURL(fileObj) : '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-zinc-150">Auto Group Images</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-lg flex gap-3 text-red-300 text-sm mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!analysisResult ? (
            /* Step 1: Upload Batch */
            <div className="space-y-6">
              <p className="text-zinc-400 text-sm">
                Upload a batch of images (e.g. 10 or 20 files). The backend OpenCV library will analyze features, color histograms, and hashes to group them into version sequences automatically.
              </p>
              
              <DropZone onFilesSelected={handleFilesSelected} />

              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                    <span>Uploaded Files ({files.length})</span>
                    <button 
                      type="button" 
                      onClick={() => setFiles([])}
                      className="text-red-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto pr-1">
                    {files.map((file, idx) => {
                      const url = URL.createObjectURL(file);
                      return (
                        <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-zinc-850 bg-zinc-950 flex items-center justify-center group/item">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="p-1.5 bg-red-900 text-white rounded-md hover:bg-red-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing and Clustering...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Run Auto Grouping
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Review Suggested Groups */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-bold text-zinc-200">Review Suggested Groups</h3>
                  <p className="text-xs text-zinc-550">We detected these similarity clusters. You can edit names, split files, or merge them before saving.</p>
                </div>
                <button
                  onClick={handleCreateNewGroup}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-semibold bg-accent/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Group
                </button>
              </div>

              {/* Group Cluster Grid */}
              <div className="space-y-4">
                {analysisResult.groups.map(group => (
                  <div key={group.id} className="border border-zinc-850 bg-zinc-950/40 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={group.suggested_name}
                        onChange={(e) => handleRenameSuggestedGroup(group.id, e.target.value)}
                        className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-accent text-zinc-150 text-sm font-bold px-2 py-1 rounded outline-none transition-colors"
                      />
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {group.images.length} Image{group.images.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {group.images.map(img => {
                        const previewUrl = getFilePreviewUrl(img.filename);
                        return (
                          <div key={img.filename} className="relative w-20 h-16 rounded-lg overflow-hidden border border-zinc-850 bg-zinc-900 group/img flex-shrink-0">
                            {previewUrl && <img src={previewUrl} alt="" className="w-full h-full object-cover" />}
                            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/item:opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handleRemoveFromGroup(group.id, img.filename)}
                                className="p-1 bg-red-950 text-red-400 border border-red-900/50 hover:bg-red-900 rounded transition-colors text-[10px]"
                                title="Remove from group"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Dropzone/Plus selector to add ungrouped images to this specific group */}
                      {analysisResult.ungrouped.length > 0 && (
                        <div className="relative group/add">
                          <button className="w-20 h-16 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center text-zinc-650 hover:text-zinc-400 bg-zinc-950/20 transition-all">
                            <Plus className="w-5 h-5" />
                          </button>
                          
                          {/* Dropdown list of ungrouped items to add */}
                          <div className="absolute left-0 bottom-full mb-1.5 w-60 max-h-40 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg p-1 hidden group-focus-within/add:block group-hover/add:block z-30 shadow-2xl">
                            <div className="text-[10px] text-zinc-550 font-bold px-2 py-1 uppercase tracking-wider border-b border-zinc-850">Add to group:</div>
                            {analysisResult.ungrouped.map(filename => (
                              <button
                                key={filename}
                                onClick={() => handleAddToGroup(group.id, filename)}
                                className="w-full text-left text-xs text-zinc-300 hover:bg-zinc-850 hover:text-white px-2 py-1.5 rounded truncate transition-colors flex items-center gap-1.5"
                              >
                                <ArrowRight className="w-3 h-3 text-accent" />
                                {filename}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Ungrouped Images */}
                {analysisResult.ungrouped.length > 0 && (
                  <div className="border border-zinc-850/50 bg-zinc-950/10 p-4 rounded-xl space-y-2.5">
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ungrouped / Single Images ({analysisResult.ungrouped.length})</h4>
                    <div className="flex flex-wrap gap-3">
                      {analysisResult.ungrouped.map(filename => {
                        const previewUrl = getFilePreviewUrl(filename);
                        return (
                          <div key={filename} className="relative w-20 h-16 rounded-lg overflow-hidden border border-zinc-850 bg-zinc-900 group/ungrouped flex-shrink-0" title={filename}>
                            {previewUrl && <img src={previewUrl} alt="" className="w-full h-full object-cover" />}
                            {analysisResult.groups.length > 0 && (
                              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/ungrouped:opacity-100 transition-opacity flex items-center justify-center p-1">
                                <div className="relative group/move w-full">
                                  <button className="w-full text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 py-1 rounded font-semibold hover:bg-zinc-800 transition-colors">
                                    Group...
                                  </button>
                                  <div className="absolute bottom-full left-0 mb-1 w-44 bg-zinc-950 border border-zinc-850 rounded p-1 hidden group-focus-within/move:block group-hover/move:block z-30 shadow-2xl">
                                    {analysisResult.groups.map(g => (
                                      <button
                                        key={g.id}
                                        onClick={() => handleAddToGroup(g.id, filename)}
                                        className="w-full text-left text-xxs text-zinc-400 hover:bg-zinc-850 hover:text-white px-1.5 py-1 rounded truncate"
                                      >
                                        {g.suggested_name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="text-zinc-500 hover:text-zinc-350 text-xs font-semibold"
                >
                  Back to uploads
                </button>
                <button
                  onClick={handleSaveResult}
                  disabled={isSaving}
                  className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Groups...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Save Groups
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
