import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  FolderInput, 
  Trash2, 
  Download, 
  HardDrive, 
  Sparkles,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';
import { db } from '../db/db';
import { deleteGroup } from '../db/queries';
import { importGroup, exportGroup } from '../utils/zipUtils';
import GroupGrid from '../components/groups/GroupGrid';
import GroupCreateModal from '../components/groups/GroupCreateModal';
import GroupEditPanel from '../components/groups/GroupEditPanel';

export default function Home({ onOpenViewer, onOpenAutoGroup }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  
  // Selection / Batch actions
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);

  // Storage info
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percent: 0 });

  // Live queries
  const groups = useLiveQuery(() => db.groups.orderBy('updatedAt').reverse().toArray()) || [];

  // Fetch storage estimate
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        const percent = total > 0 ? (used / total) * 100 : 0;
        setStorageUsage({ used, total, percent });
      });
    }
  }, [groups]);

  const handleImportZip = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const newGroup = await importGroup(file);
      alert(`Successfully imported group: "${newGroup.name}"`);
    } catch (err) {
      console.error(err);
      alert(`Import failed: ${err.message}`);
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (confirm('Are you sure you want to delete this group and all its images?')) {
      await deleteGroup(groupId);
    }
  };

  // Batch actions
  const handleToggleSelect = (groupId) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedGroupIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedGroupIds.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selectedGroupIds.length} selected groups?`)) {
      for (const id of selectedGroupIds) {
        await deleteGroup(id);
      }
      setSelectedGroupIds([]);
      setIsSelectionMode(false);
    }
  };

  const handleBatchExport = async () => {
    if (selectedGroupIds.length === 0) return;
    try {
      for (const id of selectedGroupIds) {
        const group = groups.find(g => g.id === id);
        if (!group) continue;
        const images = await db.images.where({ groupId: id }).toArray();
        const sortedImages = group.imageIds
          .map(imgId => images.find(img => img.id === imgId))
          .filter(Boolean);
        await exportGroup(group, sortedImages);
      }
      setSelectedGroupIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      console.error(err);
      alert('Failed to export one or more groups');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background overflow-y-auto">
      {/* Home Header */}
      <header className="border-b border-zinc-900 px-6 py-6 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-accent/10 rounded-lg border border-accent/20">
                <Layers className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">LenStratify</h1>
            </div>
            <p className="text-zinc-500 text-sm">See through the layers. Compare image versions in high fidelity.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Import ZIP Button */}
            <label className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
              <FolderInput className="w-4 h-4" />
              Import ZIP
              <input
                type="file"
                accept=".zip"
                onChange={handleImportZip}
                className="hidden"
              />
            </label>

            {/* Selection Mode Button */}
            {groups.length > 0 && (
              <button
                onClick={handleToggleSelectionMode}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                  isSelectionMode
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-zinc-950 border-zinc-850 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isSelectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                Select Mode
              </button>
            )}

            {/* Auto Group Trigger */}
            <button
              onClick={onOpenAutoGroup}
              className="bg-zinc-950 border border-zinc-850 hover:border-zinc-750 text-zinc-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              Auto Group
            </button>

            {/* Create Group Trigger */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-accent/20"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          </div>
        </div>

        {/* Batch Action Toolbar */}
        {isSelectionMode && selectedGroupIds.length > 0 && (
          <div className="max-w-7xl mx-auto mt-4 bg-zinc-950 border border-accent/20 p-3 rounded-lg flex items-center justify-between shadow-inner">
            <span className="text-xs font-semibold text-accent">
              {selectedGroupIds.length} group{selectedGroupIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchExport}
                className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold px-2.5 py-1.5 rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 text-xs font-semibold px-2.5 py-1.5 rounded transition-colors border border-red-950"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 md:px-10">
        <GroupGrid
          groups={groups}
          onOpenViewer={onOpenViewer}
          onOpenEditPanel={setEditingGroupId}
          onDeleteGroup={handleDeleteGroup}
          onOpenCreateModal={() => setIsCreateOpen(true)}
          selectedGroupIds={selectedGroupIds}
          onToggleSelect={handleToggleSelect}
          isSelectionMode={isSelectionMode}
        />
      </main>

      {/* Storage Indicator Footer */}
      {storageUsage.percent > 0 && (
        <footer className="border-t border-zinc-900 bg-zinc-950/20 px-6 py-4 md:px-10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-zinc-550">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-zinc-650" />
              <span>Offline Database Storage</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-36 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                <div 
                  className={`h-full rounded-full ${
                    storageUsage.percent > 80 ? 'bg-red-500' : storageUsage.percent > 50 ? 'bg-yellow-500' : 'bg-accent'
                  }`}
                  style={{ width: `${storageUsage.percent}%` }}
                />
              </div>
              <span>
                {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.total)} ({Math.round(storageUsage.percent)}% used)
              </span>
            </div>
          </div>
          {storageUsage.percent > 80 && (
            <div className="max-w-7xl mx-auto mt-2 text-center text-[10px] font-semibold text-red-400 bg-red-950/20 py-1 rounded border border-red-950/30">
              Warning: Storage usage is high. Export your groups as ZIPs and delete unused ones to free up space.
            </div>
          )}
        </footer>
      )}

      {/* Modals & Panels */}
      <GroupCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onGroupCreated={onOpenViewer}
      />

      <GroupEditPanel
        groupId={editingGroupId}
        isOpen={editingGroupId !== null}
        onClose={() => setEditingGroupId(null)}
      />
    </div>
  );
}
