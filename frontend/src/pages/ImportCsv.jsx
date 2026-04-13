import { useCallback, useState } from 'react';
import api from '../api/client';
import { formatCurrency, formatNumber } from '../utils/format';

const BROKERS = [
  {
    id: 'degiro',
    label: 'DEGIRO',
    accept: '.csv',
    hint: 'Account CSV (Inbox → Activity → Account)',
    previewUrl: '/api/import/degiro/preview',
    confirmUrl: '/api/import/degiro/confirm',
    fileType: 'CSV',
  },
  {
    id: 'mexem',
    label: 'MEXEM',
    accept: '.xml',
    hint: 'Activity Flex Query XML (Performance & Reports → Flex Queries)',
    previewUrl: '/api/import/mexem/preview',
    confirmUrl: '/api/import/mexem/confirm',
    fileType: 'XML',
  },
];

export default function ImportCsv() {
  const [broker, setBroker] = useState(BROKERS[0]);
  const [state, setState] = useState('upload'); // upload | preview | confirmed
  const [file, setFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to import transactions');
    } finally {
      setLoading(false);
    }
  }, [file, broker]);

  const handleReset = useCallback(() => {
    setState('upload');
    setFile(null);
    setTransactions([]);
    setResult(null);
    setError(null);
  }, []);

  return (
    <div>
      <h1 className="page-title">Import</h1>

      <div className="broker-selector">
        {BROKERS.map((b) => (
          <button
            key={b.id}
            className={`broker-btn${broker.id === b.id ? ' broker-btn--active' : ''}`}
            onClick={() => handleBrokerChange(b)}
          >
            {b.label}
          </button>
        ))}
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
          <p className="drop-zone-hint">{broker.hint}</p>
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
              <button className="btn-secondary" onClick={handleReset}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={loading}
              >
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
          <p>
            {result.imported} transaction(s) imported, {result.skipped} skipped.
          </p>
          <button className="btn-primary" onClick={handleReset}>
            Import another file
          </button>
        </div>
      )}

      <style>{`
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .broker-selector {
          display: flex;
          gap: var(--spacing);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .broker-btn {
          background: var(--bg-card);
          color: var(--text-secondary);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 3);
          font-size: 13px;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }

        .broker-btn:hover {
          color: var(--text-primary);
        }

        .broker-btn--active {
          color: var(--accent-blue);
          border-color: var(--accent-blue);
          background: rgba(108, 140, 255, 0.08);
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
        }

        .drop-zone--active {
          border-color: var(--accent-blue);
          background: rgba(108, 140, 255, 0.05);
        }

        .drop-zone-hint {
          font-size: 11px;
          color: var(--text-muted);
          margin: calc(var(--spacing) * 0.5) 0 var(--spacing);
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
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 3);
          font-size: 13px;
          cursor: pointer;
        }

        .btn-secondary:hover { color: var(--text-primary); }

        .table-wrapper {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          overflow-x: auto;
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
          border-bottom: var(--border-card);
        }

        .data-table td {
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          border-bottom: var(--border-card);
          font-size: 13px;
        }

        .text-muted { color: var(--text-muted); }
        .text-positive { color: var(--positive); }
        .text-negative { color: var(--negative); }

        .success-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 6);
          text-align: center;
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
      `}</style>
    </div>
  );
}
