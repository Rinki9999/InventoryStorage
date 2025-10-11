import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from "react-router-dom"; 
import { logOut, onAuthChange } from "../firebase"; 
import { User, Camera } from 'lucide-react';
import AOS from "aos";
import "aos/dist/aos.css";


const campuses = [
  { name: "Dantewada", region: "Chhattisgarh", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwA_D-3McRQVCqgtsbToJflvTGOY7pv8Wob0IDnx6lGsvYMQD8_fJz6R_aipzeTKg_u2c&usqp=CAU" },
  { name: "Dharamshala", region: "Himachal Pradesh", imageUrl: "https://lh3.googleusercontent.com/gps-cs-s/AC9h4noEtp5iVAPhV4zwBZEdh2EE-85ZVj9L8eXxzzZ1d-4jBdexQ6xWPoAHbcrS7Ma-2nuJUKBayLo9kvUx4Y9uKgN52qsm8gZVtozGiIbRXSJrZWo3uMXcW8GK3m2piqs3q6_PSgmI=s680-w680-h510-rw" },
  { name: "Himachal", region: "Himachal Pradesh", imageUrl: "https://www.navgurukul.org/static/media/campus%20photo.160eff25.jpg" },
  { name: "Jashpur", region: "Chhattisgarh", imageUrl: "https://www.navgurukul.org/static/media/image1.8b36aac1.svg" },
  { name: "Kishanganj", region: "Bihar", imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2OldNcGfoR2jGNaZanrMDS8NdcXXmtupqmquN69T3Pwdyp_6DuOUseYSsQhVn_V42flE&usqp=CAU" },
  { name: "Pune", region: "Maharashtra", imageUrl: "https://lh3.googleusercontent.com/gps-cs-s/AC9h4nq5rJf293eOaMT4c1vUXI6ayKjhO7Zn0XNhs08Whf1GcoyHTkIC-Q_m6qw2HJFinr7BDeUpuzZnyqGipCrTdasITZ2YoTsoksSp2HK6pvfFKr1CWgSLRf18W7D2g9VXSmbOXGa0lw=s680-w680-h510-rw" },
  { name: "Raigarh", region: "Chhattisgarh", imageUrl: "https://gmcraigarh.edu.in/assets/img/home1/s2.jpg" },
  { name: "Sarjapur", region: "Karnataka", imageUrl: "https://content.jdmagicbox.com/v2/comp/bangalore/w8/080pxx80.xx80.181203163638.t3w8/catalogue/navgurukul-bangalore-campus-huskur-bangalore-computer-training-insitutes-for-software-diploma-tqjmmkp00i.jpg" },
  { name: "Udaipur", region: "Rajasthan", imageUrl: "https://lh3.googleusercontent.com/gps-cs-s/AC9h4npRn5v_3dPUDWq_OIfu2i98fQhXYfxAWvcLWAc6_PwcApawKb_2uXZ-NHN70yuMlp4C7Z7egnKSNLICfd0nA00e3Bjw3GEnezakiDFAX7sE4Jz6iJPZR_M-yAkv5Wqiog66-LgU=s680-w680-h510-rw" },
];

// ProfilePicture Component
const ProfilePicture = ({ currentUser, onLogout }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const savedImage = localStorage.getItem(`profile-image-${currentUser?.uid || 'guest'}`);
    if (savedImage) {
      setProfileImage(savedImage);
      setOriginalImage(savedImage);
    }
  }, [currentUser]);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const openChangeProfileModal = () => {
    setShowModal(true);
    setShowDropdown(false);
    setPreviewImage(profileImage);
  };

  const handleSaveImage = () => {
    if (previewImage) {
      setProfileImage(previewImage);
      localStorage.setItem(`profile-image-${currentUser?.uid || 'guest'}`, previewImage);
    }
    setShowModal(false);
    setPreviewImage(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const triggerGalleryUpload = () => fileInputRef.current?.click();
  const triggerCameraUpload = () => cameraInputRef.current?.click();
  const handleMouseEnter = () => setShowDropdown(true);
  const handleMouseLeave = () => setShowDropdown(false);

  return (
    <>
      <div 
        className="relative" 
        ref={dropdownRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-white/20 hover:border-white/40 transition-all duration-200"
        >
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-teal-700 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {currentUser ? currentUser.displayName || "User" : "Guest"}
              </p>
              <p className="text-xs text-gray-500">
                {currentUser ? currentUser.email : "guest@example.com"}
              </p>
            </div>
            
            <div className="py-1">
              <button
                onClick={() => setShowDropdown(false)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <User className="w-4 h-4 mr-3" />
                View Profile
              </button>
              
              <button
                onClick={openChangeProfileModal}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Camera className="w-4 h-4 mr-3" />
                Change Profile Picture
              </button>
              
              <button
                onClick={() => {
                  setShowDropdown(false);
                  if (onLogout) onLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Change Profile Picture</h3>
            </div>
            <div className="px-6 py-6">
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={triggerCameraUpload}
                  className="w-full flex items-center justify-center px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo from Camera
                </button>
                
                <button
                  onClick={triggerGalleryUpload}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <User className="w-5 h-5 mr-2" />
                  Choose from Gallery
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex space-x-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveImage}
                disabled={!previewImage}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
    </>
  );
};


const CampusCard = ({ name, region, imageUrl , index}) => (
  <div
    data-aos="zoom-in"
    data-aos-delay={index * 100}
    className="campus-card bg-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl overflow-hidden cursor-pointer border border-gray-200 group"
  >
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
      <Link
        to={`/campus/${encodeURIComponent(name)}/assets`}
        className="text-sm font-bold text-teal-600 hover:text-teal-800 transition-colors bg-teal-50/50 px-3 py-1 rounded-lg inline-block"
      >
        View Details &rarr;
      </Link>
    </div>
  </div>
);


export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) setCurrentUser(user);
      else setCurrentUser(null);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true, easing: "ease-out-cubic" });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="sticky top-0 z-50 shadow-lg bg-teal-600 text-white">
        <div className="max-w-14xl mx-auto px-2 sm:px-6 lg:px-8 py-2 flex justify-between items-center">
          <div className="flex items-center pl-4">
            <img
              src="https://beamish-paletas-139a19.netlify.app/logo.png"
              alt="Navgurukul Logo"
              className="h-10 md:h-12 w-auto object-contain mr-6"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x40/ffffff/0d9488?text=NG+Logo" }}
            />
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            <span className="hidden lg:inline text-sm font-medium opacity-90">
              Hello, {currentUser ? currentUser.displayName || currentUser.email : "Guest"}
            </span>
            <ProfilePicture 
              currentUser={currentUser} 
              onLogout={async () => {
                try {
                  await logOut();
                  navigate("/login");
                } catch (error) {
                  console.error("Error logging out:", error);
                }
              }}
            />
          </div>
        </div>

        <nav className="md:hidden bg-teal-700 text-center py-2 text-sm text-teal-200">
          <p className="opacity-70">Tap Logo for Menu</p>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-10 p-6 bg-white rounded-2xl shadow-xl border-t-4 border-teal-500">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome to the Campus View
          </h1>
          <p className="text-gray-500 mt-1">Discover What Each Campus Holds – From Tech to Taste!</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {campuses.map((campus, index) => (
            <CampusCard key={index} {...campus} index={index} />
          ))}
        </div>
      </main>

      <footer className="mt-16 py-6 bg-gray-800 text-white text-center text-sm shadow-inner">
        <div className="max-w-7xl mx-auto">
          &copy; {new Date().getFullYear()} Inventory Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
