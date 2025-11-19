import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// -------------------------- (1) CONSTANTS & UTILITIES --- -----------------------

const STOCK_LIMIT = 5; // Low stock threshold: less than 5
const MOCK_TODAY = new Date('2025-11-03T00:00:00'); // Mock date for consistent testing

// Mock Office Supplies Inventory Data
const initialInventory = [
    { id: 1, name: "A4 Paper", quantity: 50, category: "Stationery", supplier: "Office Depot" },
    { id: 2, name: "Blue Pens", quantity: 3, category: "Stationery", supplier: "Staples" },
    { id: 3, name: "Staplers", quantity: 8, category: "Equipment", supplier: "Office Max" },
    { id: 4, name: "Paper Clips", quantity: 2, category: "Stationery", supplier: "Local Store" },
    { id: 5, name: "Folders", quantity: 15, category: "Organization", supplier: "Office Depot" },
    { id: 6, name: "Whiteboard Markers", quantity: 1, category: "Stationery", supplier: "Amazon" },
    { id: 7, name: "Printer Cartridges", quantity: 0, category: "Equipment", supplier: "HP Store" },
    { id: 8, name: "Notebooks", quantity: 25, category: "Stationery", supplier: "Local Store" },
    { id: 9, name: "Highlighters", quantity: 4, category: "Stationery", supplier: "Staples" },
    { id: 10, name: "Desk Organizers", quantity: 6, category: "Organization", supplier: "IKEA" },
];

// Helper to get status based on quantity
const getItemStatus = (quantity) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (quantity <= STOCK_LIMIT) return { status: 'Low Stock', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { status: 'In Stock', color: 'text-green-600', bgColor: 'bg-green-100' };
};

// -------------------------- (2) MAIN COMPONENT -----------------------

export default function OfficeSupplies() {
    const navigate = useNavigate();
    
    // State Management
    const [inventory, setInventory] = useState(initialInventory);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState({
        name: '',
        quantity: '',
        category: 'Stationery',
        supplier: ''
    });

    const categories = ['All', 'Stationery', 'Equipment', 'Organization'];

    // Filtered and sorted inventory
    const filteredInventory = useMemo(() => {
        return inventory
            .filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                let aValue = a[sortBy];
                let bValue = b[sortBy];
                
                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }
                
                if (sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });
    }, [inventory, searchTerm, filterCategory, sortBy, sortOrder]);

    // Statistics
    const stats = useMemo(() => {
        const totalItems = inventory.length;
        const lowStockItems = inventory.filter(item => item.quantity > 0 && item.quantity <= STOCK_LIMIT).length;
        const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
        const inStockItems = inventory.filter(item => item.quantity > STOCK_LIMIT).length;

        return { totalItems, lowStockItems, outOfStockItems, inStockItems };
    }, [inventory]);

    // Add new item
    const handleAddItem = () => {
        if (!newItem.name.trim() || !newItem.quantity || !newItem.supplier.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        const item = {
            id: Date.now(),
            name: newItem.name.trim(),
            quantity: parseInt(newItem.quantity),
            category: newItem.category,
            supplier: newItem.supplier.trim()
        };

        setInventory(prev => [...prev, item]);
        setNewItem({ name: '', quantity: '', category: 'Stationery', supplier: '' });
        setShowAddModal(false);
    };

    // Edit item
    const handleEditItem = (item) => {
        setEditingItem(item);
        setNewItem({
            name: item.name,
            quantity: item.quantity.toString(),
            category: item.category,
            supplier: item.supplier
        });
        setShowAddModal(true);
    };

    // Update item
    const handleUpdateItem = () => {
        if (!newItem.name.trim() || !newItem.quantity || !newItem.supplier.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        setInventory(prev => prev.map(item => 
            item.id === editingItem.id 
                ? {
                    ...item,
                    name: newItem.name.trim(),
                    quantity: parseInt(newItem.quantity),
                    category: newItem.category,
                    supplier: newItem.supplier.trim()
                }
                : item
        ));

        setEditingItem(null);
        setNewItem({ name: '', quantity: '', category: 'Stationery', supplier: '' });
        setShowAddModal(false);
    };

    // Delete item
    const handleDeleteItem = (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            setInventory(prev => prev.filter(item => item.id !== id));
        }
    };

    // Close modal
    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingItem(null);
        setNewItem({ name: '', quantity: '', category: 'Stationery', supplier: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Office Supplies Inventory</h1>
                        <p className="text-gray-600 mt-2">Manage your office supplies and stationery</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            + Add Item
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Items</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 text-xl">📦</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">In Stock</p>
                                <p className="text-2xl font-bold text-green-600">{stats.inStockItems}</p>
                            </div>
                            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-green-600 text-xl">✅</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</p>
                            </div>
                            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <span className="text-orange-600 text-xl">⚠️</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                                <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
                            </div>
                            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <span className="text-red-600 text-xl">❌</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-64">
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="name">Name</option>
                            <option value="quantity">Quantity</option>
                            <option value="category">Category</option>
                            <option value="supplier">Supplier</option>
                        </select>
                    </div>
                    
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Supplier
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredInventory.map((item) => {
                                const { status, color, bgColor } = getItemStatus(item.quantity);
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.quantity}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bgColor} ${color}`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">{item.supplier}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditItem(item)}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingItem ? 'Edit Item' : 'Add New Item'}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Item Name *
                                </label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter item name"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category *
                                </label>
                                <select
                                    value={newItem.category}
                                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="Stationery">Stationery</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Organization">Organization</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newItem.quantity}
                                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter quantity"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supplier *
                                </label>
                                <input
                                    type="text"
                                    value={newItem.supplier}
                                    onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter supplier name"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingItem ? handleUpdateItem : handleAddItem}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                {editingItem ? 'Update' : 'Add'} Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}