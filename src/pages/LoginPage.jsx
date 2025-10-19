import "../index.css";
import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "../utils/client";
import sendSubscription from "../api/subscription";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        // if user already logged in, check for pending subscription and send
        try {
          const pending = localStorage.getItem("pending_subscription_plan");
          if (pending && session.user && session.user.id) {
            await sendSubscription(session.user.id, pending);
            localStorage.removeItem("pending_subscription_plan");
          }
        } catch (err) {
          console.error(
            "Failed to send pending subscription on session check",
            err
          );
        }
        navigate("/"); // redirect if already logged in
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        // If it's a new sign up, set free subscription
        if (
          event === "SIGNED_IN" &&
          session.user?.confirmed_at === session.user?.created_at
        ) {
          try {
            await sendSubscription(session.user.id, "free");
          } catch (err) {
            console.error("Failed to send free subscription for new user", err);
          }
        }
        // Handle pending subscription if exists
        try {
          const pending = localStorage.getItem("pending_subscription_plan");
          if (pending && session.user && session.user.id) {
            await sendSubscription(session.user.id, pending);
            localStorage.removeItem("pending_subscription_plan");
          }
        } catch (err) {
          console.error(
            "Failed to send pending subscription after auth state change",
            err
          );
        }
        navigate("/"); // redirect after login
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 px-4">
        {/* Glassmorphic login card */}
        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-white/40">
          {/* Logo / Title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 text-sm mt-2">
              Sign in to your Policy Compliance Agent
            </p>
          </div>

          {/* Supabase Auth */}
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "#111827", // dark gray/black
                    brandAccent: "#ff69b4", // your hot pink accent
                  },
                  radii: {
                    borderRadiusButton: "12px",
                    input: "12px",
                  },
                },
              },
              className: {
                container: "space-y-4",
                button:
                  "bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors",
                input:
                  "rounded-xl border-gray-300 focus:border-pink-400 focus:ring-pink-400",
                label: "text-gray-700 font-medium",
              },
            }}
          />
        </div>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🎉 Logged in!
          </h2>
          <p className="text-gray-600 text-sm mb-6">Session active.</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
}
