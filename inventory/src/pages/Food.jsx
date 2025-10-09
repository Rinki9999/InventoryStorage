import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from '../firebase';
import { useNavigate } from "react-router-dom"; // Add this import at the top


// Load Tone.js from CDN (Assuming this is available in the environment)
const Tone = window.Tone;

// -------------------------- (1) CONSTANTS & UTILITIES --------------------------

const STOCK_LIMIT = 2; // Low stock threshold: less than 2
const EXPIRY_WARNING_DAYS = 5; // CRITICAL: Days for expiry warning/notification
const MOCK_TODAY = new Date('2025-10-01T00:00:00'); // Mock date for consistent testing

// Mock Inventory Data (Initial State - 'notes' field removed for simplicity)
const initialInventory = [
    { id: 1, name: "Rice", quantity: 1, expiryDate: '2025-10-02' },
    { id: 2, name: "Flour", quantity: 10, expiryDate: '2025-10-20' },
    { id: 3, name: "Lentils", quantity: 5, expiryDate: '2025-10-05' },
    { id: 4, name: "Refined Flour", quantity: 1, expiryDate: '2025-11-15' },
    { id: 5, name: "Sugar", quantity: 3, expiryDate: '2025-09-29' }, // Expired
    { id: 6, name: "Chickpea Flour", quantity: 8, expiryDate: '2025-10-01' }, // Expires today
    { id: 7, name: "Cooking Oil", quantity: 0, expiryDate: '2025-10-03' }, // Low stock, expiring soon
    { id: 8, name: "Vegetable Oil", quantity: 4, expiryDate: '2025-12-01' },
    { id: 9, name: "Tea Leaves", quantity: 2, expiryDate: '2025-10-07' }, // Expiring soon
    { id: 10, name: "Pancake Mix", quantity: 3, expiryDate: '2026-03-20' },
];

// Utility function to calculate days remaining
const getDaysUntilExpiry = (dateString) => {
    const today = new Date(MOCK_TODAY.getFullYear(), MOCK_TODAY.getMonth(), MOCK_TODAY.getDate());
    const expiry = new Date(dateString);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper to map status colors to Tailwind classes
const getStatusClasses = (color) => {
    const colorMap = {
        'text-green-stock': { text: 'text-green-600', bg: 'bg-green-100' },
        'text-red-low': { text: 'text-red-600', bg: 'bg-red-100' },
        'text-orange-exp': { text: 'text-orange-600', bg: 'bg-orange-100' },
        'text-gray-500': { text: 'text-gray-500', bg: 'bg-gray-100' },
    };
    const mapped = colorMap[color];
    return mapped ? `${mapped.text} ${mapped.bg}` : '';
};


// -------------------------- (2) SUB COMPONENTS --------------------------

// Component 2.1: Notification Toast
const NotificationToast = React.memo(({ message }) => {
    if (!message) return null;

    const baseClasses = "fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 hover:scale-[1.02] active:scale-95";

    let colorClasses = "";
    let icon = '💬';

    if (message.type === 'success' || message.type === 'update' || message.type === 'delete') {
        colorClasses = "bg-green-600 text-white border-b-4 border-green-800";
        icon = message.type === 'success' ? '✅' : message.type === 'update' ? '🔄' : '🗑️';
    } else if (message.type === 'error') {
        colorClasses = "bg-red-600 text-white border-b-4 border-red-800";
        icon = '🚨';
    }

    return (
        <div className={`${baseClasses} ${colorClasses}`}>
            <div className="flex items-center space-x-3">
                <span className="text-xl">{icon}</span>
                <p className="font-semibold text-sm">{message.text}</p>
            </div>
        </div>
    );
});


// Component 2.2: Edit Item Modal ('notes' state and UI removed)
const EditItemModal = React.memo(({ editingItem, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [expiryDate, setExpiryDate] = useState('');

    useEffect(() => {
        if (editingItem) {
            setName(editingItem.name);
            setQuantity(editingItem.quantity);
            setExpiryDate(editingItem.expiryDate);
        }
    }, [editingItem]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Saving the updated item without 'notes'
        onSave({ ...editingItem, name, quantity: parseInt(quantity, 10), expiryDate });
    };

    if (!editingItem) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 transition duration-300">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-full mx-4 border-t-8 border-indigo-600 modal-content">
                <h3 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center">
                    ✏️ Edit Item Details
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="edit-item-name" className="block text-sm font-medium text-gray-700">Item Name</label>
                        <input type="text" id="edit-item-name" required value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="edit-item-quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input type="number" id="edit-item-quantity" required min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="edit-item-expiry" className="block text-sm font-medium text-gray-700">Expiry Date</label>
                            <input type="date" id="edit-item-expiry" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition duration-150">
                            Cancel
                        </button>
                        <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition duration-150 shadow-md">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
});


// Component 2.3: Expiry Alarm Modal
const AlarmModal = React.memo(({ isOpen, alarmItems, onClose }) => {
    if (!isOpen || alarmItems.length === 0) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[999] bg-black bg-opacity-80 transition duration-300">
            <div className="bg-white p-6 rounded-xl shadow-3xl max-w-sm w-full mx-4 border-t-8 border-orange-exp relative transform transition-all duration-300 scale-100 animate-pulse-border">

                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition duration-150 z-50"
                    title="Close Alarm"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <h3 className="text-2xl font-extrabold text-gray-800 mb-4 flex items-center">
                    ⚠️ Expiry Alert!
                </h3>
                <div className="text-gray-600 space-y-2 mb-6 text-sm max-h-40 overflow-y-auto pr-2">
                    {alarmItems.map((item, index) => {
                        const daysText = item.daysLeft === 0 ? 'Today' : `${item.daysLeft} days`;
                        return (
                            <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="font-bold text-gray-800">{item.name}</p>
                                <p className="text-sm text-orange-exp">Expires in: <span className="font-extrabold">{daysText}</span></p>
                            </div>
                        );
                    })}
                </div>
                <button onClick={onClose}
                    className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition duration-150 shadow-lg 
                                transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
                >
                    Dismiss Alert
                </button>
            </div>
        </div>
    );
});

// Component 2.4: Item Details View ('notes' display removed)
const ItemDetails = React.memo(({ item, onGoBack }) => {
    if (!item) return null;

    // Status Logic for the item (re-evaluated for freshness)
    const daysLeft = getDaysUntilExpiry(item.expiryDate);
    const isExpired = daysLeft < 0;
    const isExpiringSoon = daysLeft >= 0 && daysLeft <= EXPIRY_WARNING_DAYS;
    const isLowStock = item.quantity < STOCK_LIMIT;

    let statusText = 'Sufficient Stock & Fresh';
    let statusColorClass = 'text-green-600 bg-green-50';

    if (isExpired) {
        statusText = 'EXPIRED - Immediate Action Required';
        statusColorClass = 'text-red-600 bg-red-50';
    } else if (isLowStock && isExpiringSoon) {
        statusText = 'CRITICAL: Low Quantity and Expiring Soon';
        statusColorClass = 'text-red-600 bg-red-50';
    } else if (isLowStock) {
        statusText = 'Low Stock - Reorder Recommended';
        statusColorClass = 'text-red-600 bg-red-50';
    } else if (isExpiringSoon) {
        statusText = 'Expiring Soon - Plan to Use';
        statusColorClass = 'text-orange-600 bg-orange-50';
    }

    const daysLeftDisplay = daysLeft === 0 ? 'Today' :
        daysLeft > 0 ? `${daysLeft} days remaining` :
            `${Math.abs(daysLeft)} days ago (Expired)`;

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-2xl border-t-8 border-indigo-600 mt-8">
            <button
                onClick={onGoBack}
                className="inline-flex items-center px-4 py-2 mb-6 text-indigo-600 font-semibold rounded-full hover:bg-indigo-50 transition duration-150 transform active:scale-95"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Dashboard
            </button>

            <h1 className="text-4xl font-extrabold text-gray-800 mb-4">{item.name} Details</h1>

            <div className="p-4 rounded-xl mb-6 flex justify-between items-center border border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Current Status</p>
                <span className={`px-4 py-1 rounded-full text-sm font-bold ${statusColorClass}`}>{statusText}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <DetailCard title="Quantity in Stock" value={`${item.quantity} units`} color="indigo" />
                <DetailCard title="Expiry Date" value={item.expiryDate} subValue={daysLeftDisplay} color="orange" />
            </div>

            {/* Notes Section Removed */}
        </div>
    );
});

// Helper component for ItemDetails
const DetailCard = ({ title, value, subValue, color }) => (
    <div className={`p-5 rounded-xl shadow-md border-l-4 border-${color}-400 bg-white`}>
        <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
        <p className="text-3xl font-extrabold text-gray-800 mt-1">{value}</p>
        {subValue && <p className={`text-xs mt-1 text-${color}-600 font-semibold`}>{subValue}</p>}
    </div>
);


// -------------------------- (3) MAIN APP COMPONENT --------------------------

export default function App() {
    const navigate = useNavigate(); // Add this line at the top of your component

    // --- STATE MANAGEMENT (React Hooks) ---
    const [rawInventory, setRawInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFilter, setCurrentFilter] = useState('All Items');
    const [currentSearch, setCurrentSearch] = useState('');
    const [currentSort, setCurrentSort] = useState('expiry_asc');
    const [message, setMessage] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [isAlarmOpen, setIsAlarmOpen] = useState(false);
    const [alarmItems, setAlarmItems] = useState([]);
    const [isAlarmDismissed, setIsAlarmDismissed] = useState(false);
    const isInitialLoadRef = useRef(true);

    // --- NAVIGATION STATE ---
    const [currentPage, setCurrentPage] = useState('DASHBOARD');
    const [selectedItem, setSelectedItem] = useState(null);

    // Tone.js reference and context status
    const synthRef = useRef(null);

    // Load data from Firebase on component mount
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'foodItems'), async (snapshot) => {
            const foodData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // If collection is empty, populate with initial data
            if (foodData.length === 0 && snapshot.metadata.fromCache === false) {
                console.log("Food items collection is empty, adding initial data...");
                try {
                    for (const foodItem of initialInventory) {
                        const { id, ...foodItemData } = foodItem; // Remove id field
                        await addDoc(collection(db, 'foodItems'), foodItemData);
                    }
                    console.log("Initial food items data added successfully!");
                } catch (error) {
                    console.error("Error adding initial food items:", error);
                }
            } else {
                setRawInventory(foodData);
                setLoading(false);
            }
        }, (error) => {
            console.error("Error loading food items:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // --- TONE.JS AUDIO SETUP ---
    useEffect(() => {
        if (typeof Tone !== 'undefined' && synthRef.current === null) {
            try {
                synthRef.current = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "square" },
                    envelope: { attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.2 }
                }).toDestination();
            } catch (e) {
                console.error("Tone.js initialization failed:", e);
            }
        }
    }, []);

    const playAlarmSound = useCallback(async () => {
        if (synthRef.current) {
            try {
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                }
                synthRef.current.triggerAttackRelease(["C5", "G4"], "8n");
            } catch (error) {
                console.error("Failed to play sound. Audio context might be restricted.", error);
            }
        }
    }, []);

    const handleCloseAlarm = useCallback(() => {
        setIsAlarmOpen(false);
        setIsAlarmDismissed(true);
    }, []);

    const handleManualAlarmCheck = useCallback(() => {
        if (alarmItems.length > 0) {
            setIsAlarmOpen(true);
            playAlarmSound();
        } else {
            showMessage("No items are expiring soon.", "update");
        }
    }, [alarmItems, playAlarmSound]);


    const showMessage = useCallback((text, type = 'success') => {
        let messageText = '';
        if (type === 'success') {
            messageText = `"${text}" successfully added.`;
        } else if (type === 'update') {
            messageText = `"${text}" successfully updated.`;
        } else if (type === 'delete') {
            messageText = `"${text}" removed from list.`;
        } else {
            messageText = 'Please fill all fields correctly.';
        }

        setMessage({ text: messageText, type });
        setTimeout(() => setMessage(null), 3500);
    }, []);

    // --- INVENTORY PROCESSING & ALERT LOGIC ---
    const processedInventory = useMemo(() => {
        const expiringItemsList = [];

        const processed = rawInventory.map(item => {
            if (!item.expiryDate) {
                return { ...item, daysLeft: 9999, status: 'Invalid Date', color: 'text-gray-500', icon: '❓' };
            }

            const daysLeft = getDaysUntilExpiry(item.expiryDate);
            const isExpired = daysLeft < 0;
            const isExpiringSoon = daysLeft >= 0 && daysLeft <= EXPIRY_WARNING_DAYS;
            const isLowStock = item.quantity < STOCK_LIMIT;

            let status = 'Sufficient Stock';
            let color = 'text-green-stock';
            let icon = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>`;

            if (isExpired) {
                status = 'EXPIRED!';
                color = 'text-red-low';
                icon = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
            } else if (isLowStock && isExpiringSoon) {
                status = 'Low & Expiring';
                color = 'text-red-low';
                icon = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.3 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
                expiringItemsList.push({ ...item, daysLeft });
            } else if (isLowStock) {
                status = 'Low Stock';
                color = 'text-red-low';
                icon = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`;
            } else if (isExpiringSoon) {
                status = 'Expiring Soon';
                color = 'text-orange-exp';
                icon = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                expiringItemsList.push({ ...item, daysLeft });
            }

            return { ...item, daysLeft, status, color, icon };
        });

        setAlarmItems(expiringItemsList);

        return processed;
    }, [rawInventory]);

    // --- FILTERED & SORTED INVENTORY ---
    const filteredInventory = useMemo(() => {
        let filtered = processedInventory;

        if (currentFilter === 'Expiring Soon') {
            filtered = filtered.filter(item => item.daysLeft >= 0 && item.daysLeft <= EXPIRY_WARNING_DAYS);
        } else if (currentFilter === 'Low Stock') {
            filtered = filtered.filter(item => item.quantity < STOCK_LIMIT);
        } else if (currentFilter === 'In Stock') {
            filtered = filtered.filter(item => item.quantity >= STOCK_LIMIT && item.daysLeft > EXPIRY_WARNING_DAYS);
        }

        if (currentSearch) {
            const searchLower = currentSearch.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchLower)
            );
        }

        filtered.sort((a, b) => {
            switch (currentSort) {
                case 'expiry_asc':
                    return a.daysLeft - b.daysLeft;
                case 'expiry_desc':
                    return b.daysLeft - a.daysLeft;
                case 'quantity_asc':
                    return a.quantity - b.quantity;
                case 'quantity_desc':
                    return b.quantity - a.quantity;
                default:
                    return 0;
            }
        });

        return filtered;
    }, [processedInventory, currentFilter, currentSearch, currentSort]);


    // --- ALARM TRIGGER EFFECT ---
    useEffect(() => {
        if (isInitialLoadRef.current) {
            if (alarmItems.length > 0 && !isAlarmDismissed) {
                setIsAlarmOpen(true);
                playAlarmSound();
            }
            isInitialLoadRef.current = false;
        }

        if (alarmItems.length === 0 && isAlarmDismissed) {
            setIsAlarmDismissed(false);
        }
    }, [alarmItems.length, playAlarmSound, isAlarmDismissed]);


    // --- CRUD OPERATIONS ---
    const handleAddItem = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.elements['item-name-input'].value.trim();
        const quantity = parseInt(form.elements['item-quantity-input'].value, 10);
        const expiryDate = form.elements['item-expiry-input'].value;
        // 'notes' field removed from here

        if (!name || isNaN(quantity) || quantity < 0 || !expiryDate) {
            showMessage('Please fill all fields correctly.', 'error');
            return;
        }

        try {
            const newItem = {
                name: name,
                quantity: quantity,
                expiryDate: expiryDate,
                // 'notes' field removed from the object
            };

            await addDoc(collection(db, 'foodItems'), newItem);
            form.reset();
            form.elements['item-quantity-input'].value = "1";
            showMessage(name, 'success');
        } catch (error) {
            console.error("Error adding food item:", error);
            showMessage('Error adding item. Please try again.', 'error');
        }
    };

    const handleEditSave = async (updatedItem) => {
        try {
            const itemRef = doc(db, 'foodItems', updatedItem.id);
            const { id, ...updateData } = updatedItem;
            await updateDoc(itemRef, updateData);
            setEditingItem(null);
            showMessage(updatedItem.name, 'update');
            if (currentPage === 'DETAILS' && selectedItem?.id === updatedItem.id) {
                setSelectedItem(updatedItem);
            }
        } catch (error) {
            console.error("Error updating food item:", error);
            showMessage('Error updating item. Please try again.', 'error');
        }
    };

    const handleDeleteItem = async (itemId, itemName) => {
        try {
            await deleteDoc(doc(db, 'foodItems', itemId));
            showMessage(itemName, 'delete');
            if (currentPage === 'DETAILS' && selectedItem?.id === itemId) {
                setCurrentPage('DASHBOARD');
                setSelectedItem(null);
            }
        } catch (error) {
            console.error("Error deleting food item:", error);
            showMessage('Error deleting item. Please try again.', 'error');
        }
    };

    // --- NAVIGATION HANDLERS ---
    const handleViewDetails = (item) => {
        setSelectedItem(item);
        setCurrentPage('DETAILS');
    };

    const handleGoBack = () => {
        setCurrentPage('DASHBOARD');
        setSelectedItem(null);
    };

    // Back button handler
    const handleBack = () => {
        navigate(-1); // This will take user to previous page
    };

    // --- UI HELPERS ---
    const updateFilterCounts = useMemo(() => {
        return {
            'All Items': processedInventory.length,
            'Expiring Soon': processedInventory.filter(item => item.daysLeft >= 0 && item.daysLeft <= EXPIRY_WARNING_DAYS).length,
            'Low Stock': processedInventory.filter(item => item.quantity < STOCK_LIMIT).length,
            'In Stock': processedInventory.filter(item => item.quantity >= STOCK_LIMIT && item.daysLeft > EXPIRY_WARNING_DAYS).length,
        };
    }, [processedInventory]);

    const filters = [
        { name: 'All Items', label: 'All Items' },
        { name: 'Expiring Soon', label: 'Expiring Soon' },
        { name: 'Low Stock', label: 'Low Stock' },
        { name: 'In Stock', label: 'Sufficient Stock' }
    ];

    // --- Conditional Rendering for Navigation ---
    const renderContent = () => {
        if (currentPage === 'DETAILS' && selectedItem) {
            return <ItemDetails item={selectedItem} onGoBack={handleGoBack} />;
        }

        // Default: Render the main Dashboard
        return (
            <>
                {/* Dashboard Header with Back Button on Top Right */}
                <header className="relative mb-6 max-w-4xl mx-auto">
                    <h1 className="text-4xl font-extrabold text-gray-800 text-center">📊 Food Asset Management Dashboard</h1>
                    <p className="text-gray-500 mt-2 text-center">15-Day Stock Management and Waste Prevention</p>
                    {/* Centered Alarm Button and Checked Date */}
                    <div className="flex flex-col items-center mt-4">
                        <button
                            onClick={handleManualAlarmCheck}
                            className="inline-flex items-center px-4 py-2 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition duration-150 shadow-md transform active:scale-95"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.405L4 17h5m6 0v1a3 3 0 11-6 0v-1"></path>
                            </svg>
                            Check Alarm Manually
                        </button>
                        <p className="text-xs text-gray-400 mt-1 text-center">
                            <span className="font-semibold">
                                Checked Date: {MOCK_TODAY.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </p>
                    </div>
                </header>


                {/* Main Content Sections */}
                <main className="max-w-6xl mx-auto space-y-6">

                    {/* Add New Item Section - Now using 4 columns */}
                    <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
                        <h2 className="text-2xl font-bold text-indigo-600 mb-4">➕ Add New Item</h2>
                        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Item Name */}
                            <input type="text" id="item-name-input" placeholder="Item Name (e.g., Flour)" required
                                className="p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />

                            {/* Quantity */}
                            <input type="number" id="item-quantity-input" placeholder="Quantity" required min="0" defaultValue="1"
                                className="p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />

                            {/* Expiry Date */}
                            <input type="date" id="item-expiry-input" placeholder="Expiry Date" required
                                className="p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />

                            {/* Submit Button */}
                            <button type="submit" className="bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition duration-150 shadow-md">
                                Add to List
                            </button>
                        </form>
                    </section>

                    {/* Controls Section: Filters, Search, Sort */}
                    <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 space-y-4">

                        {/* Filter Buttons */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {filters.map((filter) => (
                                <button
                                    key={filter.name}
                                    onClick={() => setCurrentFilter(filter.name)}
                                    className={`
                                        filter-button relative px-4 py-2 rounded-xl text-sm font-semibold transition duration-150 flex items-center justify-center text-center
                                        ${filter.name === currentFilter
                                            ? 'active bg-indigo-600 text-white shadow-lg'
                                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'}
                                    `}
                                >
                                    {filter.label}
                                    <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none rounded-full 
                                        ${filter.name === currentFilter ? 'bg-white text-indigo-600' : 'bg-gray-200 text-gray-600'}`}
                                    >
                                        {updateFilterCounts[filter.name]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search and Sort */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <input type="text" onChange={(e) => setCurrentSearch(e.target.value)} placeholder="Search by Item Name..."
                                    className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150" />
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>

                            <select value={currentSort} onChange={(e) => setCurrentSort(e.target.value)}
                                className="w-full sm:w-64 p-3 border border-gray-300 rounded-xl appearance-none bg-white pr-8 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
                                <option value="expiry_asc">Sort: Expiry Date (Soonest)</option>
                                <option value="expiry_desc">Sort: Expiry Date (Latest)</option>
                                <option value="quantity_asc">Sort: Quantity (Low to High)</option>
                                <option value="quantity_desc">Sort: Quantity (High to Low)</option>
                            </select>
                        </div>
                    </section>

                    {/* Data Display Table */}
                    <section>
                        <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredInventory.length > 0 ? (
                                        filteredInventory.map(item => {
                                            const daysLeftText = item.daysLeft === 0 ? 'Today' :
                                                item.daysLeft > 0 ? `${item.daysLeft} days` :
                                                    `${Math.abs(item.daysLeft)} days ago`;

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 transition duration-100 ease-in-out">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${item.quantity < STOCK_LIMIT ? 'text-red-low font-bold' : 'text-gray-700'}`}>
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.expiryDate} ({daysLeftText})
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                        <span className={`inline-flex items-center text-xs font-bold leading-none rounded-full px-3 py-1 bg-opacity-10 ${getStatusClasses(item.color)}`}
                                                            title={item.status}>
                                                            <span dangerouslySetInnerHTML={{ __html: item.icon }} />
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-2 flex items-center">
                                                        {/* View Details Button for Navigation */}
                                                        <button onClick={() => handleViewDetails(item)}
                                                            className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-full transition duration-150 hover:bg-green-100"
                                                            title="View Details">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                        </button>
                                                        {/* Edit Button */}
                                                        <button onClick={() => setEditingItem(item)}
                                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-full transition duration-150 hover:bg-indigo-100"
                                                            title="Edit Item">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                        </button>
                                                        {/* Delete Button */}
                                                        <button onClick={() => handleDeleteItem(item.id, item.name)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full transition duration-150 hover:bg-red-100"
                                                            title="Delete Item">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center p-10 text-gray-500">
                                                No items match the current filter or search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </>
        );
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    // --- REACT COMPONENT RENDER (Main Return) ---
    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#f3ffec] font-['Inter'] relative">
            {/* Top-right Back Button */}
            <button
                onClick={handleBack}
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all z-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            {/* Custom Styles for aesthetic elements */}
            <style>{`
                .text-green-stock { color: #10b981; }
                .text-red-low { color: #ef4444; }
                .text-orange-exp { color: #f97316; }
                .bg-green-100 { background-color: #d1fae5; }
                .bg-red-100 { background-color: #fee2e2; }
                .bg-orange-100 { background-color: #ffedd5; }
                .text-green-600 { color: #059669; }
                .text-red-600 { color: #dc2626; }
                .text-orange-600 { color: #ea580c; }
                .shadow-3xl { box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                /* Custom animation for the alarm modal border */
                @keyframes pulse-border {
                    0% { border-color: #f97316; }
                    50% { border-color: #ef4444; }
                    100% { border-color: #f97316; }
                }
                .animate-pulse-border {
                    animation: pulse-border 1.5s infinite alternate;
                }
                .max-h-40 { scrollbar-width: none; }
                .max-h-40::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Modals and Toasts are rendered globally */}
            <AlarmModal
                isOpen={isAlarmOpen}
                alarmItems={alarmItems}
                onClose={handleCloseAlarm}
            />
            <EditItemModal
                editingItem={editingItem}
                onSave={handleEditSave}
                onClose={() => setEditingItem(null)}
            />
            <NotificationToast message={message} />

            {/* Conditional Content Rendering */}
            {renderContent()}
        </div>
    );
}