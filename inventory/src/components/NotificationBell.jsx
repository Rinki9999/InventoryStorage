import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db } from '../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    doc,
    updateDoc,
    writeBatch
} from 'firebase/firestore';

const NotificationBell = ({ userRole }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    const markAsRead = async (notificationId) => {
        if (!notificationId) return;
        try {
            const notificationRef = doc(db, 'notifications', notificationId);
            await updateDoc(notificationRef, {
                read: true
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const batch = writeBatch(db);
            notifications.forEach(notification => {
                if (!notification.read) {
                    const notificationRef = doc(db, 'notifications', notification.id);
                    batch.update(notificationRef, { read: true });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    useEffect(() => {
        let unsubscribe = () => { };

        if (userRole === 'admin' || userRole === 'council') {
            try {
                const notificationsRef = collection(db, 'notifications');
                const q = query(
                    notificationsRef,
                    where('recipientRoles', 'array-contains', userRole),
                    orderBy('createdAt', 'desc'),
                    limit(20) // Show only last 20 notifications
                );

                unsubscribe = onSnapshot(q, (snapshot) => {
                    const newNotifications = snapshot.docs.map(doc => {
                        const data = doc.data();
                        let timeAgo = '';
                        if (data.createdAt) {
                            const date = data.createdAt.toDate();
                            const now = new Date();
                            const diffMinutes = Math.floor((now - date) / (1000 * 60));

                            if (diffMinutes < 1) timeAgo = 'Just now';
                            else if (diffMinutes < 60) timeAgo = `${diffMinutes}m ago`;
                            else if (diffMinutes < 1440) timeAgo = `${Math.floor(diffMinutes / 60)}h ago`;
                            else timeAgo = `${Math.floor(diffMinutes / 1440)}d ago`;
                        }

                        return {
                            id: doc.id,
                            ...data,
                            timeAgo,
                            createdAt: data.createdAt?.toDate() || new Date()
                        };
                    });
                    setNotifications(newNotifications);
                    setUnreadCount(newNotifications.filter(n => !n.read).length);
                }, (error) => {
                    console.error("Error fetching notifications:", error);
                });
            } catch (error) {
                console.error("Error setting up notifications:", error);
            }
        }

        return () => unsubscribe();
    }, [userRole]);

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    return (
        <div className="relative">
            {/* Bell Icon with Badge */}
            <button
                onClick={toggleDropdown}
                className="relative p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
            >
                <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Notifications Dropdown */}
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="divide-y divide-gray-100">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${!notification.read ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div
                                        className="flex items-start relative"
                                        onClick={() => !notification.read && markAsRead(notification.id)}
                                    >
                                        {/* Icon based on notification type */}
                                        <div className={`flex-shrink-0 rounded-full p-2 ${notification.type === 'low_stock' ? 'bg-red-100 text-red-600' :
                                                notification.type === 'expiring_soon' ? 'bg-yellow-100 text-yellow-600' :
                                                    notification.type === 'delete' ? 'bg-gray-100 text-gray-600' :
                                                        'bg-blue-100 text-blue-600'
                                            }`}>
                                            {notification.type === 'low_stock' && (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                                </svg>
                                            )}
                                            {notification.type === 'expiring_soon' && (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            )}
                                            {notification.type === 'update' && (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            )}
                                            {notification.type === 'delete' && (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className={`text-sm ${notification.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                                                    {notification.title}
                                                    {!notification.read && (
                                                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            New
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                    {notification.timeAgo}
                                                </p>
                                            </div>
                                            <p className={`mt-1 text-sm ${notification.read ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {notification.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500">
                                No notifications
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

NotificationBell.propTypes = {
    userRole: PropTypes.oneOf(['admin', 'council', 'student']).isRequired,
    className: PropTypes.string
};

export default NotificationBell;