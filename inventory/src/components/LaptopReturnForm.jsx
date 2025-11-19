import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, query, where, getDocs, deleteDoc, doc } from "../firebase";

const LaptopReturnForm = ({ onClose, onReturn }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    laptopNumber: '',
    returnDate: new Date().toISOString().split('T')[0],
    chargerNumber: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableLaptops, setAvailableLaptops] = useState([]);
  const [isLoadingLaptops, setIsLoadingLaptops] = useState(false);

  // Load available laptops when form opens
  useEffect(() => {
    const loadAvailableLaptops = async () => {
      setIsLoadingLaptops(true);
      try {
        const q = query(collection(db, "laptopSubmissions"), where("status", "==", "approved"));
        const querySnapshot = await getDocs(q);
        const laptops = [];
        querySnapshot.forEach((doc) => {
          laptops.push({ id: doc.id, ...doc.data() });
        });
        setAvailableLaptops(laptops);
      } catch (error) {
        console.error("Error loading available laptops: ", error);
      }
      setIsLoadingLaptops(false);
    };

    loadAvailableLaptops();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Find the laptop submission to remove
      const q = query(
        collection(db, "laptopSubmissions"), 
        where("laptopNumber", "==", formData.laptopNumber),
        where("status", "==", "approved")
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert('Laptop not found in submitted laptops. Please check the laptop number.');
        setIsSubmitting(false);
        return;
      }

      // Add to laptop returns collection
      await addDoc(collection(db, "laptopReturns"), {
        ...formData,
        timestamp: new Date(),
        status: 'returned'
      });

      // Remove from laptop submissions
      querySnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(doc(db, "laptopSubmissions", docSnapshot.id));
      });

      console.log("Laptop returned successfully");
      
      // Call parent callback if provided
      if (onReturn) {
        onReturn(formData);
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        laptopNumber: '',
        returnDate: new Date().toISOString().split('T')[0],
        chargerNumber: ''
      });

      alert('Laptop return successful! IT team has been notified.');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error processing laptop return: ", error);
      alert('Error processing return. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleLaptopSelect = (laptop) => {
    setFormData(prev => ({
      ...prev,
      name: laptop.name,
      email: laptop.email,
      laptopNumber: laptop.laptopNumber,
      chargerNumber: laptop.chargerNumber || ''
    }));
  };

  return (
    <div className="laptop-return-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Laptop Return Form</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        {/* Available Laptops Section */}
        {availableLaptops.length > 0 && (
          <div className="available-laptops-section">
            <h3>Available Laptops for Return</h3>
            {isLoadingLaptops ? (
              <div>Loading available laptops...</div>
            ) : (
              <div className="laptop-list">
                {availableLaptops.map((laptop) => (
                  <div 
                    key={laptop.id} 
                    className="laptop-item"
                    onClick={() => handleLaptopSelect(laptop)}
                  >
                    <div className="laptop-info">
                      <strong>{laptop.name}</strong> - {laptop.laptopNumber}
                      <div className="laptop-details">
                        Email: {laptop.email} | Submitted: {new Date(laptop.timestamp?.toDate()).toLocaleDateString()}
                      </div>
                    </div>
                    <button type="button" className="select-btn">Select</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="return-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email ID *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="laptopNumber">Laptop Number *</label>
            <input
              type="text"
              id="laptopNumber"
              name="laptopNumber"
              value={formData.laptopNumber}
              onChange={handleInputChange}
              required
              placeholder="Enter laptop serial/asset number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="returnDate">Return Date *</label>
            <input
              type="date"
              id="returnDate"
              name="returnDate"
              value={formData.returnDate}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="chargerNumber">Charger Number</label>
            <input
              type="text"
              id="chargerNumber"
              name="chargerNumber"
              value={formData.chargerNumber}
              onChange={handleInputChange}
              placeholder="Enter charger number (optional)"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="return-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Processing Return...' : 'Return Laptop'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .laptop-return-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
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

        .available-laptops-section {
          padding: 20px 24px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }

        .available-laptops-section h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
        }

        .laptop-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .laptop-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          margin-bottom: 8px;
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .laptop-item:hover {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .laptop-info {
          flex: 1;
        }

        .laptop-details {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .select-btn {
          padding: 6px 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .select-btn:hover {
          background: #0056b3;
        }

        .return-form {
          padding: 24px;
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

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #dc3545;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .cancel-btn, .return-btn {
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

        .return-btn {
          background: #dc3545;
          color: white;
        }

        .return-btn:hover:not(:disabled) {
          background: #c82333;
        }

        .return-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default LaptopReturnForm;