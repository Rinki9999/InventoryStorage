import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Initial medication data
const initialMedications = [
  { id: 1, name: "Flexon", qty: 45, expiry: "2028-01-01" },
  { id: 2, name: "Handiplast", qty: 15, expiry: "2027-10-01" },
  { id: 3, name: "Cetirizine", qty: 20, expiry: "2028-03-01" },
  { id: 4, name: "Flagyl 400", qty: 30, expiry: "2028-01-01" },
  { id: 5, name: "Calpol 500", qty: 30, expiry: "2025-05-01"},
  { id: 6, name: "Nobel Spas new", qty: 20, expiry: "2026-10-01"},
  { id: 7, name: "Vomikind - MD 4", qty: 10, expiry: "2027-03-01" },
  { id: 8, name: "Dolo - 650", qty: 30, expiry: "2029-03-01"},
  { id: 9, name: "Bicosules", qty: 20, expiry: "2026-05-01" },
  { id: 10, name: "Omez", qty: 40, expiry: "2028-03-01" },
  { id: 11, name: "ORS", qty: 5, expiry: "2027-02-01" },
  { id: 12, name: "Burnol", qty: 1, expiry: "2026-09-01" },
  { id: 13, name: "Nebasulf powder", qty: 1, expiry: "2026-04-01" },
  { id: 14, name: "Dettol", qty: 1, expiry: "2028-09-01" },
  { id: 15, name: "Bandage", qty: 1, expiry: "2028-09-01" },
];

// Helper function to calculate status
const calculateStatus = (qty) => {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 10) return "Low Stock";
  return "In Stock";
};

// Summary Box Component
const SummaryBox = ({ title, value, color }) => (
  <div className={`p-6 rounded-xl shadow-lg text-center bg-white hover:scale-105 transform transition duration-300`}>
    <div className={`text-sm font-medium ${color}`}>{title}</div>
    <div className="mt-2 text-3xl font-extrabold text-gray-800">{value}</div>
  </div>
);

// Delete Icon Component
const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

export default function MedicationDashboard() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState(initialMedications);
  const [newMed, setNewMed] = useState({ name: "", qty: "", expiry: "" });
  const [editingMed, setEditingMed] = useState(null);
  const [notification, setNotification] = useState('');

  // Function to show a notification and hide it after 3 seconds
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
        setNotification('');
    }, 3000);
  };

  // Back button
  const handleBack = () => {
    navigate("/dashboard"); // dashboard page pe le jayega
  };

  // Status counts
  const totalMedications = medications.length;
  const inStock = medications.filter(m => calculateStatus(m.qty) === "In Stock").length;
  const lowStock = medications.filter(m => calculateStatus(m.qty) === "Low Stock").length;
  const outOfStock = medications.filter(m => calculateStatus(m.qty) === "Out of Stock").length;

  // Add Medication
  const handleAdd = () => {
    if (!newMed.name || !newMed.qty || !newMed.expiry) {
      showNotification("Please fill all fields.");
      return;
    }
    const newEntry = {
      id: Date.now(),
      ...newMed,
      qty: parseInt(newMed.qty),
    };
    setMedications([...medications, newEntry]);
    setNewMed({ name: "", qty: "", expiry: "" });
    showNotification("Medication added successfully!");
  };

  // Delete Medication
  const handleDelete = (id) => {
    setMedications(medications.filter(med => med.id !== id));
    showNotification("Medication removed.");
  };

  // Edit Medication
  const handleEdit = (med) => setEditingMed({ ...med });
  const saveEdit = () => {
    setMedications(medications.map(m => m.id === editingMed.id ? { ...editingMed, qty: parseInt(editingMed.qty) } : m));
    setEditingMed(null);
    showNotification("Changes saved!");
  };

  // Status color
  const getStatusColor = (status) => {
    switch (status) {
      case "In Stock": return "bg-green-100 text-green-800";
      case "Low Stock": return "bg-yellow-100 text-yellow-800";
      case "Out of Stock": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
        {notification && (
            <div className="fixed top-5 right-5 bg-blue-500 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce">
                {notification}
            </div>
        )}

      {/* Back Button and Header */}
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            {/* Left arrow icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h1 className="text-2xl font-bold">Health & Hygiene</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Medication Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your medical supplies efficiently.</p>
        </header>

      {/* Summary Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryBox title="All Medications" value={totalMedications} color="text-blue-500"/>
        <SummaryBox title="In Stock" value={inStock} color="text-green-500"/>
        <SummaryBox title="Low Stock" value={lowStock} color="text-yellow-500"/>
        <SummaryBox title="Out of Stock" value={outOfStock} color="text-red-500"/>
      </div>


      {/* Add/Edit Medication Form */}
      {editingMed ? (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row gap-4 items-center">
            <h3 className="font-semibold text-lg sm:mr-4">Edit Medication</h3>
            <input className="border border-gray-300 p-3 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-green-400" value={editingMed.name} onChange={e => setEditingMed({ ...editingMed, name: e.target.value })}/>
            <input className="border border-gray-300 p-3 rounded-lg w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-green-400" type="number" value={editingMed.qty} onChange={e => setEditingMed({ ...editingMed, qty: e.target.value })}/>
            <input className="border border-gray-300 p-3 rounded-lg w-full sm:w-40 focus:outline-none focus:ring-2 focus:ring-green-400" type="date" value={editingMed.expiry} onChange={e => setEditingMed({ ...editingMed, expiry: e.target.value })}/>
            <div className="flex gap-2">
                <button className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition duration-300 font-semibold" onClick={saveEdit}>Save</button>
                <button className="bg-gray-400 text-white px-5 py-3 rounded-lg hover:bg-gray-500 transition duration-300 font-semibold" onClick={() => setEditingMed(null)}>Cancel</button>
            </div>
        </div>
      ) : (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row gap-4 items-center">
            <h3 className="font-semibold text-lg sm:mr-4">Add New Medication</h3>
            <input className="border border-gray-300 p-3 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Medication Name" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} />
            <input className="border border-gray-300 p-3 rounded-lg w-full sm:w-24 focus:outline-none focus:ring-2 focus:ring-blue-400" type="number" placeholder="Qty" value={newMed.qty} onChange={e => setNewMed({...newMed, qty: e.target.value})} />
            <input className="border border-gray-300 p-3 rounded-lg w-full sm:w-40 focus:outline-none focus:ring-2 focus:ring-blue-400" type="date" value={newMed.expiry} onChange={e => setNewMed({...newMed, expiry: e.target.value})} />
            <button className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold w-full sm:w-auto" onClick={handleAdd}>Add</button>
        </div>
      )}

      {/* Medication Table */}
      <div className="bg-white rounded-xl shadow-lg p-2 sm:p-6 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-700">
          <thead className="bg-gray-50 uppercase text-gray-600 text-xs">
            <tr>
              <th className="px-6 py-4">Medication Name</th>
              <th className="px-6 py-4">Quantity</th>
              <th className="px-6 py-4">Expiry Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {medications.map(med => (
              <tr key={med.id} className="border-b hover:bg-gray-50 transition-colors duration-200">
                <td className="px-6 py-4 font-medium text-gray-900">{med.name}</td>
                <td className="px-6 py-4">{med.qty}</td>
                <td className="px-6 py-4">{med.expiry}</td>
                <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(calculateStatus(med.qty))}`}>
                        {calculateStatus(med.qty)}
                    </span>
                </td>
                <td className="px-6 py-4 flex justify-center gap-3">
                  <button className="text-gray-500 hover:text-blue-600 transition" onClick={() => handleEdit(med)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-red-600 transition" onClick={() => handleDelete(med.id)}>
                    <DeleteIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
     </div>
    </div>
  );
}
