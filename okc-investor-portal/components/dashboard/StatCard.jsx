import React from 'react';

export default function StatCard({ title, label, value, sub, description, icon, positive }) {
  // Use label if title is missing, and sub if description is missing
  const cardHeading = label || title;
  const cardSubtitle = sub || description;

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {/* Displays uppercase headings */}
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
          {cardHeading}
        </span>
        {icon && <span className="text-gray-400 text-lg">{icon}</span>}
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        
        {/* Displays green positive change subtitles */}
        {cardSubtitle && (
          <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-gray-500'}`}>
            {cardSubtitle}
          </span>
        )}
      </div>
    </div>
  );
}
