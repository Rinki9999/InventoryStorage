import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Warehouse, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { logOut, onAuthChange, db, collection, onSnapshot, sendNotification, addDoc, updateDoc, doc, query, where, getDocs, getDoc, runTransaction } from '../firebase';

import LaptopSubmissionForm from '../components/LaptopSubmissionForm';
import LaptopReturnForm from '../components/LaptopReturnForm';
import MedicineFormModal from '../components/MedicineFormModal';
import MedicineUsageModal from '../components/MedicineUsageModal';
import ActiveUsersAdmin from '../components/ActiveUsersAdmin';

// --- Notification Sound System ---
const playNotificationSound = (type = 'success') => {
  try {
    // Create audio context for web audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Different sounds for different notification types
    const soundFrequencies = {
      success: [800, 600, 400], // Success sound (descending)
      error: [300, 300, 300], // Error sound (same tone)
      info: [500, 700, 500] // Info sound (up-down)
    };
    
    const frequencies = soundFrequencies[type] || soundFrequencies.success;
    let delay = 0;
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }, delay);
      delay += 200;
    });
  } catch (error) {
    console.log('Audio not supported:', error);
  }
};

// --- Initial Data and Constants ---

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
  
  // Office Supplies Items
  { id: 13, name: 'A4 Paper', category: 'Office Supplies', qty: 50, expiry: '-', status: 'In Stock', assigned: 'Office', value: 20 },
  { id: 14, name: 'Blue Pens', category: 'Office Supplies', qty: 3, expiry: '-', status: 'Low Stock', assigned: 'Reception', value: 10 },
  { id: 15, name: 'Staplers', category: 'Office Supplies', qty: 8, expiry: '-', status: 'In Stock', assigned: 'Various', value: 15 },
  { id: 16, name: 'Paper Clips', category: 'Office Supplies', qty: 2, expiry: '-', status: 'Low Stock', assigned: 'Office', value: 5 },
  { id: 17, name: 'Folders', category: 'Office Supplies', qty: 15, expiry: '-', status: 'In Stock', assigned: 'Archive', value: 25 },
  { id: 18, name: 'Whiteboard Markers', category: 'Office Supplies', qty: 1, expiry: '-', status: 'Low Stock', assigned: 'Meeting Rooms', value: 12 },
  { id: 19, name: 'Printer Cartridges', category: 'Office Supplies', qty: 0, expiry: '-', status: 'Out of Stock', assigned: '-', value: 80 },
  { id: 20, name: 'Notebooks', category: 'Office Supplies', qty: 25, expiry: '-', status: 'In Stock', assigned: 'Supply Room', value: 35 },
  { id: 21, name: 'Highlighters', category: 'Office Supplies', qty: 4, expiry: '-', status: 'Low Stock', assigned: 'Office', value: 8 },
  { id: 22, name: 'Desk Organizers', category: 'Office Supplies', qty: 6, expiry: '-', status: 'In Stock', assigned: 'Workstations', value: 30 },
];

const CATEGORIES = ['IT', 'Food', 'Health', 'Office Supplies', 'Furniture'];
const STATUSES = ['In Stock', 'Low Stock', 'Out of Stock', 'Damaged', 'Expired'];

const ChartColors = {
  IT: '#6366f1',
  Furniture: '#f97316',
  Health: '#10b981',
  OfficeSupplies: '#3b82f6',
  Food: '#ec4899',
};

const isAssetUrgent = (status) =>
  status === 'Low Stock' || status === 'Expired' || status === 'Damaged';

// Notification handlers for different asset conditions
const handleAssetNotification = async (asset, status) => {
  let type;
  let recipients = ['admin'];

  // Add category-specific recipients
  if (asset.category === 'IT') {
    recipients.push('it_council');
  } else if (asset.category === 'Health') {
    recipients.push('health_council');
  }

  switch (status) {
    case 'Low Stock':
      type = 'low_stock';
      break;
    case 'Expired':
      type = 'expired';
      break;
    case 'Damaged':
      type = 'damaged';
      break;
    default:
      type = 'update';
  }

  await sendNotification(type, asset, recipients);
};

// Example: Send a test notification for IT equipment
const testNotification = {
  name: "Laptop",
  category: "IT",
  qty: 2,
  status: "Low Stock"
};
handleAssetNotification(testNotification, "Low Stock");

const API_MODEL = 'gemini-2.5-flash-preview-05-20';
const API_KEY = "";


// --- Utility for API Calls ---
const retryFetch = async (apiCall, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await apiCall();
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error("API call failed after multiple retries.");
      }
    }
  }
};


const NavItem = ({ title, icon: Icon, dropdownItems, currentUser, navigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Outside click close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavClick = (itemTitle) => {
    setIsOpen(false);
    if (itemTitle === "Health and Hygiene") {
      navigate("/helth"); // ✅ Navigate to Helth page
    }
    if (itemTitle === "IT Equipment") {
      navigate("/itdashboard"); // ✅ Navigate to ITDashboard page
    }
    if (itemTitle === "Food Inventory") {
      navigate("/food");
    }
    if (itemTitle === "Office Supplies") {
      navigate("/office-supplies");
    }
    if (itemTitle === "User Management") {
      setShowActiveUsers(true); // ✅ Open ActiveUsersAdmin modal
    }

    // future dropdowns add here
  };




  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`flex items-center p-3 rounded-xl cursor-pointer text-sm font-semibold hover:bg-teal-700`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon className="w-5 h-5 mr-1" />
        {title}
        {dropdownItems && (
          <ChevronDown
            className={`w-4 h-4 ml-1 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"
              }`}
          />
        )}
      </div>

      {dropdownItems && isOpen && (
        <ul className="absolute z-30 top-full left-0 mt-2 bg-white text-gray-700 py-2 rounded-xl shadow-xl min-w-[180px]">
          {dropdownItems.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleNavClick(item)}
              className="px-4 py-2 hover:bg-teal-50 hover:text-teal-700 cursor-pointer text-sm font-medium"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- Navbar Component ---
const Navbar = ({ userRole }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  // Use role passed from parent App; default to 'student' when not provided
  const effectiveRole = userRole || 'student';

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user || null);
      
      // Request notification permission when user logs in
      if (user && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for new notifications and play sound
  useEffect(() => {
    if (!currentUser?.uid) return;

    const notificationsRef = collection(db, 'userNotifications');
    const userNotificationsQuery = query(
      notificationsRef, 
      where('recipientUid', '==', currentUser.uid),
      where('read', '==', false)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(userNotificationsQuery, (snapshot) => {
      if (isFirstLoad) {
        isFirstLoad = false;
        return; // Skip playing sound on initial load
      }

      // Play sound for new notifications
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          console.log('New notification received:', notification);
          
          // Play appropriate sound based on notification type
          playNotificationSound(notification.type || 'info');
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico'
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Define all navigation options
  const allNavOptions = [
    {
      title: "Assets",
      icon: Warehouse,
      dropdownItems: ["IT Equipment", "Food Inventory", "Health and Hygiene", "Office Supplies"],
      allowedRoles: ["admin", "council"] // Only Admin and Council can access Assets
    },
    {
      title: "Settings",
      icon: Settings,
      dropdownItems: effectiveRole === "admin" 
        ? ["User Management"]
        : [],
      allowedRoles: ["admin"] // Only Admin can access Settings
    },
  ];

  // Filter navigation based on user role
  const navStructure = allNavOptions.filter(navItem => 
    navItem.allowedRoles.includes(effectiveRole)
  );

  const handleLogout = async () => {
    try {
      await logOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // 👇👇👇 ADD THIS FUNCTION FOR BACK
  const handleBack = () => {
    navigate(-1); // Go to previous page
  };

  return (
    <header className="sticky top-0 z-50 shadow-lg bg-teal-600 text-white">
      <div className="max-w-14xl mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <img
            src="https://beamish-paletas-139a19.netlify.app/logo.png"
            alt="Logo"
            className="h-10 w-auto mr-6"
          />
          <nav className="hidden md:flex space-x-3">
            {navStructure.map((item, idx) => (
              <NavItem
                key={idx}
                title={item.title}
                icon={item.icon}
                dropdownItems={item.dropdownItems}
                currentUser={currentUser}
                navigate={navigate} // ✅ important
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-6">
          <button
            onClick={handleBack}
            className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full text-sm font-semibold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      </div>
    </header>
  );
};



// --- Modal Component for Recommendations ---
const RecommendationModal = ({ isOpen, onClose, recommendation, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all scale-100 p-6 md:p-8">
        <div className="flex justify-between items-start mb-4 border-b pb-3">
          <h3 className="text-2xl font-bold text-blue-600">
            {recommendation.assetName} Disposal/Repair Plan
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-gray-700 font-medium">Generating smart recommendation from Gemini...</p>
          </div>
        ) : (
          <div className="space-y-4 text-gray-700">
            <p className="font-semibold text-lg">Status: <span className={`font-bold ${recommendation.status === 'Damaged' ? 'text-orange-500' : 'text-red-500'}`}>{recommendation.status}</span></p>
            {recommendation.text ? (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
                {recommendation.text}
              </div>
            ) : (
              <div className="text-center text-red-500 py-4">An issue occurred while generating the recommendation. Please try again.</div>
            )}
            <p className="text-xs text-right text-gray-400 mt-4">Powered by Google Gemini API</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};



const Sidebar = ({ filters, onFilterChange, onClearFilters, categories = [] }) => {

  const handleCheckboxChange = (type, value) => {
    const currentList = filters[type];
    if (currentList.includes(value)) {
      // Remove
      onFilterChange(type, currentList.filter(item => item !== value));
    } else {
      // Add
      onFilterChange(type, [...currentList, value]);
    }
  };

  return (
    <aside className="w-full md:w-64 bg-white p-6 border-r border-gray-200 flex-shrink-0 shadow-2xl">
      <h3 className="text-2xl font-extrabold text-gray-800 mb-6 border-b pb-2">Filters</h3>

      <div className="mb-6">
        <strong className="text-sm font-bold text-gray-700 block mb-3">Category</strong>
        <div className="space-y-2">
          {categories.map(category => (
            <label key={category} className="flex items-center text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={filters.categories.includes(category)}
                onChange={() => handleCheckboxChange('categories', category)}
              />
              <span className="ml-3">{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <strong className="text-sm font-bold text-gray-700 block mb-3">Status</strong>
        <div className="space-y-2">
          {STATUSES.map(status => (
            <label key={status} className="flex items-center text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={filters.statuses.includes(status)}
                onChange={() => handleCheckboxChange('statuses', status)}
              />
              <span className="ml-3">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Removed "Apply Filters" button since filtering is instant */}
      <button
        onClick={onClearFilters}
        className="w-full mt-2 py-2 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200"
      >
        Clear All Filters
      </button>
    </aside>
  );
};

// --- StatsCard Component ---
const StatsCard = ({ title, value, color }) => (
  <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100">
    <div className="text-base font-medium text-gray-500">{title}</div>
    <div className={`text-4xl font-extrabold mt-1 ${color || 'text-gray-800'}`}>{value}</div>
  </div>
);


// --- AssetsTable Component ---
const AssetsTable = ({ assets = [] }) => {

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-gray-200 text-gray-800';
      case 'Damaged': return 'bg-orange-100 text-orange-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl border border-gray-100 mt-6">
      <h4 className="text-2xl font-bold text-gray-800 mb-4">Full Inventory List ({assets.length} items)</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-t">
            <tr>
              {['Asset Name', 'Category', 'Qty', 'Status', 'Assigned To'].map(header => (
                <th key={header} scope="col" className="px-6 py-3 whitespace-nowrap">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400">No Assets Found. Please Adjust Filters.</td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="bg-white border-b"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{asset.name}</td>
                  <td className="px-6 py-4">{asset.category}</td>
                  <td className="px-6 py-4">{asset.qty}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{asset.assigned || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// PieChart component with hover and animation (restored from ItDashboard)
function PieChart({ data, size = 180, hoveredIndex, setHoveredIndex, filters }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let accumulated = 0;
  const center = size / 2;
  const radius = center - 4;

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
  };

  return (
    <>
      {/* Add custom CSS for spin animation */}
      <style>{`
        @keyframes spin-subtle {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pie-chart-rotating {
          animation: spin-subtle 20s linear infinite;
        }
      `}</style>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`} 
        className="transition-all duration-300 pie-chart-rotating"
      >
      {data.map((slice, i) => {
        const startAngle = (accumulated / total) * 360;
        accumulated += slice.value;
        const endAngle = (accumulated / total) * 360;
        const start = polarToCartesian(center, center, radius, endAngle);
        const end = polarToCartesian(center, center, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        const d = `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
        
        const isHovered = i === hoveredIndex;
        const isFiltered = filters?.categories?.length > 0;
        const isSelected = !isFiltered || filters.categories.includes(slice.label);
        const sliceOpacity = isFiltered && !isSelected ? 0.3 : 1;

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
              opacity: sliceOpacity,
            }}
          />
        );
      })}
      <circle cx={center} cy={center} r={radius - 40} fill="#fff" />
      <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-gray-700">
        {total}
      </text>
    </svg>
    </>
  );
}

const CategoryDistributionChart = ({ assets, filters, onFilterChange }) => {
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState(null);
  
  // Calculate category asset counts for visualization
  const categoryData = useMemo(() => {
    const counts = assets.reduce((acc, asset) => {
      // Count all assets regardless of status
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {});

    // Convert to pie chart data format
    return Object.keys(counts).map(category => ({
      label: category,
      value: counts[category],
      color: ChartColors[category] || '#9ca3af'
    })).sort((a, b) => b.value - a.value);
  }, [assets]);

  const totalAssets = categoryData.reduce((sum, item) => sum + item.value, 0);

  // Function to handle category filter toggle
  const handleCategoryClick = (category) => {
    if (onFilterChange) {
      const currentCategories = filters.categories || [];
      const newCategories = currentCategories.includes(category)
        ? currentCategories.filter(c => c !== category)
        : [...currentCategories, category];
      onFilterChange('categories', newCategories);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100 w-full">
      <h4 className="text-xl font-bold text-gray-800 mb-4">Category-wise Asset Distribution</h4>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
        {/* Animated SVG Pie Chart */}
        <div className="flex-shrink-0">
          <PieChart 
            data={categoryData} 
            size={180} 
            hoveredIndex={hoveredSliceIndex} 
            setHoveredIndex={setHoveredSliceIndex} 
            filters={filters}
          />
        </div>

        {/* Interactive Legend */}
        <div className="flex-1 w-full sm:w-auto space-y-2">
          {categoryData.slice(0, 5).map((item, index) => {
            const isSelected = filters?.categories?.includes(item.label) || false;
            const isHovered = index === hoveredSliceIndex;
            const percentage = totalAssets > 0 ? ((item.value / totalAssets) * 100).toFixed(0) : 0;
            
            return (
              <div 
                key={item.label} 
                className={`flex items-center text-base cursor-pointer p-2 rounded-lg transition-all duration-200 justify-between ${
                  isSelected ? 'bg-blue-50 border border-blue-200' : 
                  isHovered ? 'bg-gray-50' : 'text-gray-700'
                }`}
                onClick={() => handleCategoryClick(item.label)}
                onMouseEnter={() => setHoveredSliceIndex(index)}
                onMouseLeave={() => setHoveredSliceIndex(null)}
              >
                <div className="flex items-center">
                  <div 
                    className={`flex-shrink-0 w-3 h-3 rounded-full mr-3 transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                    }`} 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className={`font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {percentage}%
                  </span>
                  <span className={`text-sm ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                    ({item.value})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- UrgentAlertsList Component ---
const UrgentAlertsList = ({ assets }) => {
  const [showAll, setShowAll] = useState(false);
  const urgentItems = assets.filter(a => isAssetUrgent(a.status));

  const lowStockAlerts = urgentItems.filter(a => a.status === 'Low Stock');
  const disposalAlerts = urgentItems.filter(a => a.status === 'Expired' || a.status === 'Damaged');

  return (
    <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100 w-full">
      <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center whitespace-nowrap overflow-hidden text-ellipsis">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Urgent Alerts (Alarm)
      </h4>

      {urgentItems.length === 0 ? (
        <div className="text-gray-500 text-center py-6 border-t border-gray-200 mt-4">No Urgent Alerts. Everything is Fine!</div>
      ) : (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          {lowStockAlerts.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-300">
              <p className="font-semibold text-gray-800 mb-2">Low Stock ({lowStockAlerts.length} item)</p>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                {(showAll ? lowStockAlerts : lowStockAlerts.slice(0, 3)).map(item => (
                  <li key={item.id} className="break-words">
                    {item.name} (Qty: {item.qty})
                  </li>
                ))}
                {!showAll && lowStockAlerts.length > 3 && (
                  <li className="font-medium text-gray-700">and {lowStockAlerts.length - 3} more items...</li>
                )}
              </ul>
            </div>
          )}

          {disposalAlerts.length > 0 && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-300">
              <p className="font-semibold text-gray-800 mb-2">Expired/Damaged ({disposalAlerts.length} item)</p>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                {(showAll ? disposalAlerts : disposalAlerts.slice(0, 3)).map(item => (
                  <li key={item.id} className="break-words">
                    {item.name} ({item.status})
                  </li>
                ))}
                {!showAll && disposalAlerts.length > 3 && (
                  <li className="font-medium text-gray-700">and {disposalAlerts.length - 3} more items...</li>
                )}
              </ul>
            </div>
          )}

          <div className="text-right pt-4 flex flex-col sm:flex-row justify-end items-end gap-2">
            <button
              onClick={() => setShowAll(prev => !prev)}
              className="text-blue-600 text-sm font-medium hover:underline py-2"
            >
              {showAll ? 'Show Less' : 'View All Alerts'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Request Form Component ---
const RequestForm = ({ currentUser, userRole }) => {
  const [form, setForm] = useState({
    requesterName: currentUser?.displayName || '',
    requesterEmail: currentUser?.email || '',
    role: userRole || '',
    reason: '',
    itemName: '',
    isCountable: true,
    quantity: '',
    dateRequested: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [message, setMessage] = useState('');

  // Load any existing request by this user so form becomes the edit interface
  useEffect(() => {
    let unsub;
    if (currentUser && currentUser.uid) {
      try {
        const q = query(collection(db, 'health_requests'), where('requesterUid', '==', currentUser.uid));
        unsub = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (docs.length > 0) {
            // Load the most recent request by createdAt if available
            docs.sort((a, b) => (a.createdAt || '') > (b.createdAt || '') ? -1 : 1);
            const existing = docs[0];
            setForm({
              requesterName: existing.requesterName || currentUser.displayName || '',
              requesterEmail: existing.requesterEmail || currentUser.email || '',
              role: existing.role || userRole || '',
              reason: existing.reason || '',
              itemName: existing.itemName || '',
              isCountable: existing.isCountable !== undefined ? existing.isCountable : true,
              quantity: existing.quantity || '',
              dateRequested: existing.dateRequested || ''
            });
            setIsSubmitted(true);
            setSubmittedId(existing.id);
            setMessage('Loaded your previous request. Edit and save changes if needed.');
          }
        });
      } catch (err) {
        console.error('Error loading existing request', err);
      }
    }
    return () => unsub && unsub();
  }, [currentUser]);

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    if (!form.requesterName || !form.requesterEmail || !form.reason || !form.itemName || !form.dateRequested) return false;
    if (form.isCountable && (!form.quantity || isNaN(Number(form.quantity)))) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setMessage('Please fill required fields correctly.');
      return;
    }

    try {
      const medDoc = await findMedicationByName(form.itemName);
      if (!medDoc) {
        setMessage('Item not available (Out of stock).');
        return;
      }
      const medData = medDoc.data();
      const requestedQty = form.isCountable ? Number(form.quantity) : 0;
      if (form.isCountable && requestedQty > (medData.qty || 0)) {
        setMessage('Insufficient stock for the requested quantity.');
        return;
      }

      // All checks passed — submit and decrement via helper
      await handleSubmitWithMed(medDoc);
    } catch (err) {
      console.error('Error during submit flow:', err);
      setMessage('Failed to submit. Try again.');
    }
  };

  // Helper: find medication document by name (case-insensitive)
  const findMedicationByName = async (name) => {
    if (!name) return null;
    
    // First try exact match on name field
    const medQ1 = query(collection(db, 'medications'), where('name', '==', name.trim()));
    let medSnap = await getDocs(medQ1);
    if (!medSnap.empty) return medSnap.docs[0];

    // If exact match fails, get all medications and search case-insensitively
    const allMedsQ = query(collection(db, 'medications'));
    const allMedsSnap = await getDocs(allMedsQ);
    const targetName = name.trim().toLowerCase();
    
    for (const medDoc of allMedsSnap.docs) {
      const medData = medDoc.data();
      if (medData.name && medData.name.toLowerCase() === targetName) {
        return medDoc;
      }
    }
    
    return null;
  };

  // Auto-check and submit on blur of item name
  const checkAndAutoSubmit = async () => {
    if (submittedId) return; // already submitted
    
    console.log('Checking medication:', form.itemName); // Debug log
    const medDoc = await findMedicationByName(form.itemName);
    console.log('Found medication doc:', medDoc ? medDoc.data() : 'Not found'); // Debug log
    
    if (!medDoc) {
      setMessage(`Medicine "${form.itemName}" not found in inventory.`);
      return;
    }
    const medData = medDoc.data();
    const currentStock = medData.qty || 0;
    
    if (form.isCountable) {
      if (!form.quantity) {
        setMessage(`${form.itemName} is available (${currentStock} in stock). Please enter quantity.`);
        return;
      }
      const requestedQty = Number(form.quantity);
      if (requestedQty > currentStock) {
        setMessage(`Insufficient stock: Only ${currentStock} ${form.itemName} available, but you requested ${requestedQty}.`);
        return;
      }
    }

    setMessage(`${form.itemName} is available (${currentStock} in stock). Ready to submit.`);
  };

  // New handleSubmit that accepts medDoc to avoid double-query
  const handleSubmitWithMed = async (medDoc) => {
    if (!validate()) {
      setMessage('Please fill required fields correctly.');
      return;
    }

    const payload = {
      requesterName: form.requesterName,
      requesterEmail: form.requesterEmail,
      requesterUid: currentUser?.uid || null,
      role: form.role,
      reason: form.reason,
      itemName: form.itemName,
      isCountable: !!form.isCountable,
      quantity: form.isCountable ? Number(form.quantity) : null,
      dateRequested: form.dateRequested,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      const ref = await addDoc(collection(db, 'health_requests'), payload);
      // decrement medication qty if countable
      if (form.isCountable && medDoc) {
        // Use transaction to decrement quantity safely
        const medRef = doc(db, 'medications', medDoc.id);
        await runTransaction(db, async (transaction) => {
          const medSnapshot = await transaction.get(medRef);
          const currentQty = (medSnapshot.data()?.qty) || 0;
          const newQty = currentQty - Number(form.quantity);
          if (newQty < 0) throw new Error('Insufficient stock during transaction');
          transaction.update(medRef, { qty: newQty });
        });
      }
      setIsSubmitted(true);
      setSubmittedId(ref.id);
      setMessage('Request submitted. You can edit it if needed.');

      // Create an initial notification linked to this request (so we can update it later)
      try {
        const notificationData = {
          title: `Health Request: ${payload.itemName}`,
          message: `${payload.requesterName} requested ${payload.itemName}${payload.isCountable && payload.quantity ? ` x${payload.quantity}` : ''} - Reason: ${payload.reason}`,
          type: 'health_request',
          read: false,
          createdAt: new Date().toISOString(),
          recipientRoles: ['health_council', 'admin'],
          category: 'Health',
          requestId: ref.id
        };
        await addDoc(collection(db, 'notifications'), notificationData);
      } catch (err) {
        console.warn('Notification creation failed', err);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setMessage('Failed to submit. Try again.');
    }
  };

  const handleUpdate = async () => {
    if (!submittedId) return;
    try {
  // Read existing request to compute quantity delta
  const reqRef = doc(db, 'health_requests', submittedId);
  const reqSnap = await getDoc(reqRef);
  const existingReq = reqSnap.exists() ? reqSnap.data() : null;

      const updateData = {
        requesterName: form.requesterName,
        requesterEmail: form.requesterEmail,
        reason: form.reason,
        itemName: form.itemName,
        isCountable: !!form.isCountable,
        quantity: form.isCountable ? Number(form.quantity) : null,
        dateRequested: form.dateRequested,
        updatedAt: new Date().toISOString()
      };

      // Check availability before updating if quantity is being increased
      if (updateData.isCountable && updateData.quantity) {
        const medDoc = await findMedicationByName(updateData.itemName);
        if (medDoc) {
          const medData = medDoc.data();
          const currentStock = medData.qty || 0;
          const oldQty = existingReq ? (existingReq.quantity || 0) : 0;
          const newQtyRequested = updateData.quantity;
          const delta = newQtyRequested - oldQty; // positive means requesting more
          
          // If user is requesting more medicine than before, check if enough stock available
          if (delta > 0 && currentStock < delta) {
            setMessage(`Cannot update: Only ${currentStock} ${updateData.itemName} available. You need ${delta} more to increase from ${oldQty} to ${newQtyRequested}.`);
            return;
          }
        } else {
          setMessage(`Medicine "${updateData.itemName}" not found in inventory.`);
          return;
        }
      }

      await updateDoc(doc(db, 'health_requests', submittedId), updateData);
      // Adjust medication stock if quantity changed and item is countable
      try {
        const medDoc = await findMedicationByName(updateData.itemName);
        if (medDoc && updateData.isCountable) {
          const medData = medDoc.data();
          const oldQty = existingReq ? (existingReq.quantity || 0) : 0;
          const newQtyRequested = updateData.quantity || 0;
          const delta = newQtyRequested - oldQty; // positive => user requested more (decrement med), negative => user reduced request (increment med)
          const medRef = doc(db, 'medications', medDoc.id);
          await runTransaction(db, async (transaction) => {
            const medSnapshot = await transaction.get(medRef);
            const currentQty = (medSnapshot.data()?.qty) || 0;
            const newQty = currentQty - delta;
            transaction.update(medRef, { qty: newQty });
          });
        }
      } catch (err) {
        console.warn('Failed adjusting medication stock after update', err);
      }
      setMessage('Submission updated.');

      // Update related notification(s) instead of creating a new one
      try {
        const q = query(collection(db, 'notifications'), where('requestId', '==', submittedId));
        const snap = await getDocs(q);
        for (const nd of snap.docs) {
          const nRef = doc(db, 'notifications', nd.id);
          const newNotification = {
            title: `Health Request Updated: ${updateData.itemName}`,
            message: `${updateData.requesterName} updated request for ${updateData.itemName}${updateData.isCountable && updateData.quantity ? ` x${updateData.quantity}` : ''} - Reason: ${updateData.reason}`,
            updatedAt: new Date().toISOString(),
            read: false
          };
          await updateDoc(nRef, newNotification);
        }
      } catch (err) {
        console.warn('Failed updating linked notifications', err);
      }
    } catch (error) {
      console.error('Error updating request:', error);
      setMessage('Failed to update.');
    }
  };

  const handleNewRequest = () => {
    // Clear form and reset submission state to allow new request
    setForm({
      requesterName: currentUser?.displayName || '',
      requesterEmail: currentUser?.email || '',
      role: userRole || '',
      reason: '',
      itemName: '',
      isCountable: true,
      quantity: '',
      dateRequested: ''
    });
    setIsSubmitted(false);
    setSubmittedId(null);
    setMessage('Form cleared. You can now submit a new request.');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 mt-6">
      <h4 className="text-xl font-bold text-gray-800 mb-4"> Medicine  Form</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={form.requesterName} onChange={e => handleChange('requesterName', e.target.value)} placeholder="Requester Name" className="border p-3 rounded-lg" />
        <input value={form.requesterEmail} onChange={e => handleChange('requesterEmail', e.target.value)} placeholder="Email" className="border p-3 rounded-lg" />
        <input value={form.reason} onChange={e => handleChange('reason', e.target.value)} placeholder="Reason for request" className="border p-3 rounded-lg col-span-1 sm:col-span-2" />
  <input value={form.itemName} onChange={e => handleChange('itemName', e.target.value)} onBlur={checkAndAutoSubmit} placeholder="Item / Medicine Name" className="border p-3 rounded-lg" />

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2"><input type="radio" checked={form.isCountable} onChange={() => handleChange('isCountable', true)} /> Countable</label>
          <label className="flex items-center gap-2"><input type="radio" checked={!form.isCountable} onChange={() => handleChange('isCountable', false)} /> Non-countable</label>
        </div>

        {form.isCountable ? (
          <input value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} type="number" placeholder="Quantity (e.g., 1, 2)" className="border p-3 rounded-lg" />
        ) : (
          <div className="text-sm text-gray-600 p-3">Non-countable items: just provide the name above (no quantity required)</div>
        )}

        <input value={form.dateRequested} onChange={e => handleChange('dateRequested', e.target.value)} type="date" className="border p-3 rounded-lg" />
      </div>

      <div className="flex items-center gap-3 mt-4">
        {submittedId ? (
          <>
            <button onClick={handleUpdate} className="bg-green-600 text-white px-4 py-2 rounded-lg">Save Changes</button>
            <button onClick={handleNewRequest} className="bg-gray-600 text-white px-4 py-2 rounded-lg">New Request</button>
          </>
        ) : (
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Submit Request</button>
        )}
        <div className="text-sm text-gray-600">{message}</div>
      </div>
    </div>
  );
};




export default function App() {
  const { campusName } = useParams(); // Get campus name from URL
  const [assets, setAssets] = useState([]); // Will be loaded from Firebase
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState({ view: 'dashboard', context: null });
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // State for Sidebar Filters
  const [filters, setFilters] = useState({
    categories: [], // e.g., ['IT', 'Health']
    statuses: []    // e.g., ['Low Stock', 'Expired']
  });

  // State for Gemini Feature
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState({ assetName: '', text: '', status: '' });
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showLaptopForm, setShowLaptopForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [medicineUsage, setMedicineUsage] = useState([]);
  const [showActiveUsers, setShowActiveUsers] = useState(false);

  // Get current user and their role
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setCurrentUser(user);
        // Get user role from custom claims or database
        try {
          // Try to get role from custom claims first
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

  // Load data from Firebase - combine all collections
  useEffect(() => {
    const unsubscribeFunctions = [];
    let allAssets = [...initialAssets]; // Start with initialAssets
    let completedCollections = 0;
    const totalCollections = 3;

    const checkAllLoaded = () => {
      completedCollections++;
      if (completedCollections === totalCollections) {
        setAssets(allAssets);
        setLoading(false);
      }
    };

    // Helper function to determine status based on quantity and expiry
    const determineStatus = (qty, expiry) => {
      if (qty <= 0) return 'Out of Stock';
      if (qty <= 10) return 'Low Stock';
      if (expiry && expiry !== '-') {
        const expiryDate = new Date(expiry);
        const today = new Date();
        if (expiryDate < today) return 'Expired';
      }
      return 'In Stock';
    };

    // Load laptops from ItDashboard
    const unsubscribeLaptops = onSnapshot(collection(db, 'laptops'), (snapshot) => {
      const laptops = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unnamed Laptop',
          category: 'IT',
          qty: 1, // Laptops are typically individual items
          expiry: '-',
          status: data.status === 'in-stock' ? 'In Stock' : 
                  data.status === 'damaged' ? 'Damaged' : 
                  data.status === 'out-of-stock' ? 'Out of Stock' : 'In Stock',
          assigned: data.owner || '-',
          value: 1000 // Default value for laptops
        };
      });
      
      // Remove previous laptops and add new ones
      allAssets = allAssets.filter(asset => asset.category !== 'IT');
      allAssets = [...allAssets, ...laptops];
      checkAllLoaded();
    }, (error) => {
      console.error("Error loading laptops:", error);
      checkAllLoaded();
    });

    // Load medications from Health
    const unsubscribeMedications = onSnapshot(collection(db, 'medications'), (snapshot) => {
      const medications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unnamed Medication',
          category: 'Health',
          qty: data.qty || 0,
          expiry: data.expiry || '-',
          status: determineStatus(data.qty, data.expiry),
          assigned: 'Medical Department',
          value: 50 // Default value for medications
        };
      });
      
      // Remove previous medications and add new ones
      allAssets = allAssets.filter(asset => asset.category !== 'Health');
      allAssets = [...allAssets, ...medications];
      checkAllLoaded();
    }, (error) => {
      console.error("Error loading medications:", error);
      checkAllLoaded();
    });

    // Load food items
    const unsubscribeFoodItems = onSnapshot(collection(db, 'foodItems'), (snapshot) => {
      const foodItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unnamed Food Item',
          category: 'Food',
          qty: data.quantity || 0,
          expiry: data.expiryDate || '-',
          status: determineStatus(data.quantity, data.expiryDate),
          assigned: 'Kitchen',
          value: 25 // Default value for food items
        };
      });
      
      // Remove previous food items and add new ones
      allAssets = allAssets.filter(asset => asset.category !== 'Food');
      allAssets = [...allAssets, ...foodItems];
      checkAllLoaded();
    }, (error) => {
      console.error("Error loading food items:", error);
      checkAllLoaded();
    });

    unsubscribeFunctions.push(unsubscribeLaptops, unsubscribeMedications, unsubscribeFoodItems);

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Load medicine usage data from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'medicineUsage'), (snapshot) => {
      const usageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by timestamp, newest first
      usageData.sort((a, b) => {
        const timeA = a.timestamp?.toDate() || new Date(0);
        const timeB = b.timestamp?.toDate() || new Date(0);
        return timeB - timeA;
      });
      
      setMedicineUsage(usageData);
    }, (error) => {
      console.error("Error loading medicine usage:", error);
    });

    return () => unsubscribe();
  }, []);

  // Filter Handler
  const handleFilterChange = (type, newValues) => {
    setFilters(prev => ({ ...prev, [type]: newValues }));
  };

  const handleClearFilters = () => {
    setFilters({ categories: [], statuses: [] });
  };

  // ⭐️ Memoized Filtering Logic
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const categoryMatch = filters.categories.length === 0 || filters.categories.includes(asset.category);
      const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(asset.status);
      return categoryMatch && statusMatch;
    });
  }, [assets, filters.categories, filters.statuses]);

  // ⭐️ All categories - combines static CATEGORIES with any new ones from Firebase data
  const allCategories = useMemo(() => {
    const firebaseCategories = [...new Set(assets.map(asset => asset.category))];
    const combinedCategories = [...new Set([...CATEGORIES, ...firebaseCategories])];
    return combinedCategories.sort();
  }, [assets]);


  // Placeholder component for CampusAssetsPage
  const CampusAssetsPage = ({ campusName }) => (
    <div className="p-8">
      {/* Removed redundant Back button: it is now handled in the main component header */}
      <h2 className="text-3xl font-bold">Assets for {campusName}</h2>
      <p className="mt-4 p-4 bg-yellow-100 rounded">Asset list and details for this specific campus would load here.</p>
    </div>
  );





  // Calculate dynamic dashboard stats based on FILTERED assets
  const dashboardStats = useMemo(() => {
    let totalAssetCount = 0;
    let outOfStockCount = 0;
    let lowStockAlerts = 0;
    let expiredDamagedCount = 0;

    filteredAssets.forEach(asset => {
      // Count total number of assets (regardless of status)
      totalAssetCount += 1;

      if (asset.status === 'Out of Stock' || asset.qty === 0) {
        outOfStockCount += 1;
      }

      if (asset.status === 'Low Stock') {
        lowStockAlerts += 1;
      }

      if (asset.status === 'Expired' || asset.status === 'Damaged') {
        expiredDamagedCount += 1;
      }
    });

    return [
      { title: 'Total Assets', value: totalAssetCount.toLocaleString(), color: 'text-green-600' },
      { title: 'Out of Stock', value: outOfStockCount.toLocaleString(), color: 'text-blue-600' },
      { title: 'Low Stock Alerts', value: lowStockAlerts.toLocaleString(), color: 'text-yellow-600' },
      { title: 'Damaged / Expired', value: expiredDamagedCount.toLocaleString(), color: 'text-red-600' },
    ];
  }, [filteredAssets]);


  const handleBackToDashboard = () => {
    setActiveView({ view: 'dashboard', context: null });
  };

  if (loading) {
    return (
      <div className="bg-gray-100 h-screen font-sans text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 h-screen font-sans text-gray-900 overflow-hidden">

      <Navbar userRole={userRole} />

      <div className="flex flex-col md:flex-row h-full">
        {/* Pass filter state and handlers to Sidebar */}
        <Sidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          categories={allCategories}
        />
        <main className="flex-1 overflow-y-auto max-h-full min-w-0">

          <div className="p-4 pt-6 sm:p-6 md:p-8">

            {/* ⭐️ UPDATED: Conditional Back Button/Icon next to Title */}
            <div className="flex items-center mb-6 border-b pb-2">
              {activeView.view !== 'dashboard' && (
                <button
                  onClick={handleBackToDashboard}
                  className="flex items-center text-gray-500 hover:text-blue-600 mr-3 p-1 rounded-full transition duration-150 active:scale-95"
                  aria-label="Back to Dashboard"
                >
                  {/* Left Arrow SVG Icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7 7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <h1 className="text-3xl font-extrabold text-gray-900 flex-grow">
                {campusName ? decodeURIComponent(campusName) : "Campus"} Dashboard
              </h1>
            </div>

            {activeView.view === 'dashboard' ? (
              <div className="pt-2">

                {/* 1. Stats Cards Row (Pass filteredAssets-based stats) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {dashboardStats.map(stat => (
                    <StatsCard
                      key={stat.title}
                      title={stat.title}
                      value={stat.value}
                      color={stat.color}
                    />
                  ))}
                </div>

                {/* 2. Charts and Alerts Row (Pass filteredAssets for alerts but full assets for chart) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <CategoryDistributionChart 
                    assets={assets} 
                    filters={filters}
                    onFilterChange={handleFilterChange}
                  />
                  <UrgentAlertsList
                    assets={filteredAssets}
                  />
                </div>

                <div className="flex items-center justify-end gap-4 mb-4">
                  <button onClick={() => setShowMedicineModal(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">Medicin form</button>
                  <button onClick={() => setShowUsageModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Medicine Usage Instructions</button>
                  <button onClick={() => setShowLaptopForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Submit Laptop</button>
                  <button onClick={() => setShowReturnForm(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Return Laptop</button>
                </div>

                {/* 3. Request Form (Health / Item requests) - collapsible */}
                {showRequestForm && <RequestForm currentUser={currentUser} userRole={userRole} />}

                {/* Laptop Submission Form Modal */}
                {showLaptopForm && (
                  <LaptopSubmissionForm 
                    onClose={() => setShowLaptopForm(false)}
                    currentUser={currentUser}
                    onSubmit={(formData) => {
                      console.log('Laptop submitted:', formData);
                      // Additional handling if needed
                    }}
                  />
                )}

                {/* Laptop Return Form Modal */}
                {showReturnForm && (
                  <LaptopReturnForm 
                    onClose={() => setShowReturnForm(false)}
                    onReturn={(formData) => {
                      console.log('Laptop returned:', formData);
                      // Additional handling if needed
                    }}
                  />
                )}

                {/* Medicine Form Modal */}
                {showMedicineModal && (
                  <MedicineFormModal 
                    onClose={() => setShowMedicineModal(false)}
                    currentUser={currentUser}
                    userRole={userRole}
                  />
                )}

                {/* Medicine Usage Instructions Modal */}
                {showUsageModal && (
                  <MedicineUsageModal 
                    onClose={() => setShowUsageModal(false)}
                  />
                )}

                {/* Active Users Admin Modal */}
                {showActiveUsers && userRole === 'admin' && (
                  <ActiveUsersAdmin 
                    onClose={() => setShowActiveUsers(false)}
                    currentUser={currentUser}
                  />
                )}

                {/* 4. Assets Table (Pass filteredAssets) */}
                <div className="w-full">
                  <AssetsTable assets={filteredAssets} />
                </div>

                {/* Recommendation Modal */}
                <RecommendationModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  recommendation={recommendation}
                />

              </div>
            ) : (
              <CampusAssetsPage
                campusName={activeView.context.campusName || "Selected Campus"}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
















