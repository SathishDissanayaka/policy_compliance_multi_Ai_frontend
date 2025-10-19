import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings,
  Sparkles,
  Search,
  Users,
  Clock,
  Plus,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  BookOpenCheck,
  Rocket,
} from "lucide-react";
import supabase from "../utils/client";
import uuidv4 from "../utils/uuid";
import { getToken } from "../lib/auth";

const PolicyAnalyzerUI = ({ subscription, role }) => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] =
    useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [recommendationError, setRecommendationError] = useState(null);
  const [pairedContexts, setPairedContexts] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionID, setSessionID] = useState(uuidv4());
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [showInternationalPolicies, setShowInternationalPolicies] =
    useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const isPdfFile = (file) => {
    if (!file) return false;
    const type = file.type;
    const name = (file.name || "").toLowerCase();
    return type === "application/pdf" || name.endsWith(".pdf");
  };

  const isImageFile = (file) => {
    if (!file) return false;
    const type = file.type;
    const name = (file.name || "").toLowerCase();
    return (
      (type && type.startsWith("image/")) ||
      [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"].some((ext) =>
        name.endsWith(ext)
      )
    );
  };

  const internationalPolicies = [
    {
      id: "gdpr",
      name: "General Data Protection Regulation (GDPR) (EU Data Privacy)",
    },
    {
      id: "hipaa",
      name: "Health Insurance Portability and Accountability Act (HIPAA) (U.S. Healthcare Data Privacy)",
    },
  ];

  // Load PDF.js library and render PDF
  useEffect(() => {
    // Add meta tag to prevent browser zooming
    const viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    viewportMeta.content =
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    document.head.appendChild(viewportMeta);

    // Cleanup function to remove the meta tag
    return () => {
      document.head.removeChild(viewportMeta);
    };
  }, []);

  useEffect(() => {
    if (!uploadedFile?.file) return;

    const file = uploadedFile.file;

    if (isPdfFile(file)) {
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPdfDoc(null);
      setTotalPages(0);
      setCurrentPage(1);
      loadPdf(file);
    } else if (isImageFile(file)) {
      setPdfDoc(null);
      setTotalPages(0);
      setCurrentPage(1);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });
    }
  }, [uploadedFile]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale]);

  const loadPdf = async (file) => {
    setIsLoadingPdf(true);
    try {
      // Load PDF.js library if not already loaded
      if (!window.pdfjsLib) {
        try {
          // First load the main PDF.js library
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () =>
              reject(new Error("Failed to load PDF.js library"));
            document.head.appendChild(script);
          });

          // Then load and set up the worker
          const workerScript = document.createElement("script");
          workerScript.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          await new Promise((resolve, reject) => {
            workerScript.onload = resolve;
            workerScript.onerror = () =>
              reject(new Error("Failed to load PDF.js worker"));
            document.head.appendChild(workerScript);
          });

          // Set worker path after both scripts are loaded
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          console.log("PDF.js and worker loaded successfully");
        } catch (loadError) {
          console.error("Error loading PDF.js dependencies:", loadError);
          throw loadError;
        }
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
        .promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error loading PDF:", error);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const renderPage = async (pageNum) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const [touchDistance, setTouchDistance] = useState(null);

  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      setScale((prevScale) => Math.min(Math.max(prevScale + delta, 0.5), 3));
    }
  };

  const getTouchDistance = (touches) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setTouchDistance(getTouchDistance(e.touches));
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);

      if (touchDistance) {
        const scale_factor = (newDistance - touchDistance) * 0.01;
        setScale((prevScale) =>
          Math.min(Math.max(prevScale + scale_factor, 0.5), 3)
        );
      }

      setTouchDistance(newDistance);
    }
  };

  const handleTouchEnd = () => {
    setTouchDistance(null);
  };
  const clearSelectedFile = () => {
    setUploadedFile(null);
    setAnalysisResults([]);
    setPairedContexts([]);
    setRecommendationError(null);
    setAttachedFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setIsLoadingPdf(false);
    setIsUploading(false);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFileSelection = async (file) => {
    if (!file) return;

    const pdfSelected = isPdfFile(file);
    const imageSelected = isImageFile(file);

    if (!pdfSelected && !imageSelected) {
      alert(
        "Unsupported file type. Please upload a PDF or image (PNG, JPG, TIFF, BMP)."
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploadedFile({
      name: file.name,
      size: file.size,
      file,
    });
    setAnalysisResults([]);
    setPairedContexts([]);
    setRecommendationError(null);
    setAttachedFile(null);

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(fileName);

      setAttachedFile({
        name: file.name,
        url: publicUrl,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("There was a problem uploading the file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    processFileSelection(files[0]);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileSelection(file);
  };

  const handleAnalyze = async () => {
    if (isUploading) {
      alert("Please wait for the document upload to finish before analyzing.");
      return;
    }

    if (!attachedFile?.url) {
      alert("Please upload a document before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    const sessionId = sessionID || uuidv4();
    console.log("sending file url for analysis:", attachedFile?.url);
    console.log("selected policies:", selectedPolicies);

    try {
      const response = await fetch("http://127.0.0.1:5000/documents/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          document_url: attachedFile?.url,
          selected_policies: selectedPolicies,
        }),
      });

      if (!response.ok) {
        console.error("Server error:", response.statusText);
        setIsAnalyzing(false);
        return;
      }

      let data = await response.json();

      // If backend wraps JSON in a string or ```json blocks, clean it
      if (typeof data === "string") {
        data = data.replace(/```json|```/g, "").trim();
        data = JSON.parse(data);
      }

      // New: if backend returns { violations, paired_contexts }, extract them
      if (data && data.violations) {
        const violations = Array.isArray(data.violations)
          ? data.violations
          : [data.violations];
        setAnalysisResults(violations);
        setPairedContexts(
          Array.isArray(data.paired_contexts) ? data.paired_contexts : []
        );
        console.log("Analysis results (violations):", violations);
      } else {
        // backward-compat: old behavior expected an array of violation objects
        if (!Array.isArray(data)) {
          console.warn(
            "Backend response is not an array, wrapping in array:",
            data
          );
          data = [data];
        }
        setAnalysisResults(data);
        setPairedContexts([]); // no paired contexts available
        console.log("Analysis results (legacy):", data);
      }

      if (attachedFile) {
        setAttachedFile(null);
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "compliant":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "high":
      case "medium":
        return <AlertTriangle className="w-4 h-4" />;
      case "compliant":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const generateRecommendations = async () => {
    setIsGeneratingRecommendations(true);
    try {
      const rawViolations = analysisResults.filter(
        (result) => result.type === "Violation"
      );
      // Normalize violation objects to a shape backend expects, and try multiple key names for policy id
      const violations = rawViolations.map((v) => {
        const policyId =
          v.policy_id ||
          v.policyId ||
          v.policy ||
          v.policy_ref ||
          v.policyId_ ||
          null;
        const title =
          v.title || v.name || v.violation || v.type || "Untitled Violation";
        const description =
          v.description || v.detail || v.text || v.summary || "";
        const severity = v.severity || v.level || v.severity_level || "medium";
        return {
          type: "Violation",
          title,
          description,
          severity,
          policy_id: policyId,
        };
      });

      console.log(
        "Generating recommendations for normalized violations:",
        violations
      );
      setRecommendationError(null);

      // ensure we have a session id to send
      const sessionId = sessionID || uuidv4();

      const response = await fetch(
        "http://127.0.0.1:5000/recommendations/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getToken()}`,
          },
          body: JSON.stringify({
            violations,
            session_id: sessionId,
            paired_contexts: pairedContexts,
          }),
        }
      );

      console.log(
        "Recommendations response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        // attempt to read error body for better debugging
        let errText = response.statusText;
        try {
          const errBody = await response.text();
          errText = errBody || errText;
        } catch (e) {
          // ignore
        }
        throw new Error(`Error generating recommendations: ${errText}`);
      }

      const data = await response.json();
      const recs = data.recommendations || data.result || [];

      // persist to sessionStorage so recommendations survive refresh/navigation
      try {
        sessionStorage.setItem("recommendations", JSON.stringify(recs));
      } catch (e) {
        console.warn("Could not persist recommendations to sessionStorage:", e);
      }

      navigate("/recommendations", { state: { recommendations: recs } });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      setRecommendationError(String(error));
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      {/* Sidebar */}
      <div className="fixed left-4 top-4 flex flex-col space-y-3 z-10">
        <button className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
        <button
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
          onClick={() => (window.location.href = "/")}
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => (window.location.href = "/documents")}
          className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
        {subscription == "Standard" && (
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
      </div>

      {/* Header */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Assistant v2.6</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">
            Policy Analyzer
          </h1>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
            <Sparkles className="w-4 h-4 inline mr-1" />
            Upgrade
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-6 pb-8">
        <div className="grid lg:grid-cols-2 gap-8 h-[calc(100vh-120px)]">
          {/* Left Side - Document Upload */}
          <div
            className="bg-white rounded-2xl shadow-sm p-6 flex flex-col overflow-auto"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Upload Policy Document
            </h2>

            {/* Upload Area */}
            <div className="flex-1 flex flex-col">
              {!uploadedFile ? (
                <div
                  className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {isDragging
                      ? "Drop your document here"
                      : "Drag & drop your PDF or image"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    or click to browse files
                  </p>
                  <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-medium">
                    PDF & image files supported
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">
                        {uploadedFile.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(uploadedFile.size)}
                      </p>
                    </div>
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={clearSelectedFile}
                    >
                      ×
                    </button>
                  </div>

                  {/* PDF Preview Area */}
                  <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col overflow-hidden">
                    {isLoadingPdf ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-500">Loading document...</p>
                        </div>
                      </div>
                    ) : imagePreviewUrl ? (
                      <>
                        <div className="p-3 border-b border-gray-200 bg-gray-50">
                          <span className="text-sm font-medium text-gray-600">
                            Image Preview
                          </span>
                        </div>
                        <div className="flex-1 overflow-auto bg-gray-100 p-4">
                          <div className="flex justify-center">
                            <img
                              src={imagePreviewUrl}
                              alt="Document preview"
                              className="max-h-[680px] w-auto object-contain border border-gray-300 shadow-sm bg-white"
                            />
                          </div>
                        </div>
                      </>
                    ) : pdfDoc ? (
                      <>
                        {/* PDF Controls */}
                        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={prevPage}
                                disabled={currentPage <= 1}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-sm text-gray-600 min-w-0">
                                {currentPage} / {totalPages}
                              </span>
                              <button
                                onClick={nextPage}
                                disabled={currentPage >= totalPages}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="text-xs text-gray-500 min-w-0">
                              {Math.round(scale * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* PDF Canvas */}
                        <div
                          className="flex-1 overflow-auto bg-gray-100 p-4"
                          onWheel={handleWheel}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          style={{ touchAction: "none" }}
                        >
                          <div className="flex justify-center">
                            <canvas
                              ref={canvasRef}
                              className="border border-gray-300 shadow-sm bg-white"
                              style={{ maxWidth: "100%", height: "auto" }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">Document preview</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Ready for analysis once upload completes
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* International Policies Toggle and Selection */}
              <div className="mt-6 space-y-4">
                <div
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    subscription === "Standard" || subscription == "Basic"
                      ? "bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 relative overflow-hidden"
                      : "bg-gray-50"
                  }`}
                >
                  {subscription === "Standard" ||
                    (subscription == "Basic" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-100/50 to-indigo-100/50 backdrop-blur-sm" />
                    ))}

                  <div className="flex items-center gap-3 relative z-10">
                    <div
                      className={`text-sm font-medium ${
                        subscription === "Standard" || subscription == "Basic"
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      International Policies
                    </div>
                    {subscription === "Standard" ||
                      (subscription == "Basic" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                          PRO
                        </span>
                      ))}
                  </div>

                  {subscription === "Standard" || subscription == "Basic" ? (
                    <button
                      onClick={() => {
                        navigate("/subscription");
                      }}
                      className="relative z-10 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      Upgrade to Unlock
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowInternationalPolicies(
                          !showInternationalPolicies
                        );
                        if (!showInternationalPolicies) {
                          setSelectedPolicies([]);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        showInternationalPolicies
                          ? "bg-purple-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          showInternationalPolicies
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  )}
                </div>

                {showInternationalPolicies && (
                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <div className="text-sm font-medium text-gray-700 mb-3">
                      Select Policies to Check
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {internationalPolicies.map((policy) => (
                        <label
                          key={policy.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPolicies.includes(policy.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPolicies([
                                  ...selectedPolicies,
                                  policy.id,
                                ]);
                              } else {
                                setSelectedPolicies(
                                  selectedPolicies.filter(
                                    (id) => id !== policy.id
                                  )
                                );
                              }
                            }}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">
                            {policy.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analyze Button */}
                <button
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    uploadedFile && !isAnalyzing && !isUploading
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!uploadedFile || isAnalyzing || isUploading}
                  onClick={handleAnalyze}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span>Analyzing...</span>
                    </div>
                  ) : isUploading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    "Analyze Document"
                  )}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*,.tif,.tiff,.bmp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Right Side - Analysis Results */}
          <div
            className="bg-white rounded-2xl shadow-sm p-6 flex flex-col overflow-auto"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Analysis Results
              </h2>
              {analysisResults.length > 0 && (
                <button
                  className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                    isGeneratingRecommendations
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                  onClick={generateRecommendations}
                  disabled={isGeneratingRecommendations}
                >
                  {isGeneratingRecommendations ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Generate Recommendations
                    </>
                  )}
                </button>
              )}
            </div>

            {recommendationError && (
              <div className="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-100">
                <strong>Error:</strong> {recommendationError}
              </div>
            )}

            {analysisResults.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    No Analysis Yet
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Upload a policy document and click "Analyze" to see
                    violations and statements.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <div className="space-y-4">
                  {analysisResults.map((result, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-lg border ${getSeverityColor(
                            result.severity
                          )}`}
                        >
                          {getSeverityIcon(result.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                result.type === "Violation"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {result.type}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getSeverityColor(
                                result.severity
                              )}`}
                            >
                              {result.severity}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                result.policy_type?.startsWith(
                                  "International Policy"
                                )
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {result.policy_type}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-800 mb-1">
                            {result.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {result.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Logo */}
      <div className="w-full text-black-400 text-xs md:text-sm py-3 px-4 text-center border-t border-purple-500/20">
        <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
          <span className="inline-flex items-center gap-1">
            <svg
              className="w-4 h-4 text-purple-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <strong className="text-purple-600">Not legal advice.</strong>
          </span>
          <span>
            This AI tool may be inaccurate — consult a licensed attorney before
            making legal decisions.
          </span>
        </span>
      </div>
    </div>
  );
};

export default PolicyAnalyzerUI;
