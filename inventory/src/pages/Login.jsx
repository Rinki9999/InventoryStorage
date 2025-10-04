import React, { useState, useEffect } from "react";
import {
  onAuthChange,
  logOut,
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
} from "../firebase";

export default function Login() {
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

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
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
        await signUpWithEmail(email, password);
        // You can store firstName, lastName, role in Firestore here
      } else {
        await signInWithEmail(email, password);
        // Optional: verify role here
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="login-box">
        <h2>Welcome, {user.displayName || user.email}</h2>
        <p>You are logged in. This will later redirect to the Dashboard.</p>
        <button onClick={logOut} className="btn logout">
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="login-box">
      <h1>Inventory App</h1>
      <p>{mode === "login" ? "Login to continue" : "Create an account"}</p>

      {error && <div className="error">{error}</div>}

      {mode === "signup" && (
        <div className="name-fields">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      )}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="student">Student</option>
        <option value="council">Council</option>
        <option value="admin">Admin</option>
      </select>

      <button onClick={handleEmail} disabled={loading} className="btn primary">
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
      </button>

      <button onClick={handleGoogle} disabled={loading} className="btn secondary">
        <span style={{ marginRight: "8px", verticalAlign: "middle" }}>
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

      <div className="switch-mode">
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <button onClick={() => setMode("signup")} className="link-btn">
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button onClick={() => setMode("login")} className="link-btn">
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
