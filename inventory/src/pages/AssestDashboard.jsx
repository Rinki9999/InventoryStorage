import React, { useState, useMemo } from 'react';

// Enhanced initial assets with 'value' property and more realistic data
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

// --- Utility Functions and Colors ---

const ChartColors = {
  IT: '#6366f1', // Indigo (Blue/Purple)
  Furniture: '#f97316', // Orange
  Health: '#10b981', // Emerald (Green)
  OfficeSupplies: '#3b82f6', // Blue
  Food: '#ec4899', // Pink
};

const isAssetUrgent = (status) => 
  status === 'Low Stock' || status === 'Expired' || status === 'Damaged';

const API_MODEL = 'gemini-2.5-flash-preview-05-20';
const API_KEY = ""; // Canvas will provide this at runtime

/**
 * Handles API calls with exponential backoff for resilience.
 * @param {function} apiCall The asynchronous function to call.
 * @param {number} maxRetries Maximum number of retries.
 */
const retryFetch = async (apiCall, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await apiCall();
            if (!response.ok) {
                // If response is not 2xx, throw an error to trigger retry or final catch
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            if (i < maxRetries - 1) {
                // Exponential backoff delay
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error("API call failed after multiple retries.");
            }
        }
    }
};

// --- Modal Component for Recommendations ---

const RecommendationModal = ({ isOpen, onClose, recommendation, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all scale-100 p-6 md:p-8">
                <div className="flex justify-between items-start mb-4 border-b pb-3">
                    <h3 className="text-2xl font-bold text-blue-600">
                        {recommendation.assetName} Ka Disposal/Repair Plan
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
                        <p className="mt-4 text-gray-700 font-medium">Gemini se smart recommendation generate ho raha hai...</p>
                    </div>
                ) : (
                    <div className="space-y-4 text-gray-700">
                        <p className="font-semibold text-lg">Status: <span className={`font-bold ${recommendation.status === 'Damaged' ? 'text-orange-500' : 'text-red-500'}`}>{recommendation.status}</span></p>
                        {recommendation.text ? (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
                                {recommendation.text}
                            </div>
                        ) : (
                            <div className="text-center text-red-500 py-4">Recommendation generate karne mein koi dikkat aayi. Kripya phir se koshish karein.</div>
                        )}
                        <p className="text-xs text-right text-gray-400 mt-4">Powered by Google Gemini API</p>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                        Band Karein
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Sidebar Component (No major changes needed) ---

const Sidebar = () => (
  <aside className="w-full md:w-64 bg-white p-6 border-r border-gray-200 flex-shrink-0 shadow-2xl">
    <h3 className="text-2xl font-extrabold text-gray-800 mb-6 border-b pb-2">Filters</h3>

    <div className="mb-6">
      <strong className="text-sm font-bold text-gray-700 block mb-3">Category</strong>
      <div className="space-y-2">
        {['IT', 'Food', 'Health', 'Office Supplies', 'Furniture'].map(category => (
          <label key={category} className="flex items-center text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="ml-3">{category}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="mb-6">
      <strong className="text-sm font-bold text-gray-700 block mb-3">Status</strong>
      <div className="space-y-2">
        {['In Stock', 'Low Stock', 'Out of Stock', 'Damaged', 'Expired'].map(status => (
          <label key={status} className="flex items-center text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="ml-3">{status}</span>
          </label>
        ))}
      </div>
    </div>

    <button className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md">Apply Filters</button>
    <button className="w-full mt-2 py-2 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200">Clear All Filters</button>
  </aside>
);

// Updated StatsCard to match the clean design
const StatsCard = ({ title, value, color }) => (
  <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100"> 
    <div className="text-base font-medium text-gray-500">{title}</div>
    {/* Value size increased for visual impact, color applied */}
    <div className={`text-4xl font-extrabold mt-1 ${color || 'text-gray-800'}`}>{value}</div>
  </div>
);


// AssetsTable: Full Inventory List
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
      <h4 className="text-2xl font-bold text-gray-800 mb-4">Full Inventory List</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-t">
            <tr>
              {/* Columns adjusted to match previous logic */}
              {['Asset Name', 'Category', 'Qty', 'Status', 'Assigned To'].map(header => (
                <th key={header} scope="col" className="px-6 py-3 whitespace-nowrap">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400">Koi Assets Nahi Mile.</td>
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

// Placeholder for Stock Distribution by Category (Doughnut Chart)
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

        return Object.keys(counts).map(category => ({
            name: category,
            qty: counts[category],
            color: ChartColors[category] || '#9ca3af',
            percent: totalQty > 0 ? ((counts[category] / totalQty) * 100).toFixed(0) : 0
        })).sort((a, b) => b.qty - a.qty);
    }, [assets]);
    
    return (
        // Box style: p-5, rounded-xl, shadow-xl
        <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100 w-full">
            <h4 className="text-xl font-bold text-gray-800 mb-4">Category Wise Stock Distribution</h4>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4">
                <div className="w-32 h-32 flex items-center justify-center relative flex-shrink-0">
                    {/* Simplified Conic Gradient for Doughnut Chart visualization */}
                    <div className="w-full h-full rounded-full bg-gray-200 border-4 border-gray-100 overflow-hidden relative shadow-inner">
                        <div style={{
                            backgroundImage: `conic-gradient(
                                ${ChartColors.IT} 0% 40%,
                                ${ChartColors.Furniture} 40% 65%,
                                ${ChartColors.Health} 65% 80%,
                                ${ChartColors.OfficeSupplies} 80% 90%,
                                ${ChartColors.Food} 90% 100%
                            )`,
                            }} 
                             className="w-full h-full transform transition-transform duration-500">
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

// Urgent Alerts List - Updated to match image style
const UrgentAlertsList = ({ assets, generateRecommendation, isGenerating }) => {
    // Filter and group items that are urgent
    const urgentItems = assets.filter(a => isAssetUrgent(a.status));
    
    const lowStockAlerts = urgentItems.filter(a => a.status === 'Low Stock');
    // Group Expired and Damaged items together for the second section, matching the image's content structure
    const disposalAlerts = urgentItems.filter(a => a.status === 'Expired' || a.status === 'Damaged');

    // Pick the first item from disposal alerts for the Gemini feature
    const assetToAnalyze = disposalAlerts.length > 0 ? disposalAlerts[0] : null;

    return (
        // Box style: p-5, rounded-xl, shadow-xl
        <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100 w-full">
            <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center whitespace-nowrap overflow-hidden text-ellipsis">
                {/* Red Cross Icon (matching image) */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Urgent Alerts (Alarm)
            </h4>

            {urgentItems.length === 0 ? (
                <div className="text-gray-500 text-center py-6 border-t border-gray-200 mt-4">Koi Urgent Alert Nahi. Sab Theek Hai!</div>
            ) : (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                    {/* Low Stock Section - Simple styling, text color is grey/black */}
                    {lowStockAlerts.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-300">
                            <p className="font-semibold text-gray-800 mb-2">Low Stock ({lowStockAlerts.length} item)</p>
                            <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                                {lowStockAlerts.slice(0, 3).map(item => (
                                    <li key={item.id} className="break-words">
                                        <span className="text-yellow-700">• </span> {item.name} (Qty: {item.qty})
                                    </li>
                                ))}
                                {lowStockAlerts.length > 3 && (
                                     <li className="font-medium text-gray-700">and {lowStockAlerts.length - 3} item...</li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Expired/Damaged Section - Red box, matching image content */}
                    {disposalAlerts.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-300">
                            <p className="font-semibold text-gray-800 mb-2">Expired/Damaged ({disposalAlerts.length} item)</p>
                            <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                                {disposalAlerts.slice(0, 3).map(item => (
                                    <li key={item.id} className="break-words">
                                        <span className="text-red-700">• </span> {item.name} ({item.status})
                                    </li>
                                ))}
                                {disposalAlerts.length > 3 && (
                                     <li className="font-medium text-gray-700">and {disposalAlerts.length - 3} item...</li>
                                )}
                            </ul>
                        </div>
                    )}
                     
                     <div className="text-right pt-4 flex flex-col sm:flex-row justify-end items-end gap-2">
                        {/* Gemini Feature Button */}
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


// --- Main App Component ---

export default function App() {
  const [assets, setAssets] = useState(initialAssets);
  const [activeView, setActiveView] = useState({ view: 'dashboard', context: null });
  
  // State for Gemini Feature
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState({ assetName: '', text: '', status: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Gemini API Function
  const generateAssetRecommendation = async (asset) => {
    setIsGenerating(true);
    setRecommendation({ assetName: asset.name, text: '', status: asset.status });
    setIsModalOpen(true);

    const userQuery = `You are an Inventory Management Assistant. For the asset named: ${asset.name} in the category: ${asset.category} which has a status of: ${asset.status} and quantity: ${asset.qty}, generate a concise, two-paragraph recommendation. The first paragraph should summarize the issue and the second paragraph should suggest the next steps, such as 'Scrap and Replace', 'Repair Quote', or 'Immediate Disposal', along with a brief reason. Respond only with the recommendation text in Hindi (Latin script, simple and professional tone).`;
    
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
                             "Maaf kijiye, recommendation generate nahi ho paya. Server error.";

        setRecommendation({
            assetName: asset.name, 
            text: generatedText, 
            status: asset.status 
        });

    } catch (error) {
        console.error("Gemini API call failed:", error);
        setRecommendation({
            assetName: asset.name, 
            text: "Network error ke karan recommendation generate nahi ho paya. Kripya apna internet connection jaanch lein.", 
            status: asset.status 
        });
    } finally {
        setIsGenerating(false);
    }
  };


  // Calculate dynamic dashboard stats to match the requested image titles and data type
  const dashboardStats = useMemo(() => {
    let totalStockQty = 0; // Total quantity of usable items (In Stock + Low Stock)
    let outOfStockCount = 0; // Count of unique asset types (rows) that are 'Out of Stock'
    let lowStockAlerts = 0; // Count of unique asset types (rows) marked as 'Low Stock'
    let expiredDamagedQty = 0; // Total quantity of items to be disposed/repaired

    assets.forEach(asset => {
      // 1. Total Stock Qty (Based on current, usable quantity)
      if (asset.status === 'In Stock' || asset.status === 'Low Stock') {
        totalStockQty += asset.qty;
      }
      
      // 2. Out of Stock (Count of unique item types that are completely out)
      if (asset.status === 'Out of Stock' || asset.qty === 0) {
        outOfStockCount += 1;
      }
      
      // 3. Low Stock Alerts (Count of unique item types that are low)
      if (asset.status === 'Low Stock') {
        lowStockAlerts += 1;
      }

      // 4. Damaged / Expired Qty (Total quantity of faulty items)
      if (asset.status === 'Expired' || asset.status === 'Damaged') {
        expiredDamagedQty += asset.qty;
      }
    });

    return [
      // Title and color matched to image
      { title: 'Total Stock Qty', value: totalStockQty.toLocaleString(), color: 'text-green-600' },
      { title: 'Out of Stock', value: outOfStockCount.toLocaleString(), color: 'text-blue-600' }, 
      { title: 'Low Stock Alerts', value: lowStockAlerts.toLocaleString(), color: 'text-yellow-600' }, // Yellow color for low stock
      { title: 'Damaged / Expired Qty', value: expiredDamagedQty.toLocaleString(), color: 'text-red-600' }, 
    ];
  }, [assets]);


  const handleBackToDashboard = () => {
    setActiveView({ view: 'dashboard', context: null });
  };
  
  return (
    // Dashboard Title added for better context
    <div className="bg-gray-100 h-screen font-sans text-gray-900 overflow-hidden">
        <header className="bg-white p-4 shadow-md sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-gray-800">Kishanganj Dashboard</h1>
        </header>
      <div className="flex flex-col md:flex-row h-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto max-h-full min-w-0"> 
          {activeView.view === 'dashboard' ? (
             <div className="p-4 sm:p-6 md:p-8">
                
                {/* 1. Stats Cards Row (4 columns) */}
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
                
                {/* 2. Charts and Alerts Row (Changed to 2-column layout to match image) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <CategoryDistributionChart assets={assets} />
                  {/* StatusBarChart removed */}
                  <UrgentAlertsList 
                    assets={assets} 
                    generateRecommendation={generateAssetRecommendation}
                    isGenerating={isGenerating}
                  />
                </div>
                
                {/* 3. Assets Table */}
                <div className="w-full">
                   <AssetsTable assets={assets} />
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
                campusName={activeView.context.campusName} 
                onBack={handleBackToDashboard}
             />
          )}
        </main>
      </div>
    </div>
  );
}
