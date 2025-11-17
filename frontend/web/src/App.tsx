import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';

interface InvestmentData {
  id: string;
  name: string;
  encryptedValue: any;
  publicValue1: number;
  publicValue2: number;
  description: string;
  creator: string;
  timestamp: number;
  isVerified: boolean;
  decryptedValue: number;
  category: string;
  riskLevel: number;
}

interface ClubStats {
  totalProposals: number;
  verifiedProposals: number;
  totalInvestment: number;
  activeMembers: number;
  avgReturn: number;
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<InvestmentData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingInvestment, setCreatingInvestment] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending", 
    message: "" 
  });
  const [newInvestmentData, setNewInvestmentData] = useState({ 
    name: "", 
    amount: "", 
    description: "", 
    category: "DAO",
    riskLevel: "5"
  });
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [clubStats, setClubStats] = useState<ClubStats>({
    totalProposals: 0,
    verifiedProposals: 0,
    totalInvestment: 0,
    activeMembers: 0,
    avgReturn: 0
  });
  const [contractAddress, setContractAddress] = useState("");

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting } = useEncrypt();
  const { verifyDecryption, isDecrypting } = useDecrypt();

  useEffect(() => {
    const initFhevm = async () => {
      if (!isConnected || isInitialized) return;
      try {
        await initialize();
      } catch (error) {
        console.error('FHEVM init failed:', error);
      }
    };
    initFhevm();
  }, [isConnected, isInitialized, initialize]);

  useEffect(() => {
    const loadData = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      try {
        const contract = await getContractReadOnly();
        if (!contract) return;
        
        setContractAddress(await contract.getAddress());
        const businessIds = await contract.getAllBusinessIds();
        const investmentsList: InvestmentData[] = [];
        
        for (const businessId of businessIds) {
          try {
            const businessData = await contract.getBusinessData(businessId);
            investmentsList.push({
              id: businessId,
              name: businessData.name,
              encryptedValue: null,
              publicValue1: Number(businessData.publicValue1) || 0,
              publicValue2: Number(businessData.publicValue2) || 0,
              description: businessData.description,
              creator: businessData.creator,
              timestamp: Number(businessData.timestamp),
              isVerified: businessData.isVerified,
              decryptedValue: Number(businessData.decryptedValue) || 0,
              category: "Investment",
              riskLevel: Number(businessData.publicValue1) || 5
            });
          } catch (e) {
            console.error('Error loading investment:', e);
          }
        }
        
        setInvestments(investmentsList);
        updateClubStats(investmentsList);
      } catch (e) {
        console.error('Load data error:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isConnected]);

  const updateClubStats = (data: InvestmentData[]) => {
    const totalProposals = data.length;
    const verifiedProposals = data.filter(item => item.isVerified).length;
    const totalInvestment = data.reduce((sum, item) => sum + (item.isVerified ? item.decryptedValue : 0), 0);
    const activeMembers = new Set(data.map(item => item.creator)).size;
    const avgReturn = data.length > 0 ? data.reduce((sum, item) => sum + item.publicValue1, 0) / data.length : 0;

    setClubStats({
      totalProposals,
      verifiedProposals,
      totalInvestment,
      activeMembers,
      avgReturn
    });
  };

  const createInvestment = async () => {
    if (!isConnected || !address) {
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return;
    }
    
    setCreatingInvestment(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Creating encrypted investment..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("No contract");
      
      const amountValue = parseInt(newInvestmentData.amount) || 0;
      const businessId = `investment-${Date.now()}`;
      
      const encryptedResult = await encrypt(contractAddress, address, amountValue);
      
      const tx = await contract.createBusinessData(
        businessId,
        newInvestmentData.name,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        parseInt(newInvestmentData.riskLevel) || 5,
        0,
        newInvestmentData.description
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Waiting for confirmation..." });
      await tx.wait();
      
      setTransactionStatus({ visible: true, status: "success", message: "Investment created!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      setShowCreateModal(false);
      setNewInvestmentData({ name: "", amount: "", description: "", category: "DAO", riskLevel: "5" });
      
      window.location.reload();
    } catch (e: any) {
      const errorMsg = e.message?.includes("rejected") ? "Transaction rejected" : "Creation failed";
      setTransactionStatus({ visible: true, status: "error", message: errorMsg });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally {
      setCreatingInvestment(false);
    }
  };

  const decryptInvestment = async (investmentId: string): Promise<number | null> => {
    if (!isConnected || !address) return null;
    
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(investmentId);
      if (businessData.isVerified) {
        return Number(businessData.decryptedValue) || 0;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(investmentId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        contractAddress,
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(investmentId, abiEncodedClearValues, decryptionProof)
      );
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      return Number(clearValue);
      
    } catch (e: any) {
      console.error('Decryption error:', e);
      return null;
    }
  };

  const handleCheckAvailable = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      if (isAvailable) {
        setTransactionStatus({ visible: true, status: "success", message: "FHE System Available!" });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
      }
    } catch (e) {
      console.error('Available check failed:', e);
    }
  };

  const filteredInvestments = investments.filter(investment => {
    const matchesSearch = investment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || investment.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const renderStatsDashboard = () => {
    return (
      <div className="stats-dashboard">
        <div className="stat-card neon-purple">
          <div className="stat-icon">💎</div>
          <div className="stat-content">
            <div className="stat-value">{clubStats.totalProposals}</div>
            <div className="stat-label">Total Proposals</div>
          </div>
        </div>
        
        <div className="stat-card neon-blue">
          <div className="stat-icon">🔐</div>
          <div className="stat-content">
            <div className="stat-value">{clubStats.verifiedProposals}</div>
            <div className="stat-label">Encrypted Verified</div>
          </div>
        </div>
        
        <div className="stat-card neon-pink">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">${clubStats.totalInvestment.toLocaleString()}</div>
            <div className="stat-label">Total Value</div>
          </div>
        </div>
        
        <div className="stat-card neon-green">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{clubStats.activeMembers}</div>
            <div className="stat-label">Active Members</div>
          </div>
        </div>
      </div>
    );
  };

  const renderInvestmentChart = (investment: InvestmentData) => {
    const returnRate = investment.publicValue1;
    const riskLevel = investment.riskLevel;
    
    return (
      <div className="investment-chart">
        <div className="chart-row">
          <div className="chart-label">Return Potential</div>
          <div className="chart-bar">
            <div 
              className="bar-fill return" 
              style={{ width: `${returnRate * 10}%` }}
            >
              <span className="bar-value">{returnRate}/10</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Risk Level</div>
          <div className="chart-bar">
            <div 
              className="bar-fill risk" 
              style={{ width: `${riskLevel * 10}%` }}
            >
              <span className="bar-value">{riskLevel}/10</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <h1 className="neon-title">Confidential Investment Club</h1>
            <p className="tagline">FHE 🔐 Protected Alpha</p>
          </div>
          <ConnectButton />
        </header>
        
        <div className="connection-prompt">
          <div className="connection-content">
            <div className="neon-glow">🔐</div>
            <h2>Connect to Access Encrypted Investments</h2>
            <p>Join our exclusive FHE-protected investment club</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="fhe-spinner"></div>
        <p>Initializing FHE Encryption...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1 className="neon-title">Confidential Investment Club</h1>
          <p className="tagline">FHE 🔐 Protected Alpha Strategies</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="neon-btn create-btn"
          >
            + New Proposal
          </button>
          <button 
            onClick={handleCheckAvailable}
            className="neon-btn secondary"
          >
            Check FHE Status
          </button>
          <ConnectButton />
        </div>
      </header>

      <div className="main-content">
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search investments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neon-input"
            />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="neon-select"
            >
              <option value="all">All Categories</option>
              <option value="DAO">DAO</option>
              <option value="DeFi">DeFi</option>
              <option value="NFT">NFT</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>
          </div>
        </div>

        {renderStatsDashboard()}

        <div className="investments-section">
          <h2 className="section-title">Encrypted Investment Proposals</h2>
          
          <div className="investments-grid">
            {filteredInvestments.map((investment, index) => (
              <div 
                key={index}
                className="investment-card"
                onClick={() => setSelectedInvestment(investment)}
              >
                <div className="card-header">
                  <h3>{investment.name}</h3>
                  <span className={`status ${investment.isVerified ? 'verified' : 'pending'}`}>
                    {investment.isVerified ? '🔐 Verified' : '🔓 Pending'}
                  </span>
                </div>
                
                <div className="card-content">
                  <p>{investment.description}</p>
                  
                  <div className="investment-meta">
                    <div className="meta-item">
                      <span>Risk Level:</span>
                      <strong>{investment.riskLevel}/10</strong>
                    </div>
                    <div className="meta-item">
                      <span>Created:</span>
                      <strong>{new Date(investment.timestamp * 1000).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  {investment.isVerified && (
                    <div className="verified-amount">
                      💰 ${investment.decryptedValue.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <span className="creator">
                    by {investment.creator.substring(0, 6)}...{investment.creator.substring(38)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredInvestments.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💎</div>
              <h3>No investment proposals found</h3>
              <p>Create the first encrypted investment proposal</p>
              <button 
                className="neon-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Proposal
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-modal">
            <div className="modal-header">
              <h2>New Encrypted Investment</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="fhe-notice">
                <strong>FHE 🔐 Protection Active</strong>
                <p>Investment amount will be encrypted using Zama FHE technology</p>
              </div>

              <div className="form-group">
                <label>Proposal Name</label>
                <input
                  type="text"
                  value={newInvestmentData.name}
                  onChange={(e) => setNewInvestmentData({...newInvestmentData, name: e.target.value})}
                  className="neon-input"
                  placeholder="Enter proposal name..."
                />
              </div>

              <div className="form-group">
                <label>Investment Amount (FHE Encrypted)</label>
                <input
                  type="number"
                  value={newInvestmentData.amount}
                  onChange={(e) => setNewInvestmentData({...newInvestmentData, amount: e.target.value})}
                  className="neon-input"
                  placeholder="Enter amount..."
                />
                <div className="input-hint">Integer only - Will be FHE encrypted</div>
              </div>

              <div className="form-group">
                <label>Risk Level (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newInvestmentData.riskLevel}
                  onChange={(e) => setNewInvestmentData({...newInvestmentData, riskLevel: e.target.value})}
                  className="neon-input"
                />
                <div className="input-hint">Public data - visible to all members</div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newInvestmentData.description}
                  onChange={(e) => setNewInvestmentData({...newInvestmentData, description: e.target.value})}
                  className="neon-input"
                  placeholder="Describe the investment opportunity..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="neon-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={createInvestment}
                disabled={creatingInvestment || isEncrypting}
                className="neon-btn primary"
              >
                {creatingInvestment || isEncrypting ? "Encrypting..." : "Create Encrypted Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInvestment && (
        <div className="modal-overlay">
          <div className="detail-modal">
            <div className="modal-header">
              <h2>Investment Details</h2>
              <button onClick={() => setSelectedInvestment(null)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="investment-info">
                <h3>{selectedInvestment.name}</h3>
                <p>{selectedInvestment.description}</p>
                
                <div className="info-grid">
                  <div className="info-item">
                    <span>Creator:</span>
                    <strong>{selectedInvestment.creator}</strong>
                  </div>
                  <div className="info-item">
                    <span>Created:</span>
                    <strong>{new Date(selectedInvestment.timestamp * 1000).toLocaleString()}</strong>
                  </div>
                  <div className="info-item">
                    <span>Risk Level:</span>
                    <strong>{selectedInvestment.riskLevel}/10</strong>
                  </div>
                  <div className="info-item">
                    <span>Status:</span>
                    <strong className={selectedInvestment.isVerified ? 'verified' : 'pending'}>
                      {selectedInvestment.isVerified ? 'FHE Verified' : 'Pending Verification'}
                    </strong>
                  </div>
                </div>

                {renderInvestmentChart(selectedInvestment)}

                <div className="encrypted-section">
                  <h4>FHE Protected Data</h4>
                  <div className="encrypted-data">
                    {selectedInvestment.isVerified ? (
                      <div className="decrypted-value">
                        <span>Investment Amount: ${selectedInvestment.decryptedValue.toLocaleString()}</span>
                        <span className="badge verified">On-chain Verified</span>
                      </div>
                    ) : (
                      <div className="encrypted-value">
                        <span>Amount: 🔐 Encrypted</span>
                        <button 
                          onClick={() => decryptInvestment(selectedInvestment.id)}
                          disabled={isDecrypting}
                          className="neon-btn small"
                        >
                          {isDecrypting ? 'Decrypting...' : 'Verify Decryption'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {transactionStatus.visible && (
        <div className="transaction-toast">
          <div className={`toast-content ${transactionStatus.status}`}>
            <div className="toast-icon">
              {transactionStatus.status === "pending" && "⏳"}
              {transactionStatus.status === "success" && "✅"}
              {transactionStatus.status === "error" && "❌"}
            </div>
            <div className="toast-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

