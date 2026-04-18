import { formatCurrency, formatPercent } from '../utils/format';

export default function BreakdownTable({ data }) {
  if (!data?.length) return null;

  return (
    <div className="breakdown-table-card">
      <table className="breakdown-table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="text-right">Value</th>
            <th className="text-right">Weight</th>
            <th className="text-right">Holdings</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.name}>
              <td className="breakdown-name">{item.name}</td>
              <td className="text-right">{formatCurrency(item.value)}</td>
              <td className="text-right">{formatPercent(item.weight)}</td>
              <td className="text-right">{item.holdings_count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .breakdown-table-card {
          overflow: hidden;
        }

        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
        }

        .breakdown-table th {
          font-size: var(--text-xs);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-muted);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          text-align: left;
        }

        .breakdown-table td {
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          border-top: 1px solid var(--border-row);
          font-size: var(--text-base);
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }

        .breakdown-table .text-right {
          text-align: right;
        }

        .breakdown-name {
          color: var(--text-primary);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
