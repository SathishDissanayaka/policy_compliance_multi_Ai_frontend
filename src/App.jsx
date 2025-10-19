import "./App.css";
import AIChatbotUI from "./pages/AIChatbotUI";
import PolicyAnalyzerUI from "./pages/PolicyAnalyzerUI";
import LoginPage from "./pages/LoginPage";
import DocumentUploadPage from "./pages/DocumentUploadPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import AdminDashboard from "./pages/AdminDashboard";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import TermsAndConditions from "./components/TermsAndConditions";
import { use, useEffect, useState } from "react";
import { getToken } from "./lib/auth";

function App() {
  const [subscription, setSubscription] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const token = await getToken();
        const resp = await fetch(
          "http://127.0.0.1:5000/user/subscrition/user/",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await resp.json();

        // Safely access the subscription plan with fallback
        const plan = data?.data?.[0]?.plan || "Basic";
        setSubscription(plan);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setSubscription("Basic"); // Fallback to basic plan
      }
    }

    fetchSubscription();
  }, []);

  useEffect(() => {
    async function fetchRole() {
      try {
        const token = await getToken();

        // First try the direct role endpoint
        let resp = await fetch("http://127.0.0.1:5000/user/role", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        // If that fails, try the user details endpoint
        if (!resp.ok) {
          resp = await fetch("http://127.0.0.1:5000/user/details", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }

        if (!resp.ok) {
          throw new Error("Failed to fetch user role");
        }

        const data = await resp.json();

        // Try multiple possible paths to get the role
        const userRole =
          data?.role ||
          data?.data?.role ||
          data?.user?.role ||
          data?.details?.role ||
          "user";

        console.log("Fetched role data:", data);
        console.log("Setting user role to:", userRole);

        setRole(userRole);
      } catch (error) {
        console.error("Error fetching role:", error);
        setRole("user"); // Fallback to regular user role
      }
    }
    fetchRole();
  }, []);

  useEffect(() => {
    console.log("role changed", role);
  }, [role]);

  return (
    <Router>
      <div className="app-container">
        <TermsAndConditions />
        <Routes>
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AIChatbotUI subscription={subscription} role={role} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <PolicyAnalyzerUI subscription={subscription} role={role} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentUploadPage role={role} />
              </ProtectedRoute>
            }
          />

          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Recommendations Route */}
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />

          {/* Subscription Route */}
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard role={role} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
