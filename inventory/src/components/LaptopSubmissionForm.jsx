import React, { useState } from 'react';
import { db, collection, addDoc } from "../firebase";

const LaptopSubmissionForm = ({ onClose, onSubmit, currentUser }) => {
  const [formData, setFormData] = useState({
    name: currentUser?.displayName || '',
    email: currentUser?.email || '',
    laptopNumber: '',
    submissionDate: new Date().toISOString().split('T')[0],
    chargerNumber: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Add to Firestore collection
      const docRef = await addDoc(collection(db, "laptopSubmissions"), {
        ...formData,
        uid: currentUser?.uid || null,
        timestamp: new Date(),
        status: 'pending'
      });

      console.log("Laptop submission added with ID: ", docRef.id);
      
      // Call parent callback if provided
      if (onSubmit) {
        onSubmit(formData);
      }

      // Reset form
      setFormData({
        name: currentUser?.displayName || '',
        email: currentUser?.email || '',
        laptopNumber: '',
        submissionDate: new Date().toISOString().split('T')[0],
        chargerNumber: ''
      });

      alert('Laptop submission successful! IT team will be notified.');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error adding laptop submission: ", error);
      alert('Error submitting form. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="laptop-submission-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Laptop Submission Form</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="submission-form">
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
            <label htmlFor="submissionDate">Submission Date *</label>
            <input
              type="date"
              id="submissionDate"
              name="submissionDate"
              value={formData.submissionDate}
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
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Laptop'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .laptop-submission-modal {
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
          max-width: 500px;
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

        .submission-form {
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
          border-color: #007bff;
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
          background: #007bff;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .submit-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default LaptopSubmissionForm;