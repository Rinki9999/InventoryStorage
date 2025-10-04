import React, { useState, useEffect } from "react";
import { onAuthChange, logOut } from "../firebase";



export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (mode === "signup") await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
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

      <button onClick={handleEmail} disabled={loading} className="btn primary">
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign up"}
      </button>

      <button onClick={handleGoogle} disabled={loading} className="btn secondary">
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
