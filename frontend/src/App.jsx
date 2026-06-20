import { useState } from 'react';
import Home from './pages/Home';
import CompareViewer from './components/viewer/CompareViewer';
import AutoGroupModal from './components/autogroup/AutoGroupModal';
function App() {
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [isAutoGroupOpen, setIsAutoGroupOpen] = useState(false);

  return (
    <div className="w-full h-full flex flex-col bg-background text-zinc-100 overflow-hidden">
      {activeGroupId ? (
        <CompareViewer 
          groupId={activeGroupId} 
          onClose={() => setActiveGroupId(null)} 
        />
      ) : (
        <Home 
          onOpenViewer={setActiveGroupId} 
          onOpenAutoGroup={() => setIsAutoGroupOpen(true)} 
        />
      )}

      <AutoGroupModal
        isOpen={isAutoGroupOpen}
        onClose={() => setIsAutoGroupOpen(false)}
        onGroupsSaved={() => {
          // You could run a trigger or toast notification here
          console.log("Groups successfully imported from AutoGroup");
        }}
      />
    </div>
  );
}

export default App;

