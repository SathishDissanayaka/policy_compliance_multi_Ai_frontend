import React, { useState } from "react";
import { CheckCircle, ArrowLeft } from "lucide-react";
import supabase from "../utils/client";
import sendSubscription from "../api/subscription";
import PaymentGateway from "../components/PaymentGateway";

const SubscriptionPage = () => {
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      name: "Free",
      target: "Small teams / trial",
      price: "$0",
      features: [
        "Upload up to 10 documents",
        "Basic Q&A",
        "Employee self-service",
        "Policy Violation detection (limited)",
      ],
      isMostPopular: false,
      buttonText: "Get Started",
      buttonStyle: "bg-gray-500",
    },
    {
      name: "Standard",
      target: "SMEs",
      price: "$99",
      period: "/ company / month",
      features: [
        "Unlimited documents",
        "Policy violation detection",
        "International compliance support",
        "Basic analytics",
        "Recommendations Generation",
      ],
      isMostPopular: true,
      buttonText: "Subscribe Now",
      buttonStyle: "bg-blue-600",
    },
    {
      name: "Premium",
      target: "Large companies",
      price: "Custom",
      period: "",
      features: [
        "All Standard features",
        "Advanced analytics & reporting",
        "On-premise deployment / private cloud",
        "Custom features",
        "Priority support",
      ],
      isMostPopular: false,
      buttonText: "Contact Sales",
      buttonStyle: "bg-gray-900",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto relative">
        {/* Back Button */}
        <button
          onClick={() => (window.location.href = "/")}
          className="absolute left-0 top-0 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Select the perfect plan for your organization's needs
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-xl p-8 ${
                plan.isMostPopular ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {plan.isMostPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-sm font-medium px-6 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">{plan.target}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button
                onClick={async () => {
                  try {
                    const user = supabase.auth.getUser
                      ? await supabase.auth.getUser()
                      : null;

                    // supabase.auth.getUser() returns a promise that resolves to { data: { user } }
                    const userId = user?.data?.user?.id;

                    if (!userId) {
                      // store pending selection to send after registration/login
                      localStorage.setItem(
                        "pending_subscription_plan",
                        plan.name
                      );
                      // redirect to signup/login
                      window.location.href = "/login";
                      return;
                    }

                    // For the free plan, no payment required
                    if (plan.name === "Free") {
                      await sendSubscription(userId, plan.name);
                      window.location.href = "/";
                      return;
                    }

                    // For paid plans, show payment gateway
                    setSelectedPlan(plan);
                    setShowPaymentGateway(true);
                  } catch (err) {
                    console.error("Subscription error", err);
                    alert("Failed to process request. Please try again.");
                  }
                }}
                className={`w-full ${plan.buttonStyle} text-white py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Need help choosing the right plan?{" "}
            <a
              href="#"
              className="text-blue-600 font-medium hover:text-blue-500"
            >
              Contact our sales team
            </a>
          </p>
        </div>
      </div>

      {/* Payment Gateway */}
      <PaymentGateway
        isOpen={showPaymentGateway}
        onClose={() => setShowPaymentGateway(false)}
        onSuccess={async () => {
          try {
            const user = await supabase.auth.getUser();
            const userId = user?.data?.user?.id;

            if (userId && selectedPlan) {
              await sendSubscription(userId, selectedPlan.name);
              window.location.href = "/";
            }
          } catch (err) {
            console.error("Subscription error", err);
            alert("Failed to set subscription. Please try again.");
          }
        }}
        planName={selectedPlan?.name}
        amount={selectedPlan?.price}
      />
    </div>
  );
};

export default SubscriptionPage;
