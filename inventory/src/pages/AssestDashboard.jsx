import React, { useState } from 'react';

// --- Helper Data ---
const initialAssets = [
  { id: 1, name: 'MacBook Pro 16"', category: 'IT', qty: 12, expiry: '2028-11-01', status: 'In Stock', assigned: 'John Doe' },
  { id: 2, name: 'Logitech MX Master 3', category: 'IT', qty: 8, expiry: '-', status: 'Low Stock', assigned: 'Jane Smith' },
  { id: 3, name: 'Office Chair', category: 'Furniture', qty: 35, expiry: '-', status: 'In Stock', assigned: '-' },
  { id: 4, name: 'First Aid Kit', category: 'Health', qty: 2, expiry: '2025-06-30', status: 'Expired', assigned: 'Office Manager' },
  { id: 5, name: 'Printer Paper Ream', category: 'Office Supplies', qty: 0, expiry: '-', status: 'Out of Stock', assigned: '-' },
  { id: 6, name: 'Sanitizer Bottle', category: 'Health', qty: 25, expiry: '2026-01-15', status: 'In Stock', assigned: 'Reception' },
  { id: 7, name: 'Whiteboard', category: 'Office Supplies', qty: 3, expiry: '-', status: 'Damaged', assigned: 'Meeting Room A' },
];

const statsData = [
    { title: 'Total Assets', value: '256' },
    { title: 'In Stock', value: '182' },
    { title: 'Low Stock', value: '15' },
    { title: 'Expired', value: '8' },
];

// --- Sub-components ---

const Sidebar = () => (
  <aside className="w-full md:w-64 bg-white p-6 border-r border-gray-200 flex-shrink-0">
    <h3 className="text-xl font-bold text-gray-800 mb-6">Filters</h3>

    <div className="mb-6">
      <strong className="text-sm font-semibold text-gray-600 block mb-3">Category</strong>
      <div className="space-y-2">
        {['IT', 'Food', 'Health', 'Office Supplies', 'Furniture'].map(category => (
          <label key={category} className="flex items-center text-gray-700 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="ml-3">{category}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="mb-6">
      <strong className="text-sm font-semibold text-gray-600 block mb-3">Status</strong>
      <div className="space-y-2">
        {['In Stock', 'Low Stock', 'Out of Stock', 'Damaged', 'Expired'].map(status => (
          <label key={status} className="flex items-center text-gray-700 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="ml-3">{status}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="mb-6">
      <strong className="text-sm font-semibold text-gray-600 block mb-3">Expiry Date Range</strong>
      <div className="flex flex-col gap-2">
        <input type="date" placeholder="From" className="w-full p-2 border border-gray-300 rounded-md text-sm" />
        <input type="date" placeholder="To" className="w-full p-2 border border-gray-300 rounded-md text-sm" />
      </div>
    </div>

    <button className="w-full py-2 px-4 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition-colors duration-200">Clear All Filters</button>
  </aside>
);

const StatsCard = ({ title, value }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-3xl font-bold text-gray-800 mt-1">{value}</div>
  </div>
);

const CategoryChart = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[200px] w-full lg:w-1/3">
    <h4 className="text-lg font-semibold text-gray-800 mt-0">Category Distribution</h4>
    <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
      {/* Placeholder for a chart library like Chart.js or Recharts */}
      <p>Chart would be displayed here.</p>
    </div>
  </div>
);

const AssetsTable = ({ assets = [], onOpenAsset }) => {
    
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
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">All Assets</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {['Asset Name', 'Category', 'Qty', 'Expiry', 'Status', 'Assigned To', 'Actions'].map(header => (
                <th key={header} scope="col" className="px-6 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-10 text-center text-gray-400">No assets found.</td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => onOpenAsset(asset)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenAsset(asset); }}
                >
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{asset.name}</td>
                  <td className="px-6 py-4">{asset.category}</td>
                  <td className="px-6 py-4">{asset.qty}</td>
                  <td className="px-6 py-4">{asset.expiry || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{asset.assigned || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      className="font-medium text-blue-600 hover:underline"
                      onClick={(e) => { e.stopPropagation(); onOpenAsset(asset); }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CampusAssetsPage = ({ campusName, onBack }) => {
  // Dummy data for a specific campus view
  const dummyAssets = [
    { id: 1, name: "Projector", category: "Electronics", qty: 2, expiry: "2026-03-10", status: "In Stock", assigned: "Room 204" },
    { id: 2, name: "Bench", category: "Furniture", qty: 15, expiry: "-", status: "In Stock", assigned: "Hall 1" },
    { id: 3, name: "Computer", category: "IT", qty: 10, expiry: "2025-12-31", status: "Low Stock", assigned: "Lab A" }
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full">
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Dashboard
      </button>

      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        Assets for Campus: <span className="text-blue-600">{campusName}</span>
      </h2>

      {/* Re-using the AssetsTable for this view */}
      <AssetsTable assets={dummyAssets} onOpenAsset={() => { console.log("Drill-down further...")}} />
    </div>
  );
};


// --- Main App Component ---

export default function App() {
  const [assets, setAssets] = useState(initialAssets);
  // State to manage which view is active: 'dashboard' or 'campus'
  const [activeView, setActiveView] = useState({ view: 'dashboard', context: null });

  const handleOpenAsset = (asset) => {
    // This function simulates navigation to a detailed campus/asset page
    console.log("Opening asset:", asset);
    setActiveView({ view: 'campus', context: { campusName: `Campus for ${asset.name}` } });
  };

  const handleBackToDashboard = () => {
    setActiveView({ view: 'dashboard', context: null });
  };
  
  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1">
          {activeView.view === 'dashboard' ? (
             <div className="p-4 sm:p-6 md:p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {statsData.map(stat => <StatsCard key={stat.title} title={stat.title} value={stat.value} />)}
                </div>
                
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* The chart can be added here if needed */}
                  {/* <CategoryChart /> */}
                  <div className="w-full">
                     <AssetsTable assets={assets} onOpenAsset={handleOpenAsset} />
                  </div>
                </div>

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
