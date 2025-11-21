import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, updateDoc, doc, deleteDoc, addDoc, query, where, getDocs, setDoc } from '../firebase';
import { signOut } from 'firebase/auth';

const ActiveUsersAdmin = ({ onClose, currentUser }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'student',
    password: ''
  });

  useEffect(() => {
    // Check and add current user to Firestore if not exists
    const ensureCurrentUserInFirestore = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUser.uid)));
          if (userDoc.empty) {
            console.log('Current user not in Firestore, adding...');
            // Add current user to Firestore
            await setDoc(doc(db, 'users', currentUser.uid), {
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email,
              photoURL: currentUser.photoURL || null,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            });
            
            // Add user role
            const roleQuery = query(collection(db, 'userRoles'), where('uid', '==', currentUser.uid));
            const roleSnapshot = await getDocs(roleQuery);
            
            if (roleSnapshot.empty) {
              const userRole = localStorage.getItem(`userRole_${currentUser.uid}`) || 'student';
              await addDoc(collection(db, 'userRoles'), {
                uid: currentUser.uid,
                role: userRole,
                createdAt: new Date().toISOString()
              });
            }
            
            // Add active login
            await addDoc(collection(db, 'activeLogins'), {
              uid: currentUser.uid,
              loginTime: new Date().toISOString(),
              lastActive: new Date().toISOString(),
              userAgent: navigator.userAgent
            });
            
            console.log('Current user added to Firestore');
          }
        } catch (error) {
          console.error('Error ensuring user in Firestore:', error);
        }
      }
    };

    ensureCurrentUserInFirestore();

    // Listen to all registered users and their active sessions
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, async (snapshot) => {
      try {
        console.log('ActiveUsersAdmin: Users snapshot received, docs:', snapshot.docs.length);
        const allUsers = [];
        
        for (const userDoc of snapshot.docs) {
          const userData = userDoc.data();
          
          // Get user's role from userRoles collection
          const roleQuery = query(collection(db, 'userRoles'), where('uid', '==', userDoc.id));
          const roleSnapshot = await getDocs(roleQuery);
          let userRole = 'student'; // default
          
          if (!roleSnapshot.empty) {
            userRole = roleSnapshot.docs[0].data().role || 'student';
          }

          // Check if user has active login session
          const activeLoginQuery = query(collection(db, 'activeLogins'), where('uid', '==', userDoc.id));
          const activeLoginSnapshot = await getDocs(activeLoginQuery);
          const isActivelyLoggedIn = !activeLoginSnapshot.empty;
          let lastActive = null;
          
          if (isActivelyLoggedIn) {
            lastActive = activeLoginSnapshot.docs[0].data().lastActive;
          }

          allUsers.push({
            id: userDoc.id,
            ...userData,
            role: userRole,
            isActive: isActivelyLoggedIn,
            lastActive: lastActive,
            activeLoginDocId: isActivelyLoggedIn ? activeLoginSnapshot.docs[0].id : null
          });
        }

        // Sort by active status first, then by role
        allUsers.sort((a, b) => {
          if (a.isActive !== b.isActive) return b.isActive - a.isActive;
          const roleOrder = { admin: 0, council: 1, student: 2 };
          return roleOrder[a.role] - roleOrder[b.role];
        });

        console.log('ActiveUsersAdmin: Final users array:', allUsers);
        setActiveUsers(allUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error loading users:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChangeRole = async (userId, newRole) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    setActionLoading(true);
    try {
      // Update or create user role
      const roleQuery = query(collection(db, 'userRoles'), where('uid', '==', userId));
      const roleSnapshot = await getDocs(roleQuery);
      
      if (roleSnapshot.empty) {
        await addDoc(collection(db, 'userRoles'), {
          uid: userId,
          role: newRole,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.uid
        });
      } else {
        await updateDoc(doc(db, 'userRoles', roleSnapshot.docs[0].id), {
          role: newRole,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.uid
        });
      }

      // Send notification to user
      await addDoc(collection(db, 'userNotifications'), {
        title: 'Role Updated',
        message: `Your account role has been updated to ${newRole} by an administrator.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
        recipientUid: userId,
        fromSystem: 'Administration'
      });

      alert(`User role updated to ${newRole} successfully!`);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error updating user role. Please try again.');
    }
    setActionLoading(false);
  };

  const handleForceLogout = async (userId, activeLoginDocId) => {
    if (!confirm('Are you sure you want to force logout this user?')) return;
    
    setActionLoading(true);
    try {
      // Remove from active logins
      if (activeLoginDocId) {
        await deleteDoc(doc(db, 'activeLogins', activeLoginDocId));
      }

      // Send notification to user
      await addDoc(collection(db, 'userNotifications'), {
        title: 'Account Logged Out',
        message: 'Your session has been terminated by an administrator. Please log in again if needed.',
        type: 'warning',
        read: false,
        createdAt: new Date().toISOString(),
        recipientUid: userId,
        fromSystem: 'Administration'
      });

      alert('User has been logged out successfully!');
    } catch (error) {
      console.error('Error logging out user:', error);
      alert('Error logging out user. Please try again.');
    }
    setActionLoading(false);
  };

  const handleAddUser = async () => {
    if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password.trim()) {
      alert('Please fill all required fields');
      return;
    }

    setActionLoading(true);
    try {
      // Create user invitation/request
      await addDoc(collection(db, 'userInvitations'), {
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        tempPassword: newUserData.password,
        invitedBy: currentUser?.uid,
        invitedByName: currentUser?.displayName || currentUser?.email,
        createdAt: new Date().toISOString(),
        status: 'pending',
        inviteCode: Math.random().toString(36).substring(2, 15)
      });

      alert(`User invitation sent! They can register with email: ${newUserData.email}`);
      
      // Reset form
      setNewUserData({
        name: '',
        email: '',
        role: 'student',
        password: ''
      });
      setShowAddUserModal(false);
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error sending user invitation. Please try again.');
    }
    setActionLoading(false);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUser) return;
    
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'userNotifications'), {
        title: 'Message from Administrator',
        message: message.trim(),
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
        recipientUid: selectedUser.id,
        fromSystem: 'Administration'
      });

      alert('Message sent successfully!');
      setMessage('');
      setShowMessageModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    }
    setActionLoading(false);
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user? This will delete their account permanently.')) return;
    
    setActionLoading(true);
    try {
      // Remove from users collection
      await deleteDoc(doc(db, 'users', userId));
      
      // Remove from userRoles
      const roleQuery = query(collection(db, 'userRoles'), where('uid', '==', userId));
      const roleSnapshot = await getDocs(roleQuery);
      if (!roleSnapshot.empty) {
        await deleteDoc(doc(db, 'userRoles', roleSnapshot.docs[0].id));
      }

      // Remove from activeLogins
      const activeQuery = query(collection(db, 'activeLogins'), where('uid', '==', userId));
      const activeSnapshot = await getDocs(activeQuery);
      if (!activeSnapshot.empty) {
        await deleteDoc(doc(db, 'activeLogins', activeSnapshot.docs[0].id));
      }

      alert('User removed successfully!');
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Error removing user. Please try again.');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Active Users Management</h2>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              ➕ Add User
            </button>
            <button
              onClick={async () => {
                try {
                  // Add a test student
                  await setDoc(doc(db, 'users', 'test-student-123'), {
                    email: 'student@test.com',
                    displayName: 'Test Student',
                    photoURL: null,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                  });
                  
                  await addDoc(collection(db, 'userRoles'), {
                    uid: 'test-student-123',
                    role: 'student',
                    createdAt: new Date().toISOString()
                  });
                  
                  alert('Test student added!');
                } catch (error) {
                  console.error('Error adding test user:', error);
                }
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              🧪 Add Test User
            </button>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-4 text-sm text-gray-600">
            Total Users: {activeUsers.length} | 
            Active: {activeUsers.filter(u => u.isActive).length} | 
            Admins: {activeUsers.filter(u => u.role === 'admin').length} | 
            Council: {activeUsers.filter(u => u.role === 'council').length} | 
            Students: {activeUsers.filter(u => u.role === 'student').length}
          </div>

          <div className="grid gap-4">
            {activeUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">No users found</p>
                <p className="text-sm mt-2">There are no registered users in the system yet.</p>
              </div>
            ) : (
              activeUsers.map(user => (
                <div 
                  key={user.id} 
                  className={`border rounded-lg p-4 ${
                    user.isActive ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Profile Picture */}
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName} 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-gray-600">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {user.displayName || 'No Name'}
                      </h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'council' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                      {user.lastActive && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last Active: {new Date(user.lastActive).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Change Role Dropdown */}
                    <select
                      onChange={(e) => e.target.value && handleChangeRole(user.id, e.target.value)}
                      disabled={actionLoading || user.id === currentUser?.uid}
                      className="px-3 py-1 border rounded text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>Change Role</option>
                      <option value="student">Student</option>
                      <option value="council">Council</option>
                      <option value="admin">Admin</option>
                    </select>

                    {/* Send Message */}
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowMessageModal(true);
                      }}
                      disabled={actionLoading}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      📧 Message
                    </button>

                    {/* Force Logout */}
                    {user.isActive && (
                      <button
                        onClick={() => handleForceLogout(user.id, user.activeLoginDocId)}
                        disabled={actionLoading || user.id === currentUser?.uid}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                      >
                        🚪 Logout
                      </button>
                    )}

                    {/* Remove User */}
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      disabled={actionLoading || user.id === currentUser?.uid}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Send Message to {selectedUser.displayName || selectedUser.email}
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              className="w-full p-3 border rounded-lg mb-4 h-32 resize-none"
              disabled={actionLoading}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedUser(null);
                  setMessage('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={actionLoading || !message.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="student">Student</option>
                  <option value="council">Council Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  value={newUserData.tempPassword}
                  onChange={(e) => setNewUserData({...newUserData, tempPassword: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-generated or custom"
                />
                <p className="text-xs text-gray-500 mt-1">
                  User will need to change this password on first login
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUserData({
                      name: '',
                      email: '',
                      role: 'student',
                      tempPassword: ''
                    });
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveUsersAdmin;