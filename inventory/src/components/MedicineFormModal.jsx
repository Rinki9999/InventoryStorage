import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, query, where, onSnapshot, updateDoc, doc, getDocs } from '../firebase';

const MedicineFormModal = ({ onClose, currentUser, userRole }) => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [medicineValidation, setMedicineValidation] = useState({ isValid: true, message: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  // Load available medicines from database
  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'medications'));
        const medicines = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          displayName: doc.data().name || doc.data().medicationName || doc.data().itemName || doc.data().medicine || 'Unknown Medicine'
        }));
        setAvailableMedicines(medicines);
      } catch (error) {
        console.error('Error loading medicines:', error);
      }
    };
    loadMedicines();
  }, []);

  // Filter suggestions as user types
  useEffect(() => {
    if (form.itemName.trim()) {
      const suggestions = availableMedicines.filter(med => {
        const medName = med.name || med.medicationName || med.itemName || med.medicine || '';
        return medName && medName.toLowerCase().includes(form.itemName.toLowerCase().trim());
      }).slice(0, 5); // Limit to 5 suggestions
      
      setFilteredSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0 && form.itemName.trim().length > 1);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [form.itemName, availableMedicines]);

  // Validate medicine name as user types
  useEffect(() => {
    if (form.itemName.trim()) {
      const medicine = availableMedicines.find(med => {
        const medName = med.name || med.medicationName || med.itemName || med.medicine || '';
        return medName && medName.toLowerCase().trim() === form.itemName.toLowerCase().trim();
      });

      if (medicine) {
        const availableStock = parseInt(medicine.quantity) || parseInt(medicine.stock) || parseInt(medicine.count) || parseInt(medicine.qty) || 0;
        if (availableStock > 0) {
          setMedicineValidation({ 
            isValid: true, 
            message: `✓ Medicine available (Stock: ${availableStock} units)` 
          });
          setShowSuggestions(false); // Hide suggestions when valid medicine is selected
        } else {
          setMedicineValidation({ 
            isValid: false, 
            message: `⚠️ Medicine found but out of stock` 
          });
        }
      } else {
        setMedicineValidation({ 
          isValid: false, 
          message: 'Medicine not found. Please select from suggestions below.' 
        });
      }
    } else {
      setMedicineValidation({ isValid: true, message: '' });
    }
  }, [form.itemName, availableMedicines]);

  // Load any existing request by this user
  useEffect(() => {
    let unsub;
    if (currentUser && currentUser.uid) {
      // If user cancelled previously in this session, don't auto-load existing request
      const clearedKey = `medicineForm_cleared_${currentUser.uid}`;
      const wasCleared = sessionStorage.getItem(clearedKey);
      if (wasCleared) {
        return;
      }
      try {
        const q = query(collection(db, 'health_requests'), where('requesterUid', '==', currentUser.uid));
        unsub = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (docs.length > 0) {
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

  const findMedicationByName = async (name) => {
    try {
      // Get all medications and do case-insensitive search
      const snapshot = await getDocs(collection(db, 'medications'));
      const medications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Search for medicine with case-insensitive matching - try multiple field names
      const foundMedication = medications.find(med => {
        // Check multiple possible name fields
        const medName = med.name || med.medicationName || med.itemName || med.medicine || '';
        return medName && medName.toLowerCase().trim() === name.toLowerCase().trim();
      });
      
      return foundMedication || null;
    } catch (error) {
      console.error('Error finding medication:', error);
      return null;
    }
  };

    const handleSubmit = async () => {
    if (!validate()) {
      setMessage('Please fill required fields correctly.');
      return;
    }

    // Check medicine validation
    if (!medicineValidation.isValid) {
      setMessage('Please select a valid medicine from the available medicine.');
      return;
    }

    // Check stock availability if it's a countable item
    if (form.isCountable && form.quantity) {
      const requestedQty = parseInt(form.quantity);
      const medication = await findMedicationByName(form.itemName);
      
      if (medication) {
        // Check multiple possible stock field names
        const availableStock = parseInt(medication.quantity) || parseInt(medication.stock) || parseInt(medication.count) || parseInt(medication.qty) || 0;
        if (requestedQty > availableStock) {
          setMessage(`Only ${availableStock} units available in stock. You cannot request more than the available quantity.`);
          return;
        }
      } else {
        setMessage('Medicine not found in medication database.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const requestData = {
        ...form,
        requesterUid: currentUser?.uid || '',
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      if (isSubmitted && submittedId) {
        // Update existing request
        await updateDoc(doc(db, 'health_requests', submittedId), requestData);
        setMessage('Request updated successfully!');
        // clear the "cancelled in session" marker so next open will load this request
        if (currentUser && currentUser.uid) {
          const clearedKey = `medicineForm_cleared_${currentUser.uid}`;
          sessionStorage.removeItem(clearedKey);
        }
      } else {
        // Create new request and deduct stock
        const docRef = await addDoc(collection(db, 'health_requests'), requestData);
        
        // Deduct stock from medication dashboard if it's countable
        if (form.isCountable && form.quantity) {
          const medication = await findMedicationByName(form.itemName);
          if (medication) {
            const currentStock = parseInt(medication.quantity) || parseInt(medication.stock) || parseInt(medication.count) || parseInt(medication.qty) || 0;
            const newQuantity = currentStock - parseInt(form.quantity);
            
            // Update the correct field (preserve the original field name)
            const updatedData = {
              ...medication,
              status: newQuantity <= 0 ? 'out of stock' : medication.status || 'available'
            };
            
            // Update the field that exists in the original document
            if (medication.quantity !== undefined) {
              updatedData.quantity = Math.max(0, newQuantity);
            } else if (medication.stock !== undefined) {
              updatedData.stock = Math.max(0, newQuantity);
            } else if (medication.count !== undefined) {
              updatedData.count = Math.max(0, newQuantity);
            } else if (medication.qty !== undefined) {
              updatedData.qty = Math.max(0, newQuantity);
            }
            
            await updateDoc(doc(db, 'medications', medication.id), updatedData);
          }
        }
        
        setSubmittedId(docRef.id);
        setIsSubmitted(true);
        setMessage('Request submitted successfully! Stock updated.');
        if (currentUser && currentUser.uid) {
          const clearedKey = `medicineForm_cleared_${currentUser.uid}`;
          sessionStorage.removeItem(clearedKey);
        }
      }

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error submitting request:', error);
      setMessage('Error submitting request. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleCancel = () => {
    // Mark that user cancelled so reopening modal in this session shows fresh form
    if (currentUser && currentUser.uid) {
      const clearedKey = `medicineForm_cleared_${currentUser.uid}`;
      sessionStorage.setItem(clearedKey, '1');
    }
    onClose();
  };

  return (
    <div className="medicine-form-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Medicine Request Form</h2>
          <button className="close-btn" onClick={handleCancel}>&times;</button>
        </div>
        
        <div className="form-container">
          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={form.requesterName}
                onChange={(e) => handleChange('requesterName', e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={form.requesterEmail}
                onChange={(e) => handleChange('requesterEmail', e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>Medicine/Item Name *</label>
            <input
              type="text"
              value={form.itemName}
              onChange={(e) => handleChange('itemName', e.target.value)}
              placeholder="Enter medicine or item name"
              required
              style={{
                borderColor: form.itemName.trim() && !medicineValidation.isValid ? '#ef4444' : '#d1d5db'
              }}
              onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                right: '0',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                {filteredSuggestions.map((medicine, index) => {
                  const medName = medicine.name || medicine.medicationName || medicine.itemName || medicine.medicine || '';
                  const stock = parseInt(medicine.quantity) || parseInt(medicine.stock) || parseInt(medicine.count) || parseInt(medicine.qty) || 0;
                  return (
                    <div
                      key={medicine.id || index}
                      onClick={() => {
                        handleChange('itemName', medName);
                        setShowSuggestions(false);
                      }}
                      style={{
                        padding: '10px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        backgroundColor: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      <span>{medName}</span>
                      <span style={{
                        fontSize: '12px',
                        color: stock > 0 ? '#059669' : '#dc2626',
                        fontWeight: 'bold'
                      }}>
                        Stock: {stock}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {medicineValidation.message && (
              <div style={{
                marginTop: '5px',
                padding: '8px',
                fontSize: '14px',
                borderRadius: '4px',
                backgroundColor: medicineValidation.isValid ? '#dcfce7' : '#fef2f2',
                color: medicineValidation.isValid ? '#166534' : '#dc2626',
                border: `1px solid ${medicineValidation.isValid ? '#bbf7d0' : '#fecaca'}`
              }}>
                {medicineValidation.message}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isCountable"
                    checked={form.isCountable}
                    onChange={() => handleChange('isCountable', true)}
                  />
                  Countable
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isCountable"
                    checked={!form.isCountable}
                    onChange={() => handleChange('isCountable', false)}
                  />
                  Non-countable
                </label>
              </div>
            </div>

            {form.isCountable && (
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  placeholder="Enter quantity"
                  min="1"
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Date Required *</label>
            <input
              type="date"
              value={form.dateRequested}
              onChange={(e) => handleChange('dateRequested', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Reason/Purpose *</label>
            <textarea
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Explain why you need this medicine/item"
              rows="3"
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button 
              type="button" 
              className="submit-btn" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : (isSubmitted ? 'Update Request' : 'Submit Request')}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .medicine-form-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 0;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
          border-radius: 12px 12px 0 0;
        }

        .modal-header h2 {
          margin: 0;
          color: #333;
          font-size: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #333;
        }

        .form-container {
          padding: 24px;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          box-sizing: border-box;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #14b8a6;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .radio-group {
          display: flex;
          gap: 16px;
          margin-top: 6px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 400;
          cursor: pointer;
        }

        .radio-label input[type="radio"] {
          width: auto;
          margin: 0;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .cancel-btn, .submit-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: #f8f9fa;
          color: #6c757d;
          border: 1px solid #dee2e6;
        }

        .cancel-btn:hover {
          background: #e9ecef;
        }

        .submit-btn {
          background: #14b8a6;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #0f766e;
        }

        .submit-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default MedicineFormModal;