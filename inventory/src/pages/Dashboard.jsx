import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

import { logOut } from "../firebase";
import { Warehouse, Settings, LogOut, ChevronDown, User } from 'lucide-react';
import { onAuthChange } from "../firebase"; 





const campuses = [
  { name: "Dantewada", region: "Chhattisgarh", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwA_D-3McRQVCqgtsbToJflvTGOY7pv8Wob0IDnx6lGsvYMQD8_fJz6R_aipzeTKg_u2c&usqp=CAU" },
  { name: "Dharamshala", region: "Himachal Pradesh", imageUrl: "https://lh3.googleusercontent.com/gps-cs-s/AC9h4noEtp5iVAPhV4zwBZEdh2EE-85ZVj9L8eXxzzZ1d-4jBdexQ6xWPoAHbcrS7Ma-2nuJUKBayLo9kvUx4Y9uKgN52qsm8gZVtozGiIbRXSJrZWo3uMXcW8GK3m2piqs3q6_PSgmI=s680-w680-h510-rw" },
  { name: "Himachal", region: "Himachal Pradesh", imageUrl: "https://www.navgurukul.org/static/media/campus%20photo.160eff25.jpg" },
  { name: "Jashpur", region: "Chhattisgarh", imageUrl: "https://www.navgurukul.org/static/media/image1.8b36aac1.svg" },
  { name: "Kishanganj", region: "Bihar", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2OldNcGfoR2jGNaZanrMDS8NdcXXmtupqmquN69T3Pwdyp_6DuOUseYSsQhVn_V42flE&usqp=CAU" },
  { name: "Pune", region: "Maharashtra", imageUrl: "https://lh3.googleusercontent.com/gps-cs-s/AC9h4nq5rJf293eOaMT4c1vUXI6ayKjhO7Zn0XNhs08Whf1GcoyHTkIC-Q_m6qw2HJFinr7BDeUpuzZnyqGipCrTdasITZ2YoTsoksSp2HK6pvfFKr1CWgSLRf18W7D2g9VXSmbOXGa0lw=s680-w680-h510-rw" },
  { name: "Raigarh", region: "Chhattisgarh", imageUrl: "https://www.navgurukul.org/static/media/campus%20photo.160eff25.jpg" },
  { name: "Sarjapur", region: "Karnataka", imageUrl: "https://content.jdmagicbox.com/v2/comp/bangalore/w8/080pxx80.xx80.181203163638.t3w8/catalogue/navgurukul-bangalore-campus-huskur-bangalore-computer-training-insitutes-for-software-diploma-tqjmmkp00i.jpg" },
  { name: "Udaipur", region: "Rajasthan", imageUrl: "https://lh3.googleusercontent.com/gps-cs-s/AC9h4npRn5v_3dPUDWq_OIfu2i98fQhXYfxAWvcLWAc6_PwcApawKb_2uXZ-NHN70yuMlp4C7Z7egnKSNLICfd0nA00e3Bjw3GEnezakiDFAX7sE4Jz6iJPZR_M-yAkv5Wqiog66-LgG=s680-w680-h510-rw" },
];


const CampusCard = ({ name, region, imageUrl }) => (
  <div className="campus-card bg-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl overflow-hidden cursor-pointer border border-gray-200 group">
    <div 
      className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" 
      style={{ backgroundImage: `url('${imageUrl}')` }}
      role="img"
      aria-label={`${name} Campus Image`}
      onError={(e) => { e.target.style.backgroundImage = 'url(https://placehold.co/600x400/0d9488/ffffff?text=Image+not+available)' }}
    ></div>
    <div className="p-4">
      <h2 className="text-xl font-extrabold text-teal-800 transition-colors group-hover:text-teal-600">{name}</h2>
      <p className="text-sm text-gray-500 mt-1">{region}</p>
    </div>
    <div className="p-4 pt-0 text-right">
        <button className="text-sm font-bold text-teal-600 hover:text-teal-800 transition-colors bg-teal-50/50 px-3 py-1 rounded-lg">
            View Details &rarr;
        </button>
    </div>
  </div>
);

// Component for a Navigation Item with optional Dropdown
const NavItem = ({ title, icon: Icon, dropdownItems, setCurrentUser }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (itemTitle) => {
    console.log(`Maps to: ${itemTitle}`);
  };

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) setCurrentUser(user);
      else setCurrentUser(null);
    });
    return () => unsubscribe();
  }, [setCurrentUser]);

  return (
    <div className="relative">
      {/* 🔹 Button area */}
      <div
        className={`flex items-center p-3 rounded-xl transition-colors duration-200 cursor-pointer text-sm font-semibold 
        ${dropdownItems ? 'hover:bg-teal-700' : 'hover:bg-teal-800 bg-teal-800'}`}
        onClick={() => setIsOpen((prev) => !prev)} // ✅ Click toggles dropdown
      >
        <Icon className="w-5 h-5 mr-2" />
        {title}
        {dropdownItems && (
          <ChevronDown
            className={`w-4 h-4 ml-1 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        )}
      </div>

      {/* 🔹 Dropdown Menu */}
      {dropdownItems && (
        <ul
          className={`absolute z-20 top-full left-0 mt-2 bg-white text-gray-800 py-2 rounded-xl shadow-2xl min-w-[180px] 
          transition-all duration-300 origin-top 
          ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}
          onMouseEnter={() => setIsOpen(true)}   // ✅ keeps dropdown open while hovering
          onMouseLeave={() => setIsOpen(false)}  // ✅ closes only when fully left
        >
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


const App = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) setCurrentUser(user);
      else setCurrentUser(null);
    });
    return () => unsubscribe();
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* Header/Navbar (Updated with Teal/Cyan colors) */}
      <header className="sticky top-0 z-50 shadow-lg bg-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          
          {/* Logo (Image replaced 'Navgurukul Inventory' text) */}
          <div className="flex items-center space-x-8">
            <img 
              src="https://medha.org.in/user-content/media-versions/1400w_x2400h__q_90_c_Navgurukul.jpg" 
              alt="Navgurukul Logo" 
              className="h-8 md:h-10 w-auto object-contain bg-white rounded-full p-1 shadow-md" 
              // Fallback image in case the main logo fails to load
              onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/100x40/ffffff/0d9488?text=NG+Logo" }}
            />
            
            <nav className="hidden md:flex space-x-1">
              {navStructure.map((item, index) => (
<NavItem
  key={index}
  title={item.title}
  icon={item.icon}
  dropdownItems={item.dropdownItems}
  setCurrentUser={setCurrentUser} // ✅ pass here
/>
              ))}
            </nav>
          </div>

          {/* User and Logout */}
          <div className="flex items-center space-x-4">
<span className="hidden lg:inline text-sm font-medium opacity-90">
  Hello, {currentUser ? currentUser.displayName || currentUser.email : "Guest"}
</span>
           <button 
  onClick={async () => {
    try {
      await logOut(); // Firebase logout
      console.log("User logged out successfully");
      navigate("/login"); // ✅ React Router redirect
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }}


  className="flex items-center bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full text-sm font-semibold transition duration-300 shadow-md hover:shadow-lg transform active:scale-95 ring-2 ring-red-400/50"
>
  <LogOut className="w-4 h-4 mr-2" />
  Logout
</button>


          </div>
        </div>
        
        {/* Mobile Navigation Placeholder (Updated color) */}
        <nav className="md:hidden bg-teal-700 text-center py-2 text-sm text-teal-200">
          <p className="opacity-70">Tap Logo for Menu</p>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Heading Section (Enhanced styling for prominence) */}
        <div className="mb-10 p-6 bg-white rounded-2xl shadow-xl border-t-4 border-teal-500">
            <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome to the Campus View
            </h1>
            <p className="text-gray-500 mt-1">Discover What Each Campus Holds – From Tech to Taste!</p>
        </div>


        {/* Campus Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {campuses.map((campus, index) => (
            <CampusCard key={index} {...campus} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 bg-gray-800 text-white text-center text-sm shadow-inner">
        <div className="max-w-7xl mx-auto">
          &copy; {new Date().getFullYear()} Inventory Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default App;
