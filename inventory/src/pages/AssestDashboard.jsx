import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Warehouse, Settings, LogOut, ChevronDown } from 'lucide-react';

// ==============================================================================
// ⚠️ MOCK IMPORTS
// ==============================================================================
// Mock imports for React Router functions used by Navbar
const useNavigate = () => (path) => console.log(`MOCK: Navigating to: ${path}`);
const Link = (props) => <a href={props.to} {...props} onClick={(e) => { e.preventDefault(); console.log(`MOCK: Link clicked: ${props.to}`); }}>{props.children}</a>;
// Mock imports for Firebase functions used by Navbar
const logOut = async () => console.log("MOCK: User logged out");
const onAuthChange = (callback) => { 
  // MOCK: This effect simulates setting a user on load
  const user = { uid: 'user123', displayName: 'Admin User', email: 'admin@example.com' };
  callback(user);
  return () => console.log("MOCK: Auth listener removed");
};
// ==============================================================================

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


// ----------------------------------------------------------------------------------
// 1. NavItem Component: Dropdown Logic with Outside Click
// ----------------------------------------------------------------------------------

const NavItem = ({ title, icon: Icon, dropdownItems, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref to detect clicks outside

  // useEffect for outside click detection
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on cleanup
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleNavClick = (itemTitle) => {
    console.log(`Maps to: ${itemTitle}`);
    setIsOpen(false); // Close dropdown after internal click
  };

  return (
    <div className="relative" ref={dropdownRef}> {/* Attach ref here */}
      {/* 🔹 Button area */}
      <div
        className={`flex items-center p-3 rounded-xl transition-colors duration-200 cursor-pointer text-sm font-semibold 
        ${dropdownItems ? 'hover:bg-teal-700' : 'hover:bg-teal-800 bg-teal-800'}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Icon className="w-5 h-5 mr-1" />
        {title}
        {dropdownItems && (
          <ChevronDown
            className={`w-4 h-4 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        )}
      </div>

      {/* 🔹 Dropdown Menu */}
      {dropdownItems && (
        <ul className={`absolute z-30 top-full left-0 mt-3 bg-white text-gray-600 py-2 rounded-xl shadow-2xl min-w-[180px] transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}>
          {dropdownItems.map((item, index) => (
            <li
              key={index}
              onClick={() => handleNavClick(item)}
              className="px-4 py-2 hover:bg-teal-50 hover:text-teal-700 transition-colors duration-150 text-sm font-medium cursor-pointer"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


// ----------------------------------------------------------------------------------
// 2. Navbar Component
// ----------------------------------------------------------------------------------

const Navbar = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) setCurrentUser(user);
      else setCurrentUser(null);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const navStructure = [
    {
      title: "Assets",
      icon: Warehouse,
      dropdownItems: ["IT Equipment", "Food Inventory", "Health and Hygiene"]
    },
    {
      title: "Settings",
      icon: Settings,
      dropdownItems: [
        "System Settings",
        "User Management",
        "Change Password"
      ]
    },
  ];

  const handleLogout = async () => {
    try {
      await logOut();
      console.log("User logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };


  return (
    <header className="sticky top-0 z-50 shadow-lg bg-teal-600 text-white">
      <div className="max-w-14xl mx-auto px-2 sm:px-6 lg:px-8 py-2 flex justify-between items-center">
        {/* Logo and Navigation Links */}
        <div className="flex items-center pl-4">
          <img
            src="https://beamish-paletas-139a19.netlify.app/logo.png"
            alt="Navgurukul Logo"
            className="h-10 md:h-12 w-auto object-contain mr-6"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x40/ffffff/0d9488?text=NG+Logo" }}
          />

          <nav className="hidden md:flex space-x-3">
            {navStructure.map((item, index) => (
              <NavItem
                key={index}
                title={item.title}
                icon={item.icon}
                dropdownItems={item.dropdownItems}
                currentUser={currentUser}
              />
            ))}
          </nav>
        </div>

        {/* User Info and Logout Button */}
        <div className="flex items-center space-x-10">
          <span className="hidden lg:inline text-sm font-medium opacity-90">
            Hello, {currentUser ? currentUser.displayName || currentUser.email : "Guest"}
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full text-sm font-semibold transition duration-300 shadow-md hover:shadow-lg transform active:scale-95 ring-2 ring-red-400/50"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Navigation Placeholder */}
      <nav className="md:hidden bg-teal-700 text-center py-2 text-sm text-teal-200">
        <p className="opacity-70">Tap Logo for Menu</p>
      </nav>
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


// ----------------------------------------------------------------------------------
// 3. Sidebar Component 
// ----------------------------------------------------------------------------------

const Sidebar = ({ filters, onFilterChange, onClearFilters }) => {
    
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
            {CATEGORIES.map(category => (
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

// ----------------------------------------------------------------------------------
// 4. CategoryDistributionChart (Added Animation)
// ----------------------------------------------------------------------------------

const CategoryDistributionChart = ({ assets }) => {
    // Simple logic to calculate category quantities for visualization
    const categoryData = useMemo(() => {
        const counts = assets.reduce((acc, asset) => {
            if (asset.status === 'In Stock' || asset.status === 'Low Stock') {
                acc[asset.category] = (acc[asset.category] || 0) + asset.qty;
            }
            return acc;
        }, {});

        const totalQty = Object.values(counts).reduce((sum, qty) => sum + qty, 0);
        let currentAngle = 0;

        // Calculate segment percentage and start/end angles for conic gradient
        return Object.keys(counts).map(category => {
            const qty = counts[category];
            const percent = totalQty > 0 ? ((qty / totalQty) * 100) : 0;
            const startAngle = currentAngle;
            currentAngle += (percent * 3.6); // 360 / 100 * percent
            
            return {
                name: category,
                qty: qty,
                color: ChartColors[category] || '#9ca3af',
                percent: percent.toFixed(0),
                startAngle: startAngle,
                endAngle: currentAngle
            };
        }).sort((a, b) => b.qty - a.qty);
    }, [assets]);

    // Constructing the dynamic conic gradient string
    const gradientString = categoryData.map(item => `${item.color} ${item.startAngle}deg ${item.endAngle}deg`).join(', ');

    // Tailwind CSS animation for subtle rotation
    const rotationStyle = {
        animation: 'spin-subtle 20s linear infinite',
        backgroundImage: `conic-gradient(${gradientString})`,
    };

    // Custom spin keyframes (must be defined in a <style> tag or globally, adding here for completeness)
    const customStyles = `
        @keyframes spin-subtle {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    
    return (
        <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100 w-full">
            <style>{customStyles}</style>
            <h4 className="text-xl font-bold text-gray-800 mb-4">Category-wise Stock Distribution</h4>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
                <div className="w-32 h-32 flex items-center justify-center relative flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-gray-200 border-4 border-gray-100 overflow-hidden relative shadow-inner">
                        <div 
                            style={rotationStyle} 
                            className="w-full h-full transition-transform duration-500"
                        >
                            {/* Inner circle to make it a Doughnut chart */}
                            <div className="absolute inset-0 m-6 bg-white rounded-full"></div> 
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full sm:w-auto space-y-2">
                    {categoryData.slice(0, 5).map(item => (
                        <div key={item.name} className="flex items-center text-base text-gray-700 justify-between">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color }}></div>
                                <span className="font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold text-gray-900">{item.percent}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- UrgentAlertsList Component ---
const UrgentAlertsList = ({ assets, generateRecommendation, isGenerating }) => {
    const urgentItems = assets.filter(a => isAssetUrgent(a.status));
    
    const lowStockAlerts = urgentItems.filter(a => a.status === 'Low Stock');
    const disposalAlerts = urgentItems.filter(a => a.status === 'Expired' || a.status === 'Damaged');

    const assetToAnalyze = disposalAlerts.length > 0 ? disposalAlerts[0] : null;

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
                                {lowStockAlerts.slice(0, 3).map(item => (
                                    <li key={item.id} className="break-words">
                                        {/* REMOVED REDUNDANT CUSTOM BULLET SPAN */}
                                        {item.name} (Qty: {item.qty})
                                    </li>
                                ))}
                                {lowStockAlerts.length > 3 && (
                                     <li className="font-medium text-gray-700">and {lowStockAlerts.length - 3} more items...</li>
                                )}
                            </ul>
                        </div>
                    )}

                    {disposalAlerts.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-300">
                            <p className="font-semibold text-gray-800 mb-2">Expired/Damaged ({disposalAlerts.length} item)</p>
                            <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                                {disposalAlerts.slice(0, 3).map(item => (
                                    <li key={item.id} className="break-words">
                                        {/* REMOVED REDUNDANT CUSTOM BULLET SPAN */}
                                        {item.name} ({item.status})
                                    </li>
                                ))}
                                {disposalAlerts.length > 3 && (
                                     <li className="font-medium text-gray-700">and {disposalAlerts.length - 3} more items...</li>
                                )}
                            </ul>
                        </div>
                    )}
                     
                     <div className="text-right pt-4 flex flex-col sm:flex-row justify-end items-end gap-2">
                        {assetToAnalyze && (
                            <button 
                                onClick={() => generateRecommendation(assetToAnalyze)}
                                disabled={isGenerating}
                                className={`text-sm font-bold py-2 px-3 rounded-lg transition-colors duration-200 shadow-md flex items-center justify-center ${isGenerating ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate Disposal Plan ✨
                                    </>
                                )}
                            </button>
                        )}
                        <button className="text-blue-600 text-sm font-medium hover:underline py-2">View All Alerts</button>
                    </div>
                </div>
            )}
        </div>
    );
};


// ----------------------------------------------------------------------------------
// 5. Main App Component (Updated for Filtering and Navigation Header)
// ----------------------------------------------------------------------------------

export default function App() {
  const [assets] = useState(initialAssets); // Assets remain constant
  const [activeView, setActiveView] = useState({ view: 'dashboard', context: null });
  
  // State for Sidebar Filters
  const [filters, setFilters] = useState({
      categories: [], // e.g., ['IT', 'Health']
      statuses: []    // e.g., ['Low Stock', 'Expired']
  });

  // State for Gemini Feature
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState({ assetName: '', text: '', status: '' });
  const [isGenerating, setIsGenerating] = useState(false);

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

  
  // Placeholder component for CampusAssetsPage
  const CampusAssetsPage = ({ campusName }) => (
    <div className="p-8">
        {/* Removed redundant Back button: it is now handled in the main component header */}
        <h2 className="text-3xl font-bold">Assets for {campusName}</h2>
        <p className="mt-4 p-4 bg-yellow-100 rounded">Asset list and details for this specific campus would load here.</p>
    </div>
  );


  // Gemini API Function
  const generateAssetRecommendation = async (asset) => {
    setIsGenerating(true);
    setRecommendation({ assetName: asset.name, text: '', status: asset.status });
    setIsModalOpen(true);

    // Updated prompt to request English response
    const userQuery = `You are an Inventory Management Assistant. For the asset named: ${asset.name} in the category: ${asset.category} which has a status of: ${asset.status} and quantity: ${asset.qty}, generate a concise, two-paragraph recommendation. The first paragraph should summarize the issue and the second paragraph should suggest the next steps, such as 'Scrap and Replace', 'Repair Quote', or 'Immediate Disposal', along with a brief reason. Respond only with the recommendation text in English (simple and professional tone).`;
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=${API_KEY}`;
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
             parts: [{ text: "Act as a professional inventory manager." }]
        },
    };

    try {
        const response = await retryFetch(() => 
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
        );
        
        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || 
                             "Sorry, the recommendation could not be generated. Server error.";

        setRecommendation({
            assetName: asset.name, 
            text: generatedText, 
            status: asset.status 
        });

    } catch (error) {
        console.error("Gemini API call failed:", error);
        setRecommendation({
            assetName: asset.name, 
            text: "The recommendation could not be generated due to a network error. Please check your internet connection.", 
            status: asset.status 
        });
    } finally {
        setIsGenerating(false);
    }
  };


  // Calculate dynamic dashboard stats based on FILTERED assets
  const dashboardStats = useMemo(() => {
    let totalStockQty = 0;
    let outOfStockCount = 0;
    let lowStockAlerts = 0;
    let expiredDamagedQty = 0;

    filteredAssets.forEach(asset => {
      if (asset.status === 'In Stock' || asset.status === 'Low Stock') {
        totalStockQty += asset.qty;
      }
      
      if (asset.status === 'Out of Stock' || asset.qty === 0) {
        outOfStockCount += 1;
      }
      
      if (asset.status === 'Low Stock') {
        lowStockAlerts += 1;
      }

      if (asset.status === 'Expired' || asset.status === 'Damaged') {
        expiredDamagedQty += asset.qty;
      }
    });

    return [
      { title: 'Total Stock Qty', value: totalStockQty.toLocaleString(), color: 'text-green-600' },
      { title: 'Out of Stock', value: outOfStockCount.toLocaleString(), color: 'text-blue-600' }, 
      { title: 'Low Stock Alerts', value: lowStockAlerts.toLocaleString(), color: 'text-yellow-600' }, 
      { title: 'Damaged / Expired Qty', value: expiredDamagedQty.toLocaleString(), color: 'text-red-600' }, 
    ];
  }, [filteredAssets]);


  const handleBackToDashboard = () => {
    setActiveView({ view: 'dashboard', context: null });
  };
  
  return (
    <div className="bg-gray-100 h-screen font-sans text-gray-900 overflow-hidden">
        
        <Navbar />

      <div className="flex flex-col md:flex-row h-full">
        {/* Pass filter state and handlers to Sidebar */}
        <Sidebar 
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                )}
                <h1 className="text-3xl font-extrabold text-gray-900 flex-grow">
                    Kishanganj Dashboard
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
                
                {/* 2. Charts and Alerts Row (Pass filteredAssets) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <CategoryDistributionChart assets={filteredAssets} />
                  <UrgentAlertsList 
                    assets={filteredAssets} 
                    generateRecommendation={generateAssetRecommendation}
                    isGenerating={isGenerating}
                  />
                </div>
                
                {/* 3. Assets Table (Pass filteredAssets) */}
                <div className="w-full">
                   <AssetsTable assets={filteredAssets} />
                </div>
                
                {/* Recommendation Modal */}
                <RecommendationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    recommendation={recommendation}
                    isLoading={isGenerating}
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
