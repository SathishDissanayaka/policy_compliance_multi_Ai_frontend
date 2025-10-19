import React, { useState, useRef } from "react";
import { Upload, ArrowLeft, ShieldAlert } from "lucide-react";
import { getToken } from "../lib/auth";

const DocumentUploadPage = ({ role }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: "", message: "" });
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus({ type: "", message: "" });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: "error", message: "Please select a file first" });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://127.0.0.1:5000/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await getToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({
          type: "success",
          message: "Document uploaded successfully!",
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setUploadStatus({
          type: "error",
          message: data.message || "Failed to upload document",
        });
      }
    } catch (error) {
      setUploadStatus({ type: "error", message: "Error uploading document" });
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  // If not admin, show access denied message
  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You should be an admin to do this
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              className="flex items-center justify-center mx-auto text-purple-600 hover:text-purple-700 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Chat
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Upload Documents</h1>
          <p className="text-gray-600 mt-2">
            Upload Company Policy Documents for future reference and compliance
            checking
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />

            <div className="mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {selectedFile ? selectedFile.name : "Choose a file to upload"}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Supported formats: PDF, DOC, DOCX, TXT
              </p>
            </div>

            {!selectedFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Select File
              </button>
            ) : (
              <div className="space-x-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Change File
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                      Uploading...
                    </span>
                  ) : (
                    "Upload Document"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Status Message */}
          {uploadStatus.message && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                uploadStatus.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {uploadStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadPage;
