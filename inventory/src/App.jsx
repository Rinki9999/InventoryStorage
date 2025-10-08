// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { onAuthChange } from "./firebase";
import CampusAssetsPage from "./pages/AssestDashboard";
import Helth from "./pages/Helth";
import ITDashboard from "./pages/ItDashboard";
import Food from "./pages/Food";

import { db, collection, addDoc } from "./firebase";

// Dummy data
const initialAssets = [
  { id: 1, name: 'MacBook Pro 16"', category: 'IT', qty: 12, expiry: '2028-11-01', status: 'In Stock', assigned: 'John Doe', value: 3000 },
  { id: 2, name: 'Logitech MX Master 3', category: 'IT', qty: 8, expiry: '-', status: 'Low Stock', assigned: 'Jane Smith', value: 80 },
  { id: 3, name: 'Office Chair', category: 'Furniture', qty: 35, expiry: '-', status: 'In Stock', assigned: '-', value: 150 },
  { id: 4, name: 'First Aid Kit', category: 'Health', qty: 2, expiry: '2025-06-30', status: 'Expired', assigned: 'Office Manager', value: 25 },
  { id: 5, name: 'Printer Paper Ream', category: 'Office Supplies', qty: 0, expiry: '-', status: 'Out of Stock', assigned: '-', value: 5 },
  { id: 6, name: 'Sanitizer Bottle', category: 'Health', qty: 25, expiry: '2026-01-15', status: 'In Stock', assigned: 'Reception', value: 10 },
  { id: 7, name: 'Whiteboard', category: 'Office Supplies', qty: 3, expiry: '-', status: 'Damaged', assigned: 'Meeting Room A', value: 100 },
  { id: 8, name: 'External Monitor', category: 'IT', qty: 50, expiry: '-', status: 'In Stock', assigned: 'Various', value: 400 },
  { id: 9, name: 'Coffee Beans', category: 'Food', qty: 10, expiry: '2025-10-20', status: 'Low Stock', assigned: 'Kitchen', value: 15 },
  { id: 10, name: 'HDMI Cable', category: 'IT', qty: 1, expiry: '-', status: 'Low Stock', assigned: '-', value: 10 },
  { id: 11, name: 'Expired Medication', category: 'Health', qty: 4, expiry: '2024-05-01', status: 'Expired', assigned: 'Storage', value: 50 },
  { id: 12, name: 'Broken Desk Lamp', category: 'Furniture', qty: 1, expiry: '-', status: 'Damaged', assigned: 'Storage', value: 75 },
];

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Upload assets after login
  useEffect(() => {
    if (!user) return; // user not logged in

    const uploadAssets = async () => {
      try {
        for (const asset of initialAssets) {
          await addDoc(collection(db, "assets"), asset);
        }
        console.log("Assets uploaded successfully!");
      } catch (error) {
        console.error("Error uploading assets:", error);
      }
    };

    uploadAssets();
  }, [user]); // runs only when user logs in

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
        <Route path="/itdashboard" element={user ? <ITDashboard /> : <Navigate to="/" />} />
        <Route path="/food" element={user ? <Food /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
