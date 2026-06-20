import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import CompareViewer from './components/viewer/CompareViewer';
import AutoGroupModal from './components/autogroup/AutoGroupModal';
import { db } from './db/db';
import { createGroup } from './db/queries';

let isSeedingTriggered = false;

function App() {
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [isAutoGroupOpen, setIsAutoGroupOpen] = useState(false);

  useEffect(() => {
    async function checkAndSeed() {
      if (isSeedingTriggered) return;
      try {
        const count = await db.groups.count();
        if (count === 0) {
          isSeedingTriggered = true;
          console.log("No groups found. Seeding default groups from groups.txt...");
          const res = await fetch('http://localhost:8000/api/seed-groups');
          if (!res.ok) {
            isSeedingTriggered = false;
            throw new Error("Failed to fetch seed groups");
          }
          const data = await res.json();
          for (const group of data.groups) {
            const files = [];
            const labels = [];
            for (let i = 0; i < group.images.length; i++) {
              const img = group.images[i];
              const byteCharacters = atob(img.content_b64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let j = 0; j < byteCharacters.length; j++) {
                byteNumbers[j] = byteCharacters.charCodeAt(j);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: img.mime });
              const file = new File([blob], img.filename, { type: img.mime });
              files.push(file);
              labels.push(`Version ${i + 1}`);
            }
            if (files.length > 0) {
              await createGroup(group.name, files, labels);
            }
          }
          console.log("Seeding complete!");
        }
      } catch (err) {
        isSeedingTriggered = false;
        console.error("Error seeding groups:", err);
      }
    }
    checkAndSeed();
  }, []);

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

