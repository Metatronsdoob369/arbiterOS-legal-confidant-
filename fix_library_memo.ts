import fs from 'fs';

let content = fs.readFileSync('components/Library.tsx', 'utf-8');

// The code review mentions floating promises and display name.
// 1. Change prop types to allow Promise<void>
// 2. Add MemoizedLibraryItem.displayName

content = content.replace(
  `const MemoizedLibraryItem = React.memo<{
  item: LibraryItem;
  onTogglePin: (item: LibraryItem) => void;
  onDelete: (id: string) => void;
}>(({ item, onTogglePin, onDelete }) => (`,
  `const MemoizedLibraryItem = React.memo<{
  item: LibraryItem;
  onTogglePin: (item: LibraryItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}>(({ item, onTogglePin, onDelete }) => (`
);

content = content.replace(
  `        <button onClick={() => onTogglePin(item)} className="text-xs" title="Pin/Unpin">📌</button>
        <button onClick={() => onDelete(item.id)} className="text-xs text-red-400" title="Delete">×</button>`,
  `        <button onClick={() => void onTogglePin(item)} className="text-xs" title="Pin/Unpin">📌</button>
        <button onClick={() => void onDelete(item.id)} className="text-xs text-red-400" title="Delete">×</button>`
);

content = content.replace(
  `    </div>
  </div>
));`,
  `    </div>
  </div>
));
MemoizedLibraryItem.displayName = 'MemoizedLibraryItem';`
);

fs.writeFileSync('components/Library.tsx', content, 'utf-8');
