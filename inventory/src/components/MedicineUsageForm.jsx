import React, { useState } from 'react';
import { db, collection, addDoc } from "../firebase";

const MedicineUsageForm = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    medicineName: '',
    usageInstructions: '',
    dosage: '',
    frequency: '',
    whenToTake: '',
    precautions: '',
    sideEffects: ''
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
      const docRef = await addDoc(collection(db, "medicineUsage"), {
        ...formData,
        timestamp: new Date(),
        createdBy: 'admin'
      });

      console.log("Medicine usage added with ID: ", docRef.id);
      
      // Call parent callback if provided
      if (onSubmit) {
        onSubmit(formData);
      }

      // Reset form
      setFormData({
        medicineName: '',
        usageInstructions: '',
        dosage: '',
        frequency: '',
        whenToTake: '',
        precautions: '',
        sideEffects: ''
      });

      alert('Medicine usage instructions added successfully!');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error adding medicine usage: ", error);
      alert('Error adding usage instructions. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="medicine-usage-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add Medicine Usage Instructions</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="usage-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="medicineName">Medicine Name *</label>
              <input
                type="text"
                id="medicineName"
                name="medicineName"
                value={formData.medicineName}
                onChange={handleInputChange}
                required
                placeholder="Enter medicine name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dosage">Dosage *</label>
              <input
                type="text"
                id="dosage"
                name="dosage"
                value={formData.dosage}
                onChange={handleInputChange}
                required
                placeholder="e.g., 1 tablet, 5ml"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="frequency">Frequency *</label>
              <select
                id="frequency"
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                required
              >
                <option value="">Select frequency</option>
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Four times daily">Four times daily</option>
                <option value="As needed">As needed</option>
                <option value="Every 4 hours">Every 4 hours</option>
                <option value="Every 6 hours">Every 6 hours</option>
                <option value="Every 8 hours">Every 8 hours</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="whenToTake">When to Take *</label>
              <select
                id="whenToTake"
                name="whenToTake"
                value={formData.whenToTake}
                onChange={handleInputChange}
                required
              >
                <option value="">Select timing</option>
                <option value="Before meals">Before meals</option>
                <option value="After meals">After meals</option>
                <option value="With meals">With meals</option>
                <option value="Empty stomach">Empty stomach</option>
                <option value="Before bedtime">Before bedtime</option>
                <option value="Morning">Morning</option>
                <option value="Any time">Any time</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="usageInstructions">Usage Instructions *</label>
            <textarea
              id="usageInstructions"
              name="usageInstructions"
              value={formData.usageInstructions}
              onChange={handleInputChange}
              required
              placeholder="Detailed instructions on how to use this medicine..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="precautions">Precautions</label>
            <textarea
              id="precautions"
              name="precautions"
              value={formData.precautions}
              onChange={handleInputChange}
              placeholder="Important precautions and warnings..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sideEffects">Side Effects</label>
            <textarea
              id="sideEffects"
              name="sideEffects"
              value={formData.sideEffects}
              onChange={handleInputChange}
              placeholder="Common side effects to watch for..."
              rows="2"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Usage Instructions'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .medicine-usage-modal {
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
          max-width: 700px;
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

        .usage-form {
          padding: 24px;
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
        .form-group select,
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
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #10b981;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
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
          background: #10b981;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #059669;
        }

        .submit-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default MedicineUsageForm;