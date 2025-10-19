import { useState, useEffect } from "react";
import "../App.css";

const TermsAndConditions = () => {
  const [showModal, setShowModal] = useState(true);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Check if terms have been previously accepted
    const termsAccepted = localStorage.getItem("termsAccepted");
    if (termsAccepted) {
      setAccepted(true);
      setShowModal(false);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("termsAccepted", "true");
    setAccepted(true);
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          Welcome to Policy Compliance AI
        </h2>
        <div className="text-sm text-gray-600 space-y-3">
          <p>Before you begin, please note that this AI-powered platform:</p>
          <ul className="space-y-2 list-inside list-disc">
            <li>May not always provide 100% accurate responses</li>
            <li>Offers advisory suggestions, not definitive answers</li>
            <li>Should be used alongside human judgment</li>
          </ul>
          <p className="text-xs italic">
            By clicking "I Understand & Accept", you acknowledge these
            limitations and agree to use the system's suggestions as
            supplementary guidance only.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleAccept}
            className="bg-blue-600 text-white px-4 py-2 text-sm rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
