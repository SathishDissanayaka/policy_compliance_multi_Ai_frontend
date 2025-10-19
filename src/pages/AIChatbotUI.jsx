import React, { useState, useRef, useEffect } from "react";
import {
  getOrCreateSession,
  setCurrentSessionId,
  clearCurrentSessionId,
} from "../utils/sessionManager";
import uuidv4 from "../utils/uuid";
import supabase from "../utils/client";
import {
  Search,
  Mic,
  Send,
  Plus,
  Settings,
  BookOpenCheck,
  Clock,
  Sparkles,
  BookOpen,
  X,
  FileText,
  Image as ImageIcon,
  LogOut,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getToken } from "../lib/auth";
import { useThinkingEntries } from "../hooks/useThinkingEntries.jsx";
import ChatSessionSidebar from "../components/chat/ChatSessionSidebar.jsx";
import { listSessions, getSessionMessages, deleteSession } from "../api/chat";
import { useNavigate, useSearchParams } from "react-router-dom";

const AIChatbotUI = ({ subscription, role }) => {
  console.log("AIChatbotUI rendered with subscription:", subscription);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sessionID, setSessionID] = useState(() => getOrCreateSession());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const botIndexRef = useRef(null); // (kept for backward compatibility)
  const recognitionRef = useRef(null);
  const voiceSeedRef = useRef("");
  const inputValueRef = useRef("");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Use the thinking entries hook
  const {
    userIndexRef,
    thinkingMap,
    collapsedMap,
    initializeThinkingSlot,
    clearThinkingSlot,
    collapseThinking,
    toggleCollapse,
    processThinkingPayload,
    renderThinkingEntries,
  } = useThinkingEntries();

  const isImageFile = (file) => {
    if (!file) return false;
    const type = file.type || "";
    const name = (file.name || "").toLowerCase();
    return (
      (type && type.startsWith("image/")) ||
      [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"].some((ext) =>
        name.endsWith(ext)
      )
    );
  };

  const isSupportedDocument = (file) => {
    if (!file) return false;
    const type = file.type || "";
    const name = (file.name || "").toLowerCase();
    const docTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const docExts = [".pdf", ".doc", ".docx", ".txt"];
    return docTypes.includes(type) || docExts.some((ext) => name.endsWith(ext));
  };

  const clearAttachmentPreview = () => {
    setAttachmentPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const resetAttachment = () => {
    setAttachedFile(null);
    clearAttachmentPreview();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) {
        URL.revokeObjectURL(attachmentPreviewUrl);
      }
    };
  }, [attachmentPreviewUrl]);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      voiceSeedRef.current = inputValueRef.current || "";
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      const base = voiceSeedRef.current
        ? `${voiceSeedRef.current} `.trim()
        : "";
      const composed = `${base} ${transcript}`.trim();
      setInputValue(composed);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  // Save session ID to localStorage whenever it changes
  useEffect(() => {
    if (sessionID) {
      setCurrentSessionId(sessionID);
    }
  }, [sessionID]);

  // Fetch sessions on mount
  useEffect(() => {
    let mounted = true;
    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError(null);
      try {
        const data = await listSessions();
        if (!mounted) return;
        setSessions(data);
      } catch (e) {
        if (!mounted) return;
        setSessionsError(e.message || String(e));
      } finally {
        if (mounted) setSessionsLoading(false);
      }
    }
    loadSessions();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync selected session with URL (?session=)
  useEffect(() => {
    const fromUrl = searchParams.get("session");
    if (fromUrl && fromUrl !== sessionID) {
      setSessionID(fromUrl);
    }
  }, [searchParams]);

  // When session changes, reflect in URL and load messages
  useEffect(() => {
    if (!sessionID) return;
    const current = searchParams.get("session");
    if (current !== sessionID) {
      const next = new URLSearchParams(searchParams);
      next.set("session", sessionID);
      setSearchParams(next, { replace: true });
    }
    // Load messages for this session
    let mounted = true;
    async function loadMessages() {
      setMessagesLoading(true);
      try {
        const data = await getSessionMessages(sessionID);
        if (!mounted) return;
        const mapped = (data.messages || []).map((m) => ({
          text: m.content || "",
          sender: m.role === "user" ? "user" : "bot",
          hasAttachment: false,
          attachment: null,
        }));
        setMessages(mapped);
      } catch (_e) {
        // If 404/403, just start fresh
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setMessagesLoading(false);
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [sessionID]);

  const handleLogout = async () => {
    clearCurrentSessionId(); // Clear session ID from localStorage
    await supabase.auth.signOut();
    window.location.href = "/login"; // force redirect to login
  };

  const handleNewChat = () => {
    // Generate new session ID
    const newSessionId = uuidv4();
    setSessionID(newSessionId);
    setCurrentSessionId(newSessionId);
    const next = new URLSearchParams(searchParams);
    next.set("session", newSessionId);
    setSearchParams(next, { replace: true });

    // Clear messages and attachments
    setMessages([]);
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectSession = (id) => {
    if (!id) return;
    setSessionID(id);
  };

  const handleDeleteSession = async (id) => {
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (id === sessionID) {
        handleNewChat();
      }
    } catch (e) {
      // no-op: could add toast later
      console.error(e);
    }
  };

  const handleFileAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageSelected = isImageFile(file);
    const documentSelected = isSupportedDocument(file);

    if (!imageSelected && !documentSelected) {
      alert(
        "Unsupported file type. Please upload a PDF, DOC, DOCX, TXT, or an image (PNG, JPG, TIFF, BMP)."
      );
      resetAttachment();
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to Supabase storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileName);

      if (imageSelected) {
        const previewUrl = URL.createObjectURL(file);
        setAttachmentPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return previewUrl;
        });
      } else {
        clearAttachmentPreview();
      }

      setAttachedFile({
        name: file.name,
        url: publicUrl,
        isImage: imageSelected,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("There was a problem uploading the file. Please try again.");
      resetAttachment();
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;

    // Add user message immediately and prepare thinking slot
    const messageWithAttachment = {
      text: userMessage,
      sender: "user",
      hasAttachment: !!attachedFile,
      attachment: attachedFile
        ? {
            name: attachedFile.name,
            url: attachedFile.url,
            isImage: !!attachedFile.isImage,
          }
        : null,
    };

    setMessages((prev) => {
      const userIdx = prev.length;
      initializeThinkingSlot(userIdx);
      return [...prev, messageWithAttachment];
    });
    setInputValue("");

    const requestBody = {
      session_id: sessionID,
      message: userMessage,
      document_url: attachedFile?.url ?? null,
      document_type: attachedFile
        ? attachedFile.isImage
          ? "image"
          : "document"
        : null,
    };

    // Log the request being sent to the server
    console.log("Sending request to server:", {
      url: "http://127.0.0.1:5000/queries/analyze/stream",
      method: "POST",
      body: requestBody,
    });

    try {
      const resp = await fetch("http://127.0.0.1:5000/queries/analyze/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify(requestBody),
      });

      // If server doesn't support streaming body, fallback to JSON
      if (!resp.body) {
        const data = await resp.json();
        setMessages((prev) => [...prev, { text: String(data), sender: "bot" }]);
        if (attachedFile) {
          setAttachedFile(null);
          fileInputRef.current.value = "";
        }
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // prepare streaming refs
      botIndexRef.current = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // remaining partial chunk

        for (const part of parts) {
          if (!part.trim()) continue;

          // collect all data: lines (ignore other fields)
          const lines = part
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          const dataLines = lines.filter((l) => l.startsWith("data:"));
          if (dataLines.length === 0) continue;

          // join multiple data: lines if present
          const jsonText = dataLines
            .map((l) => l.replace(/^data:\s?/, ""))
            .join("\n");
          let payload = null;
          try {
            payload = JSON.parse(jsonText);
          } catch (err) {
            // non-JSON data, append raw
            payload = { type: "raw", raw: jsonText };
          }

          // Handle payload using the thinking hook
          const userIdx = userIndexRef.current;
          const result = processThinkingPayload(payload, userIdx);

          if (result.type === "final") {
            setMessages((prev) => [
              ...prev,
              { text: result.content, sender: "bot" },
            ]);
            // Clear attachment after final response
            if (attachedFile) {
              setAttachedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }
          } else if (result.type === "error") {
            setMessages((prev) => [
              ...prev,
              { text: result.message, sender: "bot" },
            ]);
            // Clear attachment on error
            if (attachedFile) {
              setAttachedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }
          } else if (payload.type === "checkpoint") {
            if (payload.checkpoint_id) setSessionID(payload.checkpoint_id);
          }
        }
      }

      // Handle remaining buffer if it contains an event without trailing \n\n
      if (buffer.trim()) {
        const lines = buffer
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const dataLines = lines.filter((l) => l.startsWith("data:"));
        if (dataLines.length) {
          const jsonText = dataLines
            .map((l) => l.replace(/^data:\s?/, ""))
            .join("\n");
          try {
            const payload = JSON.parse(jsonText);
            const userIdx = userIndexRef.current;
            processThinkingPayload(payload, userIdx);
          } catch (e) {
            // Ignore invalid JSON
          }
        }
      }

      // finally, close reader (done automatically when done)
      try {
        await reader.cancel();
      } catch (e) {}
    } catch (error) {
      console.error("Error streaming response:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Error contacting backend (stream).", sender: "bot" },
      ]);
      // Clear attachment on error
      if (attachedFile) {
        setAttachedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    if (!voiceSupported || !recognitionRef.current) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error("Speech recognition start/stop error", error);
      setIsListening(false);
    }
  };

  const featureCards = [
    {
      icon: (
        <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-sm"></div>
        </div>
      ),
      title:
        "Ensure fair and transparent policy compliance with ethical data handling practices.",
      category: "Transparency",
      color: "bg-white",
    },
    {
      icon: (
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          ✓
        </div>
      ),
      title: "Summarize the key points from the company's data privacy policy.",
      category: "Planning",
      color: "bg-white",
    },
  ];

  const quickActions = [
    {
      icon: <BookOpen className="w-4 h-4" />,
      label: "Policy Analysis",
      color: "bg-gray-800 text-white",
    },
    {
      icon: <Search className="w-4 h-4" />,
      label: "Compliance Check",
      color: "bg-gray-800 text-white",
    },
    {
      icon: <Settings className="w-4 h-4" />,
      label: "Recomendations",
      color: "bg-gray-800 text-white",
    },
    {
      icon: <FileText className="w-4 h-4" />,
      label: "Audit Report",
      color: "bg-gray-800 text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      {/* Floating quick actions + sidebar opener when closed */}
      <div
        className={`fixed top-4 flex flex-col space-y-3 z-20 ${
          sidebarOpen ? "left-4 md:left-[20rem]" : "left-4"
        }`}
      >
        {!sidebarOpen && (
          <button
            className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center text-gray-700 shadow hover:bg-gray-50 transition-colors"
            onClick={() => setSidebarOpen(true)}
            title="Open sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <button
          className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
          onClick={handleNewChat}
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => (window.location.href = "/documents")}
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        {(subscription == "Standard" || subscription == "Premium") && (
          <button
            onClick={() => (window.location.href = "/analyze")}
            className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
            title="Policy Analyzer"
          >
            <BookOpenCheck className="w-5 h-5" />
          </button>
        )}
        {/* Admin Dashboard Button */}
        {role === "admin" && (
          <button
            onClick={() => (window.location.href = "/admin")}
            className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
            title="Admin Dashboard"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}
        <button className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors">
          <Clock className="w-5 h-5" />
        </button>
        <button
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex min-h-screen">
        {sidebarOpen ? (
          <ChatSessionSidebar
            sessions={sessions}
            selectedId={sessionID}
            onSelect={handleSelectSession}
            onNew={handleNewChat}
            onDelete={handleDeleteSession}
            loading={sessionsLoading}
            error={sessionsError}
            isOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />
        ) : (
          <div className="w-0 md:w-6" />
        )}
        <div className="flex flex-col flex-1 px-6 pb-32">
          {/* Header */}
          <div className="w-full max-w-4xl mx-auto mb-8 pt-20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700 font-medium">
                  Assistant v2.6
                </span>
              </div>
              <h1 className="text-lg font-semibold text-gray-800">
                Your Policy Compliance Agent
              </h1>
              <button
                onClick={() => (window.location.href = "/subscription")}
                className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <Sparkles className="w-4 h-4 inline mr-1" />
                Upgrade
              </button>
            </div>

            {/* Sidebar toggle + Main Title and Bot - Only show if no messages */}
            {messages.length === 0 && (
              <div className="text-center mb-12">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="px-3 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                  </button>
                </div>
                <div className="relative inline-block">
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                    Hi Adithya, Ready to
                    <br />
                    Ensure Policy Compliance?
                  </h2>

                  {/* AI Bot Character */}
                  <div className="absolute -right-32 top-0 hidden lg:block">
                    <div className="relative">
                      <div className="w-24 h-32 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center">
                        <div className="w-12 h-8 bg-gray-800 rounded-full mb-2 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        </div>
                        <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="absolute -top-8 -right-4 bg-white rounded-lg px-3 py-2 shadow-md">
                        <p className="text-xs text-gray-600">Ready to help!</p>
                        <p className="text-xs text-gray-600">
                          Let's ensure compliance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Cards - Only show if no messages */}
            {messages.length === 0 && (
              <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-2xl mx-auto">
                {featureCards.map((card, index) => (
                  <div
                    key={index}
                    className={`${card.color} rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                    onClick={() => setInputValue(card.title)}
                  >
                    <div className="mb-4">{card.icon}</div>
                    <p className="text-gray-800 font-medium text-sm mb-3 leading-relaxed">
                      {card.title}
                    </p>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                      {card.category}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            {messagesLoading && (
              <div className="w-full max-w-3xl mx-auto mb-8 text-sm text-gray-500">
                Loading messages...
              </div>
            )}
            {!messagesLoading && messages.length > 0 && (
              <div className="w-full max-w-3xl mx-auto mb-8 space-y-4">
                {messages.map((message, index) => {
                  const isUser = message.sender === "user";
                  const thinkingEntries = thinkingMap[index] || [];
                  const isCollapsed = !!collapsedMap[index];

                  return (
                    <React.Fragment key={index}>
                      <div className="flex">
                        {isUser ? (
                          <div className="ml-auto max-w-3xl">
                            <div className="rounded-2xl px-4 py-3 bg-gray-900 text-white break-words">
                              {message.hasAttachment && message.attachment && (
                                <div className="mb-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs text-gray-300">
                                      {message.attachment.name}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Document attached
                                  </p>
                                </div>
                              )}
                              <p className="text-sm">{message.text}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full">
                            <div className="px-0 py-3">
                              <ReactMarkdown
                                children={message.text}
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h1
                                      className="text-xl font-bold my-2"
                                      {...props}
                                    />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2
                                      className="text-lg font-bold my-2"
                                      {...props}
                                    />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3
                                      className="text-md font-semibold my-1"
                                      {...props}
                                    />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-bold" {...props} />
                                  ),
                                  em: ({ node, ...props }) => (
                                    <em className="italic" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="ml-4 list-disc" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="text-sm mb-2" {...props} />
                                  ),
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {isUser &&
                        renderThinkingEntries(
                          thinkingEntries,
                          isCollapsed,
                          () => toggleCollapse(index)
                        )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Input Section */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 pt-4 pb-4 px-6 border-t border-gray-200 ${
          sidebarOpen ? "md:pl-72" : "md:pl-0"
        }`}
      >
        <div className="w-full max-w-4xl mx-auto">
          {/* Pro Plan Notice - Only show if no messages */}
          {messages.length === 0 && (
            <div className="text-center mb-6">
              <p className="text-gray-600 text-sm">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Ethical AI • Fair • Transparent • Secure Policy Analysis
              </p>
            </div>
          )}

          {/* Document Attachment Display */}
          {attachedFile && (
            <div className="bg-white rounded-xl shadow-md p-4 mb-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center overflow-hidden">
                    {attachedFile.isImage && attachmentPreviewUrl ? (
                      <img
                        src={attachmentPreviewUrl}
                        alt="Attachment preview"
                        className="w-full h-full object-cover"
                      />
                    ) : attachedFile.isImage ? (
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {attachedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {attachedFile.isImage
                        ? "Image attached"
                        : "Document attached"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAttachedFile(null);
                    fileInputRef.current.value = "";
                  }}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* File Upload Area - Show when uploading */}
          {isUploading && (
            <div className="bg-white rounded-xl shadow-md p-4 mb-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Uploading document...
                  </p>
                  <p className="text-xs text-gray-500">Please wait</p>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileAttachment}
                accept=".pdf,.doc,.docx,.txt,image/*,.tif,.tiff,.bmp"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach document or image"
              >
                {attachedFile ? (
                  attachedFile.isImage ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={
                    attachedFile
                      ? "Ask about policy compliance in your document..."
                      : 'Example: "Check if this policy meets GDPR compliance requirements"'
                  }
                  className="w-full text-gray-600 placeholder-gray-400 bg-transparent outline-none"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={!voiceSupported}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isListening
                      ? "bg-gray-900 text-white animate-pulse"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } ${!voiceSupported ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={
                    voiceSupported
                      ? isListening
                        ? "Listening…"
                        : "Start voice input"
                      : "Voice input not supported"
                  }
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                  onClick={handleSendMessage}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions - Only show if no messages */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-3 justify-center">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className={`${action.color} px-4 py-2 rounded-full text-sm font-medium hover:opacity-80 transition-opacity flex items-center space-x-2`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
              <button className="bg-gray-800 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Logo */}
        <div className="fixed bottom-4 left-4">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatbotUI;
