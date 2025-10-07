import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { onAuthChange } from "./firebase"; // firebase listener
import CampusAssetsPage from "./pages/AssestDashboard"; // new page
import Helth from './pages/Helth'; // Tumhara Helth component

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/campus/:campusName/assets" element={user ? <CampusAssetsPage /> : <Navigate to="/" />} />
        <Route path="/helth" element={user ? <Helth /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
