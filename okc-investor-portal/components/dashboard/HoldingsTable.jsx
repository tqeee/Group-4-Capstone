import React from 'react';

export default function HoldingsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Asset</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Shares</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          <tr>
            <td className="px-4 py-3 font-medium text-gray-900">Sample Asset A</td>
            <td className="px-4 py-3 text-gray-600">100</td>
            <td className="px-4 py-3 text-gray-600">$5,000.00</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
