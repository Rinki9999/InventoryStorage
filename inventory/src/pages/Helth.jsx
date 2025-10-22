import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, onAuthChange } from '../firebase';
import emailjs from '@emailjs/browser';

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
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMed, setNewMed] = useState({ name: "", qty: "", expiry: "" });
  const [editingMed, setEditingMed] = useState(null);
  const [notification, setNotification] = useState('');
  const [requests, setRequests] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  
  // User role and procurement request states
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ recipient: '', isPhone: false });
  const [emailSending, setEmailSending] = useState(false);
  
  // Get current user and their role
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const idTokenResult = await user.getIdTokenResult();
          const role = idTokenResult.claims.role;
          
          if (role) {
            setUserRole(role);
          } else {
            // If no custom claims, check localStorage for signup role
            const signupRole = localStorage.getItem(`userRole_${user.uid}`);
            setUserRole(signupRole || 'student'); // Default to student
          }
        } catch (error) {
          console.error("Error getting user role:", error);
          // Fallback to localStorage
          const signupRole = localStorage.getItem(`userRole_${user.uid}`);
          setUserRole(signupRole || 'student');
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Load data from Firebase on component mount
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'medications'), async (snapshot) => {
      const medicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If collection is empty, populate with initial data
      if (medicationsData.length === 0 && snapshot.metadata.fromCache === false) {
        console.log("Medications collection is empty, adding initial data...");
        try {
          for (const medication of initialMedications) {
            const { id, ...medicationData } = medication; // Remove id field
            await addDoc(collection(db, 'medications'), medicationData);
          }
          console.log("Initial medications data added successfully!");
        } catch (error) {
          console.error("Error adding initial medications:", error);
        }
      } else {
        setMedications(medicationsData);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error loading medications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to health_requests collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'health_requests'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(data);
    }, (err) => console.error('health_requests listen error', err));

    return () => unsub();
  }, []);

  // Function to show a notification and hide it after 3 seconds
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification('');
    }, 3000);
  };

  // Generate email content for low stock/out of stock medicines
  const generateEmailContent = () => {
    const currentDate = new Date().toLocaleDateString();
    const lowStockMeds = medications.filter(m => calculateStatus(m.qty) === "Low Stock");
    const outOfStockMeds = medications.filter(m => calculateStatus(m.qty) === "Out of Stock");
    
    let emailContent = `Subject: Urgent Medicine Procurement Request - ${currentDate}\n\n`;
    emailContent += `Dear Procurement Team,\n\n`;
    emailContent += `This is an automated alert regarding medicine inventory status as of ${currentDate}.\n\n`;

    if (outOfStockMeds.length > 0) {
      emailContent += `🚨 OUT OF STOCK MEDICINES (Immediate Action Required):\n`;
      outOfStockMeds.forEach(med => {
        emailContent += `• ${med.name} - Completely out of stock (0 units)\n`;
      });
      emailContent += `\n`;
    }

    if (lowStockMeds.length > 0) {
      emailContent += `⚠️ LOW STOCK MEDICINES (Reorder Soon):\n`;
      lowStockMeds.forEach(med => {
        emailContent += `• ${med.name} - Current quantity: ${med.qty} units\n`;
      });
      emailContent += `\n`;
    }

    emailContent += `Please arrange for immediate procurement of the above medicines to ensure continuous healthcare services.\n\n`;
    emailContent += `For any queries, please contact the Health Department.\n\n`;
    emailContent += `Best regards,\n`;
    emailContent += `Inventory Management System\n`;
    emailContent += `Generated automatically on ${currentDate}`;

    return emailContent;
  };

  // Send email or SMS
  const handleSendNotification = async () => {
    if (!emailForm.recipient.trim()) {
      showNotification('Please enter email or phone number');
      return;
    }

    setEmailSending(true);
    try {
      const content = generateEmailContent();
      
      if (emailForm.isPhone) {
        // SMS Logic - For demonstration, showing alert
        const smsContent = `MEDICINE ALERT: Low/Out of stock medicines need procurement. Contact health dept for details.`;
        console.log('SMS to send:', { to: emailForm.recipient, message: smsContent });
        showNotification(`SMS notification sent to ${emailForm.recipient}`);
      } else {
        // Try multiple email sending methods
        let emailSent = false;

        // Method 1: EmailJS (if configured)
        try {
          // Replace these with your actual EmailJS credentials
          const serviceID = 'service_xxxxxxx'; 
          const templateID = 'template_xxxxxxx'; 
          const publicKey = 'xxxxxxxxxx'; 

          const templateParams = {
            to_email: emailForm.recipient,
            from_name: 'Health Department - Inventory System',
            subject: `Urgent Medicine Procurement Request - ${new Date().toLocaleDateString()}`,
            message: content,
            reply_to: currentUser?.email || 'health@college.edu'
          };

          if (serviceID !== 'service_xxxxxxx') { // Only try if credentials are set
            const result = await emailjs.send(serviceID, templateID, templateParams, publicKey);
            if (result.status === 200) {
              emailSent = true;
              showNotification(`Email sent successfully to ${emailForm.recipient}!`);
            }
          }
        } catch (emailError) {
          console.log('EmailJS not configured or failed:', emailError);
        }

        // Method 2: FormSubmit.co (Free email service)
        if (!emailSent) {
          try {
            const formData = new FormData();
            formData.append('email', emailForm.recipient);
            formData.append('subject', `Urgent Medicine Procurement Request - ${new Date().toLocaleDateString()}`);
            formData.append('message', content);
            formData.append('_next', window.location.href);
            formData.append('_template', 'basic');

            const response = await fetch('https://formsubmit.co/ajax/' + emailForm.recipient, {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              emailSent = true;
              showNotification(`Email sent successfully to ${emailForm.recipient}!`);
            }
          } catch (formSubmitError) {
            console.log('FormSubmit failed:', formSubmitError);
          }
        }

        // Method 3: mailto fallback (opens email client)
        if (!emailSent) {
          const subject = encodeURIComponent(`Urgent Medicine Procurement Request - ${new Date().toLocaleDateString()}`);
          const body = encodeURIComponent(content);
          const mailtoLink = `mailto:${emailForm.recipient}?subject=${subject}&body=${body}`;
          
          window.open(mailtoLink, '_blank');
          showNotification(`Email client opened. Please send the email manually to ${emailForm.recipient}`);
          emailSent = true;
        }
      }
      
      setShowEmailModal(false);
      setEmailForm({ recipient: '', isPhone: false });
    } catch (error) {
      console.error('Error sending notification:', error);
      showNotification('Failed to send notification. Please try again.');
    } finally {
      setEmailSending(false);
    }
  };  // Back button
const handleBack = () => {
  navigate("/campus/:campusName/assets"); // Asset Dashboard (Kishanganj) page pe le jayega
};


  // Status counts
  const totalMedications = medications.length;
  const inStock = medications.filter(m => calculateStatus(m.qty) === "In Stock").length;
  const lowStock = medications.filter(m => calculateStatus(m.qty) === "Low Stock").length;
  const outOfStock = medications.filter(m => calculateStatus(m.qty) === "Out of Stock").length;

  // Add Medication
  const handleAdd = async () => {
    if (!newMed.name || !newMed.qty || !newMed.expiry) {
      showNotification("Please fill all fields.");
      return;
    }
    try {
      const newMedicationData = {
        ...newMed,
        qty: parseInt(newMed.qty),
      };
      await addDoc(collection(db, 'medications'), newMedicationData);
      setNewMed({ name: "", qty: "", expiry: "" });
      showNotification("Medication added successfully!");
    } catch (error) {
      console.error("Error adding medication:", error);
      showNotification("Error adding medication. Please try again.");
    }
  };

  // Delete Medication
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'medications', id));
      showNotification("Medication removed.");
    } catch (error) {
      console.error("Error deleting medication:", error);
      showNotification("Error deleting medication. Please try again.");
    }
  };

  // Edit Medication
  const handleEdit = (med) => setEditingMed({ ...med });
  const saveEdit = async () => {
    try {
      const medicationRef = doc(db, 'medications', editingMed.id);
      const { id, ...updateData } = { ...editingMed, qty: parseInt(editingMed.qty) };
      await updateDoc(medicationRef, updateData);
      setEditingMed(null);
      showNotification("Changes saved!");
    } catch (error) {
      console.error("Error updating medication:", error);
      showNotification("Error updating medication. Please try again.");
    }
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

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
        {notification && (
            <div className="fixed top-5 right-5 bg-blue-500 text-white py-2 px-4 rounded-lg shadow-lg animate-bounce">
                {notification}
            </div>
        )}




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

      {/* Procurement Request Button - Only for Admin/Council */}
      {userRole && (userRole === 'admin' || userRole === 'council') && (lowStock > 0 || outOfStock > 0) && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowEmailModal(true)}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors duration-200 shadow-lg flex items-center font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Procurement Request
          </button>
        </div>
      )}


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
      
      {/* Health Requests Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Health / Item Requests</h3>
          <span className="text-sm text-gray-500">Total: {requests.length}</span>
        </div>

        <div className="flex items-center justify-end">
          <button onClick={() => setShowAllNotifications(true)} className="text-blue-600 hover:underline">All Notifications</button>
        </div>

        {/* All notifications modal */}
        {showAllNotifications && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 overflow-auto max-h-[80vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">All Notifications</h3>
                <button onClick={() => setShowAllNotifications(false)} className="text-gray-500 hover:text-gray-800">Close</button>
              </div>
              <div className="space-y-3">
                {requests.length === 0 ? (
                  <div className="text-gray-500">No notifications.</div>
                ) : (
                  requests.map(r => (
                    <div key={r.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{r.itemName} {r.isCountable ? `x${r.quantity}` : ''}</div>
                          <div className="text-sm text-gray-600">By: {r.requesterName} ({r.requesterEmail})</div>
                          <div className="text-sm text-gray-600">Reason: {r.reason}</div>
                          <div className="text-xs text-gray-400">Requested: {r.dateRequested}</div>
                        </div>
                        <div>
                          {r.status !== 'pending' && (
                            <div className={`px-3 py-1 rounded-full text-sm ${r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{r.status}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      

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

      {/* Email/SMS Modal for Procurement Request */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Send Procurement Request</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Method
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="contactMethod"
                      checked={!emailForm.isPhone}
                      onChange={() => setEmailForm(prev => ({ ...prev, isPhone: false }))}
                      className="mr-2"
                    />
                    Email
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="contactMethod"
                      checked={emailForm.isPhone}
                      onChange={() => setEmailForm(prev => ({ ...prev, isPhone: true }))}
                      className="mr-2"
                    />
                    Phone (SMS)
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {emailForm.isPhone ? 'Phone Number' : 'Email Address'}
                </label>
                <input
                  type={emailForm.isPhone ? 'tel' : 'email'}
                  value={emailForm.recipient}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, recipient: e.target.value }))}
                  placeholder={emailForm.isPhone ? '+1234567890' : 'supplier@example.com'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Preview
                </label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm max-h-32 overflow-y-auto">
                  {generateEmailContent()}
                </div>
              </div>

              {/* Email Setup Info */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📧 Email Setup Methods:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>Method 1:</strong> Configure EmailJS for automated sending</li>
                  <li>• <strong>Method 2:</strong> Direct email service (FormSubmit)</li>
                  <li>• <strong>Method 3:</strong> Opens your email client (Gmail/Outlook)</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  📝 See <code>emailjs-setup.md</code> for EmailJS configuration
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={emailSending}
                  className={`px-4 py-2 rounded-lg text-white ${emailSending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {emailSending ? 'Sending...' : (emailForm.isPhone ? 'Send SMS' : 'Send Email')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

     </div>
    </div>
  );
}

