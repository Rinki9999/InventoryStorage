import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import for redirect

import {
  onAuthChange,
  logOut,
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
} from "../firebase";

export default function Login() {
  const navigate = useNavigate(); // ✅ initialize navigate

  const [mode, setMode] = useState("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // student / council / admin
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((u) => setUser(u));
    return unsub;
  }, []);

  // ✅ Redirect to dashboard if user is logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;
      
      // Check if user role is already saved
      const existingRole = localStorage.getItem(`userRole_${user.uid}`);
      if (!existingRole) {
        // If no role exists, save the selected role (default to 'Student')
        localStorage.setItem(`userRole_${user.uid}`, role);
        console.log("Google user signed in with role:", role);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const userCredential = await signUpWithEmail(email, password);
        const user = userCredential.user;
        
        // Save user role to localStorage for immediate access
        localStorage.setItem(`userRole_${user.uid}`, role);
        
        // You can also store firstName, lastName, role in Firestore here if needed
        console.log("User signed up with role:", role);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Logout with redirect to login
  const handleLogout = async () => {
    await logOut();
    navigate("/"); // back to login page
  };

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Welcome, {user.displayName || user.email}
          </h2>
          <p className="text-gray-600 mb-6">
            You are logged in. Redirecting to Dashboard...
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border border-gray-200">
        <h1 className="text-3xl font-bold mb-2 text-center text-indigo-700">
          Inventory App
        </h1>
        <p className="text-center text-gray-500 mb-6">
          {mode === "login" ? "Login to continue" : "Create an account"}
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {mode === "signup" && (
          <div className="flex space-x-3 mb-4">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-3 mb-6 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 appearance-none"
        >
          <option value="student">Student</option>
          <option value="council">Council</option>
          <option value="admin">Admin</option>
        </select>

        <button
          onClick={handleEmail}
          disabled={loading}
          className={`w-full py-3 mb-4 font-semibold rounded-lg transition duration-200 
            ${loading ? 'bg-indigo-300 text-indigo-100 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'}
          `}
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
        </button>

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute w-full border-t border-gray-300"></div>
          <span className="relative px-3 text-sm bg-white text-gray-500">OR</span>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className={`w-full py-3 flex items-center justify-center border border-gray-300 bg-white text-gray-700 font-medium rounded-lg shadow-sm transition duration-200 
            ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}
          `}
        >
          <span className="mr-3">
            {/* Google SVG icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#fbbc05" d="M43.6 20.4h-19v7.2h11.1c-1.2 6-6.9 10.3-13.1 10.3-7.7 0-14-6.3-14-14s6.3-14 14-14c3.5 0 6.7 1.3 9.1 3.5l5-5C34 2.8 29.3 0 24 0 10.7 0 0 10.7 0 24s10.7 24 24 24c12.2 0 22.3-9 23.8-20.8 0-1.5-.2-2.8-.6-4.8z"/>
              <path fill="#518ef8" d="M6.3 14.6l6.1 4.5C14 16.6 18.7 14 24 14c3.5 0 6.7 1.3 9.1 3.5l5-5C34 2.8 29.3 0 24 0 15.9 0 8.5 5 6.3 14.6z"/>
              <path fill="#28b446" d="M24 48c5.3 0 10.1-1.8 13.8-4.8l-6.4-5.3C28.7 40.6 26.4 41.5 24 41.5c-6.2 0-11.9-4.3-13.1-10.3l-6.1 4.5C8.5 43 15.9 48 24 48z"/>
              <path fill="#f14336" d="M43.6 20.4h-19v7.2h11.1c-1.2 6-6.9 10.3-13.1 10.3-7.7 0-14-6.3-14-14s6.3-14 14-14c3.5 0 6.7 1.3 9.1 3.5l5-5C34 2.8 29.3 0 24 0 10.7 0 0 10.7 0 24s10.7 24 24 24c12.2 0 22.3-9 23.8-20.8 0-1.5-.2-2.8-.6-4.8z"/>
            </svg>
          </span>
          Continue with Google
        </button>

        <div className="mt-8 text-center text-sm text-gray-600">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-indigo-600 hover:text-indigo-800 font-medium transition duration-150"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-indigo-600 hover:text-indigo-800 font-medium transition duration-150"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
