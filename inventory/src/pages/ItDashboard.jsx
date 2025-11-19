import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ Ye bhi import karna zaruri hai
import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot } from '../firebase';


// --- Initial Data ---
const initialLaptops = [
  { id: 1, name: 'Dell Inspiron', owner: 'Asha Vikas', serialNumber: 'SN123456', disk: '512GB SSD', model: 'Inspiron 15', memory: '16GB RAM', processor: 'Intel i7', osName: 'Windows 10', status: 'in-stock' },
  { id: 2, name: 'HP EliteBook', owner: 'Rohit Sharma', serialNumber: 'HP998877', disk: '256GB SSD', model: 'EliteBook 840', memory: '8GB RAM', processor: 'Intel i5', osName: 'Windows 11', status: 'damaged' },
  { id: 3, name: 'Lenovo ThinkPad', owner: 'Sonia Verma', serialNumber: 'LN556677', disk: '1TB HDD', model: 'T480', memory: '8GB RAM', processor: 'Intel i5', osName: 'Ubuntu 20.04', status: 'out-of-stock' },
  { id: 4, name: 'MacBook Pro', owner: 'Priya Patel', serialNumber: 'MBP202301', disk: '1TB SSD', model: 'M2 Pro 14"', memory: '16GB RAM', processor: 'Apple M2 Pro', osName: 'macOS Ventura', status: 'in-stock'},
  { id: 5, name: 'Microsoft Surface', owner: 'Anil Kumar', serialNumber: 'MS789012', disk: '256GB SSD', model: 'Surface Laptop 4', memory: '8GB RAM', processor: 'AMD Ryzen 5', osName: 'Windows 11', status: 'out-of-stock'},
  { id: 6, name: 'HP Pavilion', owner: 'Kajal Thakur', serialNumber: 'HPPAVILION9', disk: '512GB SSD', model: 'Pavilion 15', memory: '16GB RAM', processor: 'AMD Ryzen 7', osName: 'Windows 11', status: 'in-stock'},
];

// --- Helper Objects for Styling ---
const STATUS_STYLES = {
  'in-stock': {
    badge: 'bg-green-100 text-green-800',
    row: 'bg-green-50',
    color: '#16a34a',
    label: 'In Stock',
  },
  'damaged': {
    badge: 'bg-red-100 text-red-800',
    row: 'bg-red-50',
    color: '#dc2626',
    label: 'Damaged',
  },
  'out-of-stock': {
    badge: 'bg-amber-100 text-amber-800',
    row: 'bg-amber-50',
    color: '#d97706',
    label: 'Out of Stock',
  },
};

// --- Child Components ---

// PieChart component updated for hover and animation
function PieChart({ data, size = 180, hoveredIndex, setHoveredIndex }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let accumulated = 0;
  const center = size / 2;
  const radius = center - 4;

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transition-all duration-300">
      {data.map((slice, i) => {
        const startAngle = (accumulated / total) * 360;
        accumulated += slice.value;
        const endAngle = (accumulated / total) * 360;
        const start = polarToCartesian(center, center, radius, endAngle);
        const end = polarToCartesian(center, center, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        const d = `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
        
        const isHovered = i === hoveredIndex;

        return (
          <path 
            key={i} 
            d={d} 
            fill={slice.color} 
            stroke="#fff" 
            strokeWidth="2" 
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="transition-transform duration-300 cursor-pointer"
            style={{
              // Slice "pops out" slightly on hover
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: `${center}px ${center}px`,
              filter: isHovered ? 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' : 'none',
            }}
          />
        );
      })}
      <circle cx={center} cy={center} r={radius - 40} fill="#fff" />
      <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-700">
        {total}
      </text>
    </svg>
  );
}

function Toast({ message, type, onclose }) {
  const baseClasses = "fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl text-white transition-transform transform";
  const typeClasses = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`${baseClasses} ${typeClasses}`}>
      {message}
      <button onClick={onclose} className="ml-4 font-bold opacity-70 hover:opacity-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

function DeleteModal({ onclose, onconfirm }) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full transform transition-all scale-100">
          <h3 className="text-lg font-extrabold text-gray-800 border-b pb-2 mb-3">Confirm Deletion</h3>
          <p className="text-sm text-gray-600 mt-2">Are you sure you want to delete this laptop? This action cannot be undone.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onclose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
            <button onClick={onconfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-md shadow-red-200">Delete</button>
          </div>
        </div>
      </div>
    );
}


// --- Main Dashboard Component ---
export default function ITDashboard() {
  // Initialize state - will be loaded from Firebase
  const [laptops, setLaptops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [laptopSubmissions, setLaptopSubmissions] = useState([]);
  const [laptopReturns, setLaptopReturns] = useState([]);

  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ id: null, name: '', owner: '', serialNumber: '', disk: '', model: '', memory: '', processor: '', osName: '', status: 'in-stock' });
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, laptopId: null });
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState(null); // State for Pie Chart hover
  const searchContainerRef = useRef(null);
  
  // NOTE: If using 'react-router-dom', you would uncomment this line:
  // const navigate = useNavigate();

  // Load data from Firebase on component mount
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'laptops'), async (snapshot) => {
      const laptopsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If collection is empty, populate with initial data
      if (laptopsData.length === 0 && snapshot.metadata.fromCache === false) {
        console.log("Laptops collection is empty, adding initial data...");
        try {
          for (const laptop of initialLaptops) {
            const { id, ...laptopData } = laptop; // Remove id field
            await addDoc(collection(db, 'laptops'), laptopData);
          }
          console.log("Initial laptops data added successfully!");
        } catch (error) {
          console.error("Error adding initial laptops:", error);
        }
      } else {
        setLaptops(laptopsData);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error loading laptops:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load laptop submissions from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'laptopSubmissions'), (snapshot) => {
      const submissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by timestamp, newest first
      submissionsData.sort((a, b) => {
        const timeA = a.timestamp?.toDate() || new Date(0);
        const timeB = b.timestamp?.toDate() || new Date(0);
        return timeB - timeA;
      });
      
      setLaptopSubmissions(submissionsData);
    }, (error) => {
      console.error("Error loading laptop submissions:", error);
    });

    return () => unsubscribe();
  }, []);

  // Load laptop returns from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'laptopReturns'), (snapshot) => {
      const returnsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by timestamp, newest first
      returnsData.sort((a, b) => {
        const timeA = a.timestamp?.toDate() || new Date(0);
        const timeB = b.timestamp?.toDate() || new Date(0);
        return timeB - timeA;
      });
      
      setLaptopReturns(returnsData);
    }, (error) => {
      console.error("Error loading laptop returns:", error);
    });

    return () => unsubscribe();
  }, []);

  // Effect to show suggestions based on search query (for the dropdown)
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.trim().toLowerCase();
      // Search across multiple fields for suggestions
      const filteredSuggestions = laptops.filter(l =>
        (l.name || '').toLowerCase().includes(query) ||
        (l.owner || '').toLowerCase().includes(query) ||
        (l.serialNumber || '').toLowerCase().includes(query)
      ).slice(0, 10); // Limit suggestions to 10
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, laptops]);
  
  // Effect to close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  // Compute stats for cards and pie chart using useMemo
  const stats = useMemo(() => {
    const total = laptops.length;
    const damaged = laptops.filter((l) => l.status === 'damaged').length;
    const inStock = laptops.filter((l) => l.status === 'in-stock').length;
    const outOfStock = laptops.filter((l) => l.status === 'out-of-stock').length;
    return { total, damaged, inStock, outOfStock };
  }, [laptops]);

  const pieData = useMemo(() => [
    { label: 'In Stock', value: stats.inStock, color: STATUS_STYLES['in-stock'].color },
    { label: 'Damaged', value: stats.damaged, color: STATUS_STYLES['damaged'].color },
    { label: 'Out of Stock', value: stats.outOfStock, color: STATUS_STYLES['out-of-stock'].color },
  ], [stats]);

  // Filter and search logic for the main table (Visible Laptops)
  const visibleLaptops = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return laptops
      .filter((l) => (filter === 'all' ? true : l.status === filter))
      .filter((l) => {
        if (!query) return true;
        // Match against name, owner, or serial number
        const nameMatch = (l.name || '').toLowerCase().includes(query);
        const ownerMatch = (l.owner || '').toLowerCase().includes(query);
        const serialMatch = (l.serialNumber || '').toLowerCase().includes(query);
        return nameMatch || ownerMatch || serialMatch;
      });
  }, [laptops, filter, searchQuery]);

  // Helper function for showing toast messages
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(s => ({ ...s, show: false })), 3000);
  };

  // Resets the form state
  const resetForm = () => {
    setForm({ id: null, name: '', owner: '', serialNumber: '', disk: '', model: '', memory: '', processor: '', osName: '', status: 'in-stock' });
    setIsEditing(false);
  };

  // Handles form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };
  
  // Handles form submission (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // Edit logic - update in Firebase
        const laptopRef = doc(db, 'laptops', form.id);
        const { id, ...updateData } = form; // Remove id from update data
        await updateDoc(laptopRef, updateData);
        showToast('Laptop updated successfully!', 'success');
      } else {
        // Add logic - add to Firebase
        const { id, ...newLaptopData } = form; // Remove id from new data
        await addDoc(collection(db, 'laptops'), newLaptopData);
        showToast('Laptop added successfully!', 'success');
      }
      resetForm();
    } catch (error) {
      console.error("Error saving laptop:", error);
      showToast('Error saving laptop. Please try again.', 'error');
    }
  };
  
  // Sets the form for editing
  const handleEdit = (laptop) => {
    setForm({ ...laptop });
    setIsEditing(true);
    // Scroll to the form area for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Opens the delete confirmation modal
  const openDeleteModal = (id) => {
    setDeleteModal({ isOpen: true, laptopId: id });
  };

  // Closes the delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, laptopId: null });
  };
  
  // Confirms and executes the delete action
  const confirmDelete = async () => {
    try {
      const laptopRef = doc(db, 'laptops', deleteModal.laptopId);
      await deleteDoc(laptopRef);
      closeDeleteModal();
      showToast('Laptop deleted.', 'error');
    } catch (error) {
      console.error("Error deleting laptop:", error);
      showToast('Error deleting laptop. Please try again.', 'error');
    }
  };

  // Delete laptop return message
  const deleteLaptopReturn = async (returnId) => {
    try {
      const returnRef = doc(db, 'laptopReturns', returnId);
      await deleteDoc(returnRef);
      showToast('Return message deleted successfully.', 'success');
    } catch (error) {
      console.error("Error deleting return message:", error);
      showToast('Error deleting return message. Please try again.', 'error');
    }
  };

  // Clicking suggestion filters the main table by setting the search query
  const handleSuggestionClick = (laptop) => {
    setSearchQuery(laptop.name); 
    setSuggestions([]); // Close the suggestion box
  };
  
  // --- Updated Functionality: Smart Back/Reset View ---
  const handleGoBack = () => {
      const isFiltered = searchQuery.trim() !== '' || filter !== 'all';
      
      if (isFiltered) {
          // 1. If search/filters are active, reset them (stay on the IT Dashboard)
          setSearchQuery('');
          setFilter('all');
          setSuggestions([]); 
          showToast('View reset to main inventory list.', 'success');
      } else {
          // 2. If already in the main view, navigate back in browser history 
          // (like going back to a main menu or previous page)
          
          // If you were using 'react-router-dom', the navigation logic would look like this:
          // navigate('/dashboard'); 
          
          // For now, we use the native browser history 'back' function:
          if (window.history.length > 1) {
              window.history.back();
          } else {
              showToast('Cannot go back further in history. Resetting view instead.', 'error');
          }
      }
  };

  // Handle laptop submission approval
  const handleApproveSubmission = async (submissionId, submission) => {
    try {
      // Update submission status to approved
      await updateDoc(doc(db, 'laptopSubmissions', submissionId), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'IT Admin'
      });

      // Send notification to specific user who submitted the laptop
      await addDoc(collection(db, 'userNotifications'), {
        title: 'Laptop Submission Approved',
        message: `Your laptop submission (${submission.laptopNumber}) has been approved successfully. Your laptop is now submitted.`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
        recipientUid: submission.uid || '',
        recipientEmail: submission.email,
        recipientName: submission.name,
        fromSystem: 'IT Department'
      });

      showToast('Submission approved successfully!', 'success');
    } catch (error) {
      console.error('Error approving submission:', error);
      showToast('Error approving submission. Please try again.', 'error');
    }
  };

  // Handle laptop submission disapproval
  const handleDisapproveSubmission = async (submissionId, submission) => {
    try {
      // Update submission status to disapproved
      await updateDoc(doc(db, 'laptopSubmissions', submissionId), {
        status: 'disapproved',
        disapprovedAt: new Date().toISOString(),
        disapprovedBy: 'IT Admin'
      });

      // Send notification to specific user who submitted the laptop  
      await addDoc(collection(db, 'userNotifications'), {
        title: 'Laptop Submission Disapproved',
        message: `Your laptop submission (${submission.laptopNumber}) has been disapproved. Please contact IT department for more information.`,
        type: 'error',
        read: false,
        createdAt: new Date().toISOString(),
        recipientUid: submission.uid || '',
        recipientEmail: submission.email,
        recipientName: submission.name,
        fromSystem: 'IT Department'
      });

      showToast('Submission disapproved.', 'info');
    } catch (error) {
      console.error('Error disapproving submission:', error);
      showToast('Error disapproving submission. Please try again.', 'error');
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      {/* Toast and Modal Components */}
      {toast.show && <Toast message={toast.message} type={toast.type} onclose={() => setToast(s => ({...s, show: false}))} />}
      {deleteModal.isOpen && <DeleteModal onclose={closeDeleteModal} onconfirm={confirmDelete} />}

      <div className="p-4 sm:p-6 font-sans bg-blue-50 min-h-screen">
        <header className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 mb-6">
          {/* Column 1: Logo and Title */}
          <div className="flex items-center gap-3 justify-self-start">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 text-white font-extrabold text-lg shadow-lg shadow-blue-200">IT</div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">IT Dashboard</h1>
              <p className="text-xs text-gray-500">Laptop Inventory Management</p>
            </div>
          </div>
          
          {/* Column 2: Search Input with Suggestions */}
          <div ref={searchContainerRef} className="w-full max-w-xl justify-self-center md:col-start-2 relative">
            <input 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search by name, owner, or serial number..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-md transition-all" 
            />
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-20 max-h-96 overflow-y-auto text-left">
                {suggestions.map(suggestion => (
                  <li
                    key={suggestion.id}
                    className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-extrabold text-base text-gray-800">{suggestion.name}</div>
                            <div className="text-sm text-gray-500">Owner: {suggestion.owner}</div>
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${STATUS_STYLES[suggestion.status].badge}`}>
                          {STATUS_STYLES[suggestion.status].label}
                        </span>
                    </div>
                    {/* Detailed specs in a 3-column grid */}
                    <div className="mt-3 text-xs text-gray-600 grid grid-cols-3 gap-x-3 gap-y-1 border-t pt-2 border-slate-100">
                        <p><strong className="font-medium text-gray-700">Model:</strong> {suggestion.model}</p>
                        <p><strong className="font-medium text-gray-700">Serial:</strong> {suggestion.serialNumber}</p>
                        <p><strong className="font-medium text-gray-700">OS:</strong> {suggestion.osName}</p>
                        <p><strong className="font-medium text-gray-700">Disk:</strong> {suggestion.disk}</p>
                        <p><strong className="font-medium text-gray-700">RAM:</strong> {suggestion.memory}</p>
                        <p><strong className="font-medium text-gray-700">CPU:</strong> {suggestion.processor}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* End Search Container */}
            
          {/* Column 3: Back Button (Always colorful and responsive) */}
          
          <div className="justify-self-end w-full md:w-auto">
            
            <button 
                onClick={handleGoBack} 
                title="Filters aur Search ko Reset karein ya pichhle page par jaayen"
                // --- Button styling remains the same ---
                className="w-full md:w-auto px-4 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 text-sm whitespace-nowrap 
                           bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg shadow-orange-300 
                           hover:from-pink-600 hover:to-orange-500 active:scale-[0.97]"
            >
              {/* SVG for Back Arrow */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
          </div>

        </header>

        {/* ADD/EDIT FORM SECTION */}
        <section className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-slate-100">
            <h2 className="text-lg font-extrabold text-gray-800">{isEditing ? 'Edit Laptop Details' : 'Add New Laptop'}</h2>
            <p className="text-sm text-gray-500 mb-5">{isEditing ? 'Modify and update the record' : 'Fill the form to add a new laptop'}</p>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {/* Input Fields */}
              <input name="name" placeholder="Device Name (e.g., MacBook Pro)" value={form.name} onChange={handleChange} required className="p-3 rounded-lg border border-slate-300 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
              <input name="owner" placeholder="Owner Name (e.g., Jane Doe)" value={form.owner} onChange={handleChange} required className="p-3 rounded-lg border border-slate-300 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
              <input name="serialNumber" placeholder="Serial Number (e.g., SN123456)" value={form.serialNumber} onChange={handleChange} required className="lg:col-span-2 p-3 rounded-lg border border-slate-300 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
              
              <input name="model" placeholder="Model (e.g., T480)" value={form.model} onChange={handleChange} className="p-3 rounded-lg border border-slate-300" />
              <input name="osName" placeholder="OS (e.g., Windows 11)" value={form.osName} onChange={handleChange} className="p-3 rounded-lg border border-slate-300" />
              <select name="status" value={form.status} onChange={handleChange} className="p-3 rounded-lg border border-slate-300 bg-white appearance-none pr-8">
                <option value="in-stock">In Stock</option>
                <option value="damaged">Damaged</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              <div className='hidden lg:block' /> {/* Spacer on desktop */}

              <input name="disk" placeholder="Disk (e.g., 512GB SSD)" value={form.disk} onChange={handleChange} className="p-3 rounded-lg border border-slate-300" />
              <input name="memory" placeholder="Memory (e.g., 16GB RAM)" value={form.memory} onChange={handleChange} className="p-3 rounded-lg border border-slate-300" />
              <input name="processor" placeholder="Processor (e.g., Intel i7)" value={form.processor} onChange={handleChange} className="p-3 rounded-lg border border-slate-300" />
              
              {/* Action Buttons */}
              <div className="flex gap-3 items-center col-span-full mt-2">
                <button 
                  type="submit" 
                  // Add Laptop Button (kept blue)
                  className="px-6 py-3 rounded-xl border-none cursor-pointer bg-gradient-to-br from-blue-600 to-blue-400 text-white font-bold hover:from-blue-700 hover:to-blue-500 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]">
                  {isEditing ? 'Update Laptop' : 'Add Laptop'}
                </button>
                {isEditing && 
                  <button 
                    type="button" 
                    onClick={resetForm} 
                    className="px-6 py-3 rounded-xl border border-slate-300 bg-white cursor-pointer font-semibold text-gray-700 hover:bg-slate-100 transition-colors active:scale-[0.98]">
                    Cancel Edit
                  </button>
                }
              </div>
            </form>
        </section>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100">
                <div className="text-sm font-semibold text-gray-500">Total Devices</div>
                <div className="text-3xl font-extrabold text-gray-800 mt-1">{stats.total}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100">
                <div className="text-sm font-semibold text-gray-500">In Stock</div>
                <div className="text-3xl font-extrabold text-gray-800 mt-1">{stats.inStock}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100">
                <div className="text-sm font-semibold text-gray-500">Damaged</div>
                <div className="text-3xl font-extrabold text-gray-800 mt-1">{stats.damaged}</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100">
                <div className="text-sm font-semibold text-gray-500">Out of Stock</div>
                <div className="text-3xl font-extrabold text-gray-800 mt-1">{stats.outOfStock}</div>
            </div>
        </div>

        {/* LAPTOP SUBMISSION NOTIFICATIONS */}
        {laptopSubmissions.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-slate-100">
            <h3 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              New Laptop Submissions ({laptopSubmissions.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {laptopSubmissions.slice(0, 10).map((submission) => (
                <div key={submission.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-800">{submission.name}</div>
                    <div className="text-sm text-gray-500">
                      {submission.timestamp ? 
                        new Date(submission.timestamp.toDate()).toLocaleDateString() + ' ' + 
                        new Date(submission.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : 'Recently'
                      }
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Email:</span> {submission.email}</div>
                    <div><span className="font-medium">Laptop Number:</span> {submission.laptopNumber}</div>
                    <div><span className="font-medium">Submission Date:</span> {submission.submissionDate}</div>
                    {submission.chargerNumber && (
                      <div><span className="font-medium">Charger Number:</span> {submission.chargerNumber}</div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex gap-2 items-center justify-between">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {submission.status?.toUpperCase() || 'PENDING'}
                    </span>
                    
                    {/* Show action buttons only for pending submissions */}
                    {(!submission.status || submission.status === 'pending') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveSubmission(submission.id, submission)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleDisapproveSubmission(submission.id, submission)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          ✗ Disapprove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {laptopSubmissions.length > 10 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  And {laptopSubmissions.length - 10} more submissions...
                </div>
              )}
            </div>
          </div>
        )}

        {/* LAPTOP RETURN NOTIFICATIONS */}
        {laptopReturns.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-slate-100">
            <h3 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              Laptop Returns ({laptopReturns.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {laptopReturns.slice(0, 10).map((returnItem) => (
                <div key={returnItem.id} className="p-4 border border-green-200 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-800">
                      {returnItem.name} returned their laptop
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">
                        {returnItem.timestamp ? 
                          new Date(returnItem.timestamp.toDate()).toLocaleDateString() + ' ' + 
                          new Date(returnItem.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                          : 'Recently'
                        }
                      </div>
                      <button
                        onClick={() => deleteLaptopReturn(returnItem.id)}
                        className="p-1 rounded-full hover:bg-red-200 text-red-600 hover:text-red-800 transition-colors"
                        title="Delete this return message"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Email:</span> {returnItem.email}</div>
                    <div><span className="font-medium">Laptop Number:</span> {returnItem.laptopNumber}</div>
                    <div><span className="font-medium">Return Date:</span> {returnItem.returnDate}</div>
                    {returnItem.chargerNumber && (
                      <div><span className="font-medium">Charger Number:</span> {returnItem.chargerNumber}</div>
                    )}
                  </div>
                  
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      RETURNED
                    </span>
                  </div>
                </div>
              ))}
              
              {laptopReturns.length > 10 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  And {laptopReturns.length - 10} more returns...
                </div>
              )}
            </div>
          </div>
        )}

        {/* INVENTORY TABLE & CHART */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
            {/* Header and Filter */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-gray-800">Laptop Inventory</h3>
              
              <div className="flex items-center gap-3 text-sm">
                <label className="font-semibold text-gray-600">Filter Status:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2.5 rounded-lg border border-slate-300 bg-white">
                  <option value="all">All</option>
                  <option value="in-stock">In Stock</option>
                  <option value="damaged">Damaged</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-500">{visibleLaptops.length} items shown</div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left bg-blue-50">
                    {['Device / Owner', 'Serial', 'Disk', 'Model', 'Memory', 'OS', 'Status', 'Action'].map(h => <th key={h} className="p-3 font-bold text-gray-700 border-b border-slate-200">{h}</th>)}
                  </tr>
                </thead>
                <tbody>{visibleLaptops.map(lap => {
                    const style = STATUS_STYLES[lap.status];
                    return (
                      <tr id={`laptop-row-${lap.id}`} key={lap.id} className={`${style.row} hover:bg-slate-100 transition-all duration-150 border-b border-slate-200`}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white grid place-content-center font-bold text-lg shadow-md">{lap.name.charAt(0) || 'L'}</div>
                            <div>
                                <div className="font-bold text-gray-900">{lap.name}</div>
                                <div className="text-xs text-gray-600">{lap.owner}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-gray-700 font-mono">{lap.serialNumber}</td>
                        <td className="p-3 text-gray-700">{lap.disk}</td>
                        <td className="p-3 text-gray-700">{lap.model}</td>
                        <td className="p-3 text-gray-700">{lap.memory}</td>
                        <td className="p-3 text-gray-700">{lap.osName}</td>
                        <td className="p-3"><span className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${style.badge}`}>{style.label}</span></td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(lap)} aria-label="Edit" title="Edit" className="p-2 w-8 h-8 grid place-content-center rounded-lg border border-slate-300 bg-white text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <button onClick={() => openDeleteModal(lap.id)} aria-label="Delete" title="Delete" className="p-2 w-8 h-8 grid place-content-center rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors shadow-sm">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}{visibleLaptops.length === 0 && (
                    <tr><td colSpan={8} className="p-6 text-center text-gray-500 bg-slate-50 border-b border-slate-200">No items match your current search and filter criteria.</td></tr> 
                  )}</tbody>
              </table>
            </div>
            
            {/* PIE CHART and Legend */}
            <div className="flex flex-wrap gap-8 items-center mt-4 pt-4 border-t border-slate-100">
              <div>
                <PieChart 
                    data={pieData} 
                    size={180} 
                    hoveredIndex={hoveredSliceIndex} 
                    setHoveredIndex={setHoveredSliceIndex} 
                />
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-gray-800 mb-2">Inventory Status Breakdown</h4>
                {pieData.map((p, index) => (
                  <div 
                    key={p.label} 
                    className={`flex gap-4 items-center text-sm cursor-pointer transition-all duration-200 ${hoveredSliceIndex === index ? 'opacity-100 font-extrabold text-blue-600 scale-[1.03]' : 'opacity-80'}`}
                    onMouseEnter={() => setHoveredSliceIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div style={{ background: p.color }} className="w-3.5 h-3.5 rounded-full shadow-md" />
                    <div className="font-semibold text-gray-700 w-28">{p.label}</div>
                    <div className="text-gray-500 ml-auto font-mono">{p.value} unit(s)</div>
                  </div>
                ))}
              </div>
            </div>
        </div>
      </div>
    </>
  );
}

