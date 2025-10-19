import React from "react";
import { Plus, Trash2, Loader2, ChevronLeft } from "lucide-react";

export default function ChatSessionSidebar({
  sessions,
  selectedId,
  onSelect,
  onNew,
  onDelete,
  loading = false,
  error = null,
  isOpen = true,
  onToggleSidebar,
}) {
  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 z-30 border-r border-gray-200 bg-white shadow-sm">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                title="Hide sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-gray-700">Chats</h2>
          </div>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-800"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {loading && (
          <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions...
          </div>
        )}

        {error && !loading && (
          <div className="p-4 text-sm text-red-600">{String(error)}</div>
        )}

        {!loading && !error && (!sessions || sessions.length === 0) && (
          <div className="p-4 text-sm text-gray-500">No chats yet. Start a new one.</div>
        )}

        <ul className="flex-1 overflow-y-auto">
          {(sessions || []).map((s) => {
            const active = s.id === selectedId;
            const title = s.title && s.title.trim() ? s.title : "Untitled chat";
            const updatedAt = s.updated_at || s.created_at || null;
            const timestamp = updatedAt ? new Date(updatedAt) : null;
            const subtitle = timestamp ? timestamp.toLocaleString() : "";
            return (
              <li key={s.id} className={`group border-b border-gray-100 ${active ? "bg-gray-50" : ""}`}>
                <button
                  onClick={() => onSelect && onSelect(s.id)}
                  className="w-full text-left p-3 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className={`text-sm ${active ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>{title}</div>
                      <div className="text-xs text-gray-500">{subtitle}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!onDelete) return;
                        if (confirm("Delete this chat? This cannot be undone.")) {
                          onDelete(s.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                      title="Delete chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}


