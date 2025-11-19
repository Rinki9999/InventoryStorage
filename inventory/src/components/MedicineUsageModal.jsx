import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, getDocs } from "../firebase";

const MedicineUsageModal = ({ onClose }) => {
  const [medicineUsage, setMedicineUsage] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sample medicine data with common problems mapping
  const commonProblems = {
    'headache': ['Calpol 500', 'Dolo - 650', 'Flexon'],
    'fever': ['Calpol 500', 'Dolo - 650', 'Flexon'],
    'stomach': ['Omez', 'ORS', 'Nobel Spas new'],
    'nausea': ['Vomikind - MD 4', 'ORS'],
    'vomiting': ['Vomikind - MD 4', 'ORS'],
    'allergy': ['Cetirizine'],
    'skin': ['Burnol', 'Nebasulf powder', 'Dettol'],
    'wound': ['Burnol', 'Nebasulf powder', 'Dettol', 'Bandage'],
    'cut': ['Burnol', 'Dettol', 'Bandage'],
    'pain': ['Flexon', 'Calpol 500', 'Dolo - 650'],
    'acidity': ['Omez'],
    'infection': ['Flagyl 400', 'Nebasulf powder'],
    'vitamin': ['Bicosules']
  };

  // Load medicine usage data from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'medicineUsage'), (snapshot) => {
      const usageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMedicineUsage(usageData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading medicine usage:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter medicines based on search query
  const filteredMedicines = medicineUsage.filter(medicine => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // Search by medicine name
    if (medicine.medicineName.toLowerCase().includes(query)) {
      return true;
    }

    // Search by problem/symptom
    for (const [problem, medicines] of Object.entries(commonProblems)) {
      if (problem.includes(query) && medicines.some(med => 
        medicine.medicineName.toLowerCase().includes(med.toLowerCase())
      )) {
        return true;
      }
    }

    // Search in usage instructions and precautions
    if (medicine.usageInstructions?.toLowerCase().includes(query) ||
        medicine.precautions?.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });

  const handleMedicineClick = (medicine) => {
    setSelectedMedicine(medicine);
  };

  const handleBackToList = () => {
    setSelectedMedicine(null);
  };

  if (loading) {
    return (
      <div className="medicine-usage-modal">
        <div className="modal-overlay" onClick={onClose}></div>
        <div className="modal-content">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading medicine instructions...</p>
          </div>
        </div>
        <style jsx>{getModalStyles()}</style>
      </div>
    );
  }

  return (
    <div className="medicine-usage-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Medicine Usage Instructions</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {!selectedMedicine ? (
          // Medicine List View
          <div className="medicine-list-view">
            {/* Search Bar */}
            <div className="search-section">
              <div className="search-input-container">
                <input
                  type="text"
                  placeholder="Search by medicine name or problem (e.g., headache, fever, stomach pain)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <div className="search-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>
              
              {searchQuery && (
                <p className="search-hint">
                  Searching for: <span className="search-term">"{searchQuery}"</span>
                </p>
              )}
            </div>

            {/* Medicine List */}
            <div className="medicine-list">
              {filteredMedicines.length === 0 ? (
                <div className="no-results">
                  <div className="no-results-icon">💊</div>
                  <h3>No medicines found</h3>
                  <p>
                    {searchQuery 
                      ? `No medicines match "${searchQuery}". Try searching for common problems like headache, fever, stomach pain, etc.`
                      : 'No medicine usage instructions available. Admin or Council can add them from the Medicine Dashboard.'
                    }
                  </p>
                </div>
              ) : (
                <div className="medicine-grid">
                  {filteredMedicines.map((medicine) => (
                    <div 
                      key={medicine.id} 
                      className="medicine-card"
                      onClick={() => handleMedicineClick(medicine)}
                    >
                      <div className="medicine-name">{medicine.medicineName}</div>
                      <div className="medicine-preview">
                        <div className="dosage-info">
                          <span className="label">Dosage:</span> {medicine.dosage}
                        </div>
                        <div className="frequency-info">
                          <span className="label">Frequency:</span> {medicine.frequency}
                        </div>
                      </div>
                      <div className="click-hint">Click for details →</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Medicine Detail View
          <div className="medicine-detail-view">
            <button className="back-btn" onClick={handleBackToList}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to list
            </button>

            <div className="medicine-details">
              <h3 className="medicine-title">{selectedMedicine.medicineName}</h3>
              
              <div className="detail-section">
                <h4>💊 Dosage & Frequency</h4>
                <div className="info-grid">
                  <div><strong>Dosage:</strong> {selectedMedicine.dosage}</div>
                  <div><strong>Frequency:</strong> {selectedMedicine.frequency}</div>
                  <div><strong>When to take:</strong> {selectedMedicine.whenToTake}</div>
                </div>
              </div>

              <div className="detail-section">
                <h4>📋 Usage Instructions</h4>
                <p>{selectedMedicine.usageInstructions}</p>
              </div>

              {selectedMedicine.precautions && (
                <div className="detail-section warning">
                  <h4>⚠️ Precautions</h4>
                  <p>{selectedMedicine.precautions}</p>
                </div>
              )}

              {selectedMedicine.sideEffects && (
                <div className="detail-section info">
                  <h4>ℹ️ Side Effects</h4>
                  <p>{selectedMedicine.sideEffects}</p>
                </div>
              )}

              <div className="added-info">
                <small>
                  Added: {selectedMedicine.timestamp ? 
                    new Date(selectedMedicine.timestamp.toDate()).toLocaleDateString() 
                    : 'Recently'
                  }
                </small>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{getModalStyles()}</style>
    </div>
  );
};

const getModalStyles = () => `
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
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow: hidden;
    position: relative;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
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

  .medicine-list-view {
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }

  .search-section {
    padding: 24px 24px 0 24px;
    border-bottom: 1px solid #eee;
    margin-bottom: 20px;
  }

  .search-input-container {
    position: relative;
    margin-bottom: 12px;
  }

  .search-input {
    width: 100%;
    padding: 12px 16px 12px 50px;
    border: 2px solid #e1e5e9;
    border-radius: 25px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .search-input:focus {
    outline: none;
    border-color: #10b981;
  }

  .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
  }

  .search-hint {
    font-size: 12px;
    color: #666;
    margin: 0;
    padding-bottom: 16px;
  }

  .search-term {
    font-weight: 600;
    color: #10b981;
  }

  .medicine-list {
    padding: 0 24px 24px 24px;
  }

  .medicine-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .medicine-card {
    border: 2px solid #e1e5e9;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    background: #fafafa;
  }

  .medicine-card:hover {
    border-color: #10b981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
    background: white;
  }

  .medicine-name {
    font-weight: 600;
    font-size: 16px;
    color: #333;
    margin-bottom: 12px;
  }

  .medicine-preview {
    margin-bottom: 12px;
  }

  .dosage-info, .frequency-info {
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
  }

  .label {
    font-weight: 500;
    color: #333;
  }

  .click-hint {
    font-size: 12px;
    color: #10b981;
    font-weight: 500;
  }

  .no-results {
    text-align: center;
    padding: 60px 20px;
    color: #666;
  }

  .no-results-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .no-results h3 {
    margin: 0 0 12px 0;
    color: #333;
  }

  .no-results p {
    margin: 0;
    max-width: 400px;
    margin: 0 auto;
    line-height: 1.5;
  }

  .medicine-detail-view {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #f8f9fa;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 24px;
    font-size: 14px;
  }

  .back-btn:hover {
    background: #e9ecef;
    color: #333;
  }

  .medicine-details {
    max-width: 600px;
  }

  .medicine-title {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin: 0 0 24px 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #10b981;
  }

  .detail-section {
    margin-bottom: 24px;
    padding: 20px;
    border-radius: 8px;
    background: #f8f9fa;
  }

  .detail-section.warning {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
  }

  .detail-section.info {
    background: #d1ecf1;
    border-left: 4px solid #17a2b8;
  }

  .detail-section h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
  }

  .detail-section p {
    margin: 0;
    line-height: 1.6;
    color: #555;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }

  .info-grid div {
    font-size: 14px;
    color: #555;
  }

  .added-info {
    text-align: center;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #eee;
  }

  .loading-state {
    padding: 60px 24px;
    text-align: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #10b981;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .medicine-grid {
      grid-template-columns: 1fr;
    }
    
    .info-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default MedicineUsageModal;