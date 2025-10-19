import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, FileText, Settings, Sparkles, Copy } from "lucide-react";
import { getToken } from "../lib/auth";

const escapeHtml = (unsafe = "") =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const RecommendationsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  let recommendations = location.state?.recommendations;
  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
    try {
      const stored = sessionStorage.getItem("recommendations");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          recommendations = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to parse recommendations from sessionStorage", e);
    }
  }

  recommendations = recommendations || [];

  const [policyLoadingIndex, setPolicyLoadingIndex] = useState(null);
  const [copyToast, setCopyToast] = useState("");
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const prioritySettings = {
    high: { color: "bg-red-100 text-red-800", icon: "⚠️" },
    medium: { color: "bg-yellow-100 text-yellow-800", icon: "🕒" },
    low: { color: "bg-blue-100 text-blue-800", icon: "✅" },
  };

  const copyToClipboard = (text) => {
    const handleSuccess = () => {
      setCopyToast("Recommendation copied to clipboard");
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setCopyToast(""), 2400);
    };

    const handleFailure = () => {
      setCopyToast("Unable to copy. Try again.");
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setCopyToast(""), 2400);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(handleSuccess).catch(handleFailure);
    } else {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        success ? handleSuccess() : handleFailure();
      } catch (err) {
        console.error("Clipboard copy failed", err);
        handleFailure();
      }
    }
  };

  const renderPolicyWindow = (title, bodyText, meta = {}) => {
    const policyWindow = window.open("", "_blank");
    if (!policyWindow) {
      alert("Allow popups to view the policy document.");
      return;
    }

    const safeTitle = escapeHtml(title || "Policy Document");
    const safeBody = escapeHtml(bodyText || "No policy text provided.");
    const safePolicyType = meta.policyType ? escapeHtml(meta.policyType) : null;

    policyWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <style>
      body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f5f5f7; color: #1f2933; }
      header { padding: 24px 32px; background: #111827; color: white; }
      header h1 { margin: 0; font-size: 20px; }
      header p { margin: 4px 0 0; font-size: 13px; opacity: 0.7; }
      main { padding: 32px; }
      pre { white-space: pre-wrap; word-break: break-word; line-height: 1.6; font-size: 15px; background: white; padding: 24px 28px; border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid rgba(15, 23, 42, 0.08); }
    </style>
  </head>
  <body>
    <header>
      <h1>${safeTitle}</h1>
      ${safePolicyType ? `<p>Policy type: ${safePolicyType}</p>` : ""}
    </header>
    <main>
      <pre>${safeBody}</pre>
    </main>
  </body>
</html>`);
    policyWindow.document.close();
  };

  const openPolicyDocument = async (url, index, docName = "policy-document", meta = {}) => {
    if (!url) return;
    try {
      setPolicyLoadingIndex(index);
      const token = await getToken();
      if (!token) {
        alert("You must be signed in to view the full policy document.");
        setPolicyLoadingIndex(null);
        return;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = `Failed to fetch policy document (${response.status}).`;
        console.error(message, await response.text());
        alert(message);
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        const policyText = data.content || data.text || JSON.stringify(data, null, 2);
        renderPolicyWindow(docName || data.title || "Policy Document", policyText, {
          policyType: data.policy_type || meta.policyType,
        });
      } else if (contentType.startsWith("text/")) {
        const text = await response.text();
        renderPolicyWindow(docName || "Policy Document", text, {
          policyType: meta.policyType,
        });
      } else {
        const blob = await response.blob();
        const fileURL = URL.createObjectURL(blob);
        const newWindow = window.open(fileURL, "_blank");
        if (!newWindow) {
          alert("Allow popups to view the policy document.");
        }
        // Keep the URL alive a bit longer for PDFs/images; revoke after 5 minutes.
        setTimeout(() => URL.revokeObjectURL(fileURL), 5 * 60 * 1000);
      }
    } catch (error) {
      console.error("Error opening policy document", error);
      alert("Unable to open policy document. Please try again.");
    } finally {
      setPolicyLoadingIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      {/* Header */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Assistant v2.6</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">Policy Recommendations</h1>
          <button
            type="button"
            onClick={() => (window.location.href = "/subscription")}
            className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors flex items-center"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Upgrade
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-6 pb-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Analysis
        </button>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Recommendations Available</h3>
              <p className="text-gray-500 text-sm">
                Please return to the analysis page and generate recommendations.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((recommendation, index) => {
              const priority = (recommendation.priority || recommendation.priority_level || recommendation.urgency || "medium").toLowerCase();
              const context = recommendation.paired_context || recommendation.pairedContext || recommendation.context || recommendation.description || "No context available";
              const meta = recommendation.paired_context_meta || {};
              const sourceUrl = meta.source?.url || null;
              const docName = meta.source?.name || meta.attached?.document_name || null;
              const policyType = meta.policy_type;

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-3xl p-6 hover:shadow-lg transition-shadow bg-white relative"
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Recommendation #{index + 1}
                    {policyType && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        {policyType}
                      </span>
                    )}
                  </h3>
                  <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    onClick={() => copyToClipboard(JSON.stringify(recommendation, null, 2))}
                    title="Copy recommendation"
                  >
                    <Copy className="w-5 h-5" />
                  </button>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Recommendation</h4>
                      <p className="text-gray-600 leading-relaxed">{recommendation.recommendation || recommendation.text || recommendation.action || JSON.stringify(recommendation)}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Expected Outcome</h4>
                      <p className="text-gray-600 leading-relaxed">{recommendation.expected_outcome || recommendation.expectedOutcome || recommendation.outcome || "—"}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Timeline</h4>
                      <p className="text-gray-600 leading-relaxed">
                        {recommendation.timeline || recommendation.timeframe || "—"}{" "}
                        {recommendation.timeline?.toLowerCase() === "short-term" ? "🟢" :
                          recommendation.timeline?.toLowerCase() === "long-term" ? "🔴" : "🟡"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Priority</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioritySettings[priority]?.color || prioritySettings.medium.color}`}>
                        {prioritySettings[priority]?.icon} {recommendation.priority || recommendation.priority_level || recommendation.urgency || "medium"}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Resources Needed</h4>
                      <div className="flex flex-wrap gap-2">
                        {(recommendation.resources_needed || recommendation.resources || ["TBD"]).map ? (recommendation.resources_needed || recommendation.resources || ["TBD"]).map((res, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-700">{res}</span>
                        )) : <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-700">{recommendation.resources_needed || recommendation.resources || "TBD"}</span>}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Referenced Source Snippet</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {context}
                      </div>
                      {(sourceUrl || docName) && (
                        <div className="mt-3 text-sm text-gray-500 leading-relaxed flex flex-wrap items-center gap-3">
                          {docName && !sourceUrl && (
                            <span className="truncate max-w-xs" title={docName}>
                              {docName}
                            </span>
                          )}
                          {sourceUrl && (
                            <button
                              type="button"
                              onClick={() => openPolicyDocument(sourceUrl, index, docName, { policyType })}
                              className="text-blue-600 font-medium hover:underline"
                            >
                              {policyLoadingIndex === index ? "Opening…" : "View full source policy"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {copyToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50">
          {copyToast}
        </div>
      )}
    </div>
  );
};

export default RecommendationsPage;
