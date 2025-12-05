
import React, { useState } from 'react';

type Status = 'discovery' | 'analysis' | 'drafting' | 'execution';

interface Task {
  id: string;
  content: string;
  category: 'evidence' | 'legal' | 'risk';
  status: Status;
}

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: 'discovery', label: 'Discovery & Evidence', color: 'border-blue-500' },
  { id: 'analysis', label: 'Legal Analysis', color: 'border-yellow-500' },
  { id: 'drafting', label: 'Drafting & Review', color: 'border-indigo-500' },
  { id: 'execution', label: 'Execution & Filing', color: 'border-green-500' },
];

const INITIAL_TASKS: Task[] = [
  { id: '1', content: 'Upload Promissory Note for UCC Scan', category: 'evidence', status: 'discovery' },
  { id: '2', content: 'Identify Governing State Law', category: 'legal', status: 'discovery' },
  { id: '3', content: 'Analyze "Confession of Judgment" Risk', category: 'risk', status: 'analysis' },
  { id: '4', content: 'Verify Negotiability (UCC 3-104)', category: 'legal', status: 'analysis' },
  { id: '5', content: 'Draft Security Agreement', category: 'legal', status: 'drafting' },
];

export const CaseBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    if (draggedTaskId) {
      setTasks(prev => prev.map(t => 
        t.id === draggedTaskId ? { ...t, status } : t
      ));
      setDraggedTaskId(null);
    }
  };

  const addTask = () => {
    if (!newTaskContent.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      content: newTaskContent,
      category: 'legal',
      status: 'discovery'
    };
    setTasks([...tasks, newTask]);
    setNewTaskContent('');
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const getCategoryColor = (cat: Task['category']) => {
    switch (cat) {
      case 'evidence': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'legal': return 'text-neutral-400 bg-neutral-800 border-neutral-700';
      case 'risk': return 'text-red-400 bg-red-400/10 border-red-400/20';
    }
  };

  return (
    <div className="h-full flex flex-col bg-black font-mono p-4 md:p-8 overflow-hidden">
      {/* Header */}
      <div className="mb-8 border-b border-neutral-800 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Strategic Case Map</h2>
          <p className="text-neutral-500 text-xs tracking-wider">
            Drag and drop to organize your legal strategy. Build your map through research.
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add new research item..."
            className="bg-neutral-900 border border-neutral-700 text-white text-xs px-4 py-2 rounded-md outline-none focus:border-white min-w-[200px]"
          />
          <button 
            onClick={addTask}
            className="px-4 py-2 bg-white text-black text-xs font-bold uppercase rounded-md hover:bg-neutral-200"
          >
            Add Node
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-6 h-full min-w-[1000px]">
          {COLUMNS.map(column => (
            <div 
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="flex-1 flex flex-col min-w-[250px] bg-neutral-900/30 border border-neutral-800 rounded-lg backdrop-blur-sm"
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-neutral-800 ${column.color.replace('border', 'border-t-4')} bg-black/50`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">{column.label}</h3>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {tasks.filter(t => t.status === column.id).length}
                  </span>
                </div>
              </div>

              {/* Drop Zone */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-hide">
                {tasks.filter(t => t.status === column.id).map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="group bg-black border border-neutral-800 p-3 rounded hover:border-neutral-600 cursor-grab active:cursor-grabbing shadow-lg transition-all hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider ${getCategoryColor(task.category)}`}>
                        {task.category}
                      </span>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="text-neutral-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {task.content}
                    </p>
                  </div>
                ))}
                
                {tasks.filter(t => t.status === column.id).length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-neutral-800/50 rounded m-2">
                    <span className="text-[10px] text-neutral-700 uppercase tracking-widest">Drop Here</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
