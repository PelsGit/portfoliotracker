import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { formatCurrency, formatNumber } from '../utils/format';

const BROKERS = [
  {
    id: 'degiro',
    label: 'DEGIRO',
    accept: '.csv',
    previewUrl: '/api/import/degiro/preview',
    confirmUrl: '/api/import/degiro/confirm',
    fileType: 'CSV',
    color: '#00b057',
    steps: [
      'Log in at degiro.nl',
      'Navigate to Inbox → Activity',
      'Click the Account tab',
      'Set your desired date range',
      'Click Export and download the CSV file',
    ],
  },
  {
    id: 'mexem',
    label: 'MEXEM',
    accept: '.xml',
    previewUrl: '/api/import/mexem/preview',
    confirmUrl: '/api/import/mexem/confirm',
    fileType: 'XML',
    color: '#4f8ef7',
    steps: [
      'Log in at mexem.com',
      'Go to Performance & Reports',
      'Open Flex Queries',
      'Run your Activity Flex Query',
      'Download the XML file',
    ],
  },
];

function BrokerIcon({ broker, size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill={broker.color} fillOpacity="0.15" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={broker.color}
        fontSize="16"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {broker.label[0]}
      </text>
    </svg>
  );
}

export default function ImportCsv() {
  const [broker, setBroker] = useState(BROKERS[0]);
  const [state, setState] = useState('upload'); // upload | preview | confirmed
  const [file, setFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/api/transactions');
      setHistory(res.data);
    } catch {
      // silently ignore — history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleBrokerChange = useCallback((selected) => {
    setBroker(selected);
    setState('upload');
    setFile(null);
    setTransactions([]);
    setResult(null);
    setError(null);
  }, []);

  const handleFile = useCallback(
    async (selectedFile) => {
      setFile(selectedFile);
      setError(null);
      setLoading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await api.post(broker.previewUrl, formData);
        setTransactions(response.data.transactions);
        setState('preview');
      } catch (err) {
        setError(err.response?.data?.detail || `Failed to parse ${broker.fileType}`);
      } finally {
        setLoading(false);
      }
    },
    [broker]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile]
  );

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(broker.confirmUrl, formData);
      setResult(response.data);
      setState('confirmed');
      setHistoryLoading(true);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to import transactions');
    } finally {
      setLoading(false);
    }
  }, [file, broker, loadHistory]);

  const handleReset = useCallback(() => {
    setState('upload');
    setFile(null);
    setTransactions([]);
    setResult(null);
    setError(null);
  }, []);

  return (
    <div>
      <h1 className="page-title">Import Broker Actions</h1>

      {/* Broker cards */}
      <div className="broker-cards">
        {BROKERS.map((b) => (
          <button
            key={b.id}
            className={`broker-card${broker.id === b.id ? ' broker-card--active' : ''}`}
            onClick={() => handleBrokerChange(b)}
            style={broker.id === b.id ? { borderColor: b.color } : {}}
          >
            <BrokerIcon broker={b} />
            <span className="broker-card-label">{b.label}</span>
            <span className="broker-card-type">{b.fileType}</span>
          </button>
        ))}
      </div>

      {/* Step-by-step guide */}
      <div className="guide-card">
        <div className="guide-header">
          <BrokerIcon broker={broker} size={24} />
          <span className="guide-title">How to export from {broker.label}</span>
        </div>
        <ol className="guide-steps">
          {broker.steps.map((step, i) => (
            <li key={i} className="guide-step">
              <span className="guide-step-num">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {state === 'upload' && (
        <div
          className={`drop-zone${dragOver ? ' drop-zone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <p>Drag and drop your {broker.label} {broker.fileType} file here</p>
          <p className="drop-zone-sub">or</p>
          <label className="btn-primary">
            Browse files
            <input
              type="file"
              accept={broker.accept}
              onChange={handleInputChange}
              hidden
            />
          </label>
          {loading && <p className="loading-text">Parsing...</p>}
        </div>
      )}

      {state === 'preview' && (
        <div>
          <div className="preview-header">
            <span>{transactions.length} transaction(s) found</span>
            <div>
              <button className="btn-secondary" onClick={handleReset}>Cancel</button>
              <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>ISIN</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr key={i}>
                    <td>{new Date(txn.date).toLocaleDateString('nl-NL')}</td>
                    <td>{txn.product_name}</td>
                    <td className="text-muted">{txn.isin}</td>
                    <td className={Number(txn.quantity) < 0 ? 'text-negative' : ''}>
                      {formatNumber(txn.quantity, 0)}
                    </td>
                    <td>{formatCurrency(txn.price)}</td>
                    <td className={Number(txn.total) < 0 ? 'text-negative' : 'text-positive'}>
                      {formatCurrency(txn.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state === 'confirmed' && result && (
        <div className="success-card">
          <h2>Import complete</h2>
          <p>{result.imported} transaction(s) imported, {result.skipped} skipped.</p>
          <button className="btn-primary" onClick={handleReset}>Import another file</button>
        </div>
      )}

      {/* Transaction history */}
      <div className="history-section">
        <h2 className="history-title">All Imported Transactions</h2>
        {historyLoading ? (
          <p className="text-muted">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-muted">No transactions imported yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>ISIN</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {history.map((txn) => (
                  <tr key={txn.id}>
                    <td>{new Date(txn.date).toLocaleDateString('nl-NL')}</td>
                    <td>{txn.product_name}</td>
                    <td className="text-muted">{txn.isin}</td>
                    <td className={Number(txn.quantity) < 0 ? 'text-negative' : ''}>
                      {formatNumber(txn.quantity, 0)}
                    </td>
                    <td>{formatCurrency(txn.price)}</td>
                    <td className={Number(txn.total) < 0 ? 'text-negative' : 'text-positive'}>
                      {formatCurrency(txn.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .broker-cards {
          display: flex;
          gap: calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .broker-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing);
          background: var(--bg-card);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 2.5) calc(var(--spacing) * 4);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          min-width: 110px;
        }

        .broker-card:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .broker-card--active {
          background: rgba(255, 255, 255, 0.04);
        }

        .broker-card-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .broker-card-type {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .guide-card {
          background: var(--bg-card);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 2.5) calc(var(--spacing) * 3);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .guide-header {
          display: flex;
          align-items: center;
          gap: var(--spacing);
          margin-bottom: calc(var(--spacing) * 2);
        }

        .guide-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .guide-steps {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: calc(var(--spacing) * 1.25);
        }

        .guide-step {
          display: flex;
          align-items: center;
          gap: calc(var(--spacing) * 1.5);
          font-size: 12px;
          color: var(--text-secondary);
        }

        .guide-step-num {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .error-banner {
          background: var(--negative-bg);
          color: var(--negative);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          border-radius: var(--radius);
          margin-bottom: calc(var(--spacing) * 2);
          font-size: 13px;
        }

        .drop-zone {
          background: var(--bg-card);
          border: 2px dashed rgba(255, 255, 255, 0.12);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 8);
          text-align: center;
          color: var(--text-secondary);
          cursor: pointer;
          margin-bottom: calc(var(--spacing) * 4);
        }

        .drop-zone--active {
          border-color: var(--accent-blue);
          background: rgba(108, 140, 255, 0.05);
        }

        .drop-zone-sub {
          margin: var(--spacing) 0;
          color: var(--text-muted);
          font-size: 12px;
        }

        .loading-text {
          margin-top: calc(var(--spacing) * 2);
          color: var(--accent-blue);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: calc(var(--spacing) * 2);
          color: var(--text-secondary);
        }

        .preview-header div {
          display: flex;
          gap: var(--spacing);
        }

        .btn-primary {
          background: var(--accent-blue);
          color: #fff;
          border: none;
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 3);
          font-size: 13px;
          cursor: pointer;
        }

        .btn-primary:hover { opacity: 0.9; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-secondary {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 3);
          font-size: 13px;
          cursor: pointer;
        }

        .btn-secondary:hover { color: var(--text-primary); }

        .table-wrapper {
          background: var(--bg-card);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius);
          overflow-x: auto;
          margin-bottom: calc(var(--spacing) * 4);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          text-align: left;
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .data-table td {
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 13px;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .text-muted { color: var(--text-muted); }
        .text-positive { color: var(--positive); }
        .text-negative { color: var(--negative); }

        .success-card {
          background: var(--bg-card);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 6);
          text-align: center;
          margin-bottom: calc(var(--spacing) * 4);
        }

        .success-card h2 {
          font-size: 17px;
          font-weight: 500;
          margin-bottom: var(--spacing);
          color: var(--positive);
        }

        .success-card p {
          color: var(--text-secondary);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .history-section {
          margin-top: calc(var(--spacing) * 2);
        }

        .history-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 2);
        }
      `}</style>
    </div>
  );
}
