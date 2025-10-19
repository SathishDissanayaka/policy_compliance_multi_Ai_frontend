import React, { useState, useRef } from 'react';

export const useThinkingEntries = () => {
  const userIndexRef = useRef(null); // index of the user message we are currently thinking about
  const [thinkingMap, setThinkingMap] = useState({}); // { userIndex: [{type, payload}, ...] }
  const [collapsedMap, setCollapsedMap] = useState({}); // collapse state per userIndex

  const appendThinkingEntry = (userIdx, entry) => {
    if (userIdx == null || !entry || typeof entry.text !== "string") return;
    const trimmed = entry.text.trim();
    if (!trimmed) return;
    setThinkingMap((m) => {
      const arr = m[userIdx] ? [...m[userIdx]] : [];
      arr.push({ ...entry, text: trimmed });
      return { ...m, [userIdx]: arr };
    });
  };

  const formatThinkingEntry = (payload) => {
    if (!payload || typeof payload !== "object") return null;
    const pickString = (...values) => {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
      }
      return "";
    };

    if (payload.type === "search_start") {
      const text = pickString(payload.query, payload.message);
      return text ? { type: "search_start", text } : null;
    }

    if (payload.type === "search_results") {
      const text = pickString(payload.message, payload.summary);
      const urls = Array.isArray(payload.urls) ? payload.urls.filter(Boolean) : [];
      if (!text && urls.length === 0) return null;
      return { type: "search_results", text, urls };
    }

    if (payload.type === "content" || payload.type === "thinking") {
      const text = pickString(payload.content, payload.message, payload.preview);
      return text ? { type: "content", text } : null;
    }

    if (payload.type === "raw") {
      const text = pickString(payload.raw);
      return text ? { type: "text", text } : null;
    }

    if (payload.type === "event") {
      const inner = payload.event && typeof payload.event === "object" ? payload.event : {};
      if (inner.type === "llm_stream") {
        const text = pickString(inner.content);
        return text ? { type: "content", text } : null;
      }
      const nodeLabel = typeof inner.node === "string" && inner.node.trim() ? `[${inner.node.trim()}] ` : "";
      const text = pickString(inner.message, inner.content, payload.message);
      const combined = `${nodeLabel}${text}`.trim();
      return combined ? { type: "text", text: combined } : null;
    }

    const text = pickString(payload.content, payload.message, payload.preview);
    return text ? { type: "text", text } : null;
  };

  const initializeThinkingSlot = (userIdx) => {
    userIndexRef.current = userIdx;
    setThinkingMap((m) => ({ ...m, [userIdx]: [] }));
  };

  const clearThinkingSlot = (userIdx) => {
    setThinkingMap((m) => {
      const updated = { ...m };
      delete updated[userIdx];
      return updated;
    });
  };

  const collapseThinking = (userIdx) => {
    setCollapsedMap((c) => ({ ...c, [userIdx]: true }));
  };

  const toggleCollapse = (userIdx) => {
    setCollapsedMap((c) => ({ ...c, [userIdx]: !c[userIdx] }));
  };

  const processThinkingPayload = (payload, userIdx) => {
    switch (payload.type) {
      case 'final':
        const finalContent = payload.content && String(payload.content).trim()
          ? String(payload.content)
          : (() => {
              const entries = thinkingMap[userIdx] || [];
              const textParts = entries
                .map((e) => e.text || e.content || e.preview || e.raw || '')
                .filter(Boolean);
              return textParts.join('');
            })();

        collapseThinking(userIdx);
        return { type: 'final', content: finalContent || '(no content)' };

      case 'thinking':
        if (userIdx != null) {
          const entry = formatThinkingEntry(payload);
          appendThinkingEntry(userIdx, entry);
        }
        return { type: 'thinking', processed: true };

      case 'error':
        if (userIdx != null) {
          clearThinkingSlot(userIdx);
        }
        return { type: 'error', message: `Error: ${payload.error}` };

      default:
        if (userIdx != null) {
          const entry = formatThinkingEntry(payload);
          appendThinkingEntry(userIdx, entry);
        }
        return { type: 'other', processed: true };
    }
  };

  const renderThinkingEntries = (entries, isCollapsed, onToggleCollapse) => {
    if (!entries || entries.length === 0) return null;

    return (
      <div className="flex justify-start mt-1">
        <div className="flex flex-col text-xs text-gray-600 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-700">Thinking...</span>
            <button
              onClick={onToggleCollapse}
              className="text-blue-600 text-xs"
            >
              {isCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
          {!isCollapsed && (
            <div className="space-y-1">
              {entries.map((entry, i) => {
                if (entry.type === "search_start") {
                  return (
                    <div key={i} className="whitespace-pre-wrap break-words">
                      🔎 Searching: {entry.text}
                    </div>
                  );
                }
                if (entry.type === "search_results") {
                  const urls = Array.isArray(entry.urls) ? entry.urls.filter(Boolean) : [];
                  return (
                    <div key={i} className="whitespace-pre-wrap break-words">
                      🔗 Results: {urls.length ? urls.join(", ") : entry.text}
                      {entry.text && urls.length ? ` — ${entry.text}` : ""}
                    </div>
                  );
                }
                if (!entry.text) return null;
                const prefix = entry.type === "content" ? "• " : "· ";
                return (
                  <div key={i} className="whitespace-pre-wrap break-words">
                    {prefix}
                    {entry.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return {
    // State
    userIndexRef,
    thinkingMap,
    collapsedMap,
    
    // Core functions
    appendThinkingEntry,
    formatThinkingEntry,
    initializeThinkingSlot,
    clearThinkingSlot,
    collapseThinking,
    toggleCollapse,
    processThinkingPayload,
    
    // UI helper
    renderThinkingEntries,
  };
};