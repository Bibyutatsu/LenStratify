import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import GroupCard from './GroupCard';

export default function GroupGrid({ 
  groups, 
  onOpenViewer, 
  onOpenEditPanel, 
  onDeleteGroup,
  onOpenCreateModal,
  selectedGroupIds,
  onToggleSelect,
  isSelectionMode
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups..."
            className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-accent text-zinc-100 rounded-lg pl-10 pr-4 py-2.5 outline-none transition-colors placeholder:text-zinc-650 text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 border border-zinc-850 rounded-xl bg-zinc-950/20">
          <p className="text-zinc-400 font-medium mb-1">No groups found</p>
          <p className="text-zinc-600 text-sm mb-4">
            {searchQuery ? 'Try adjusting your search query.' : 'Create a group to start comparing images.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenCreateModal}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGroups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onOpenViewer={onOpenViewer}
              onOpenEditPanel={onOpenEditPanel}
              onDeleteGroup={onDeleteGroup}
              isSelected={selectedGroupIds.includes(group.id)}
              onToggleSelect={onToggleSelect}
              isSelectionMode={isSelectionMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
