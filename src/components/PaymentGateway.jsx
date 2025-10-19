import React, { useState } from "react";

const PaymentGateway = ({ isOpen, onClose, onSuccess, planName, amount }) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setProcessing(true);

    // Simulate payment processing
    try {
      // Basic validation
      if (cardNumber.length !== 16) {
        throw new Error("Invalid card number");
      }
      if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        throw new Error("Invalid expiry date (MM/YY)");
      }
      if (cvv.length !== 3) {
        throw new Error("Invalid CVV");
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate success (in real app, this would be an actual API call)
      if (cardNumber === "4111111111111111") {
        onSuccess();
        onClose();
      } else {
        throw new Error("Payment failed. Please try again.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
        <p className="mb-6 text-gray-600">
          Subscribing to {planName} plan
          {amount && <span className="font-semibold"> - {amount}</span>}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) =>
                  setCardNumber(e.target.value.replace(/\D/g, ""))
                }
                maxLength={16}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="1234 5678 9012 3456"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    if (value.length >= 2) {
                      value = value.slice(0, 2) + "/" + value.slice(2);
                    }
                    setExpiryDate(value);
                  }}
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="MM/YY"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                  maxLength={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="123"
                  required
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={processing}
              >
                {processing ? "Processing..." : "Pay Now"}
              </button>
            </div>
          </div>
        </form>

        {/* Test Card Info */}
        <div className="mt-8 pt-4 border-t text-sm text-gray-500">
          <p className="font-medium mb-1">Test Card Details:</p>
          <p>Card Number: 4111 1111 1111 1111</p>
          <p>Any future expiry date (MM/YY)</p>
          <p>Any 3-digit CVV</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
