import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiActivity, FiZap, FiTarget, FiPieChart } = FiIcons;

export default function NutritionDisplay({ nutrition }) {
  if (!nutrition) return null;

  const { calories = 0, protein = 0, carbs = 0, fat = 0 } = nutrition;

  const macros = [
    { label: 'Protein', value: protein, unit: 'g', color: 'text-blue-600', bg: 'bg-blue-50', icon: FiTarget },
    { label: 'Carbs', value: carbs, unit: 'g', color: 'text-amber-600', bg: 'bg-amber-50', icon: FiZap },
    { label: 'Fat', value: fat, unit: 'g', color: 'text-rose-600', bg: 'bg-rose-50', icon: FiPieChart },
  ];

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
          <SafeIcon icon={FiActivity} className="text-emerald-500" />
          Nutrition Facts
        </h3>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Per Serving</span>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-black text-gray-900">{calories}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Calories</p>
          </div>
          <div className="h-12 w-px bg-gray-100" />
          <div className="flex gap-4">
            {macros.map((macro) => (
              <div key={macro.label} className="text-center">
                <p className={`text-lg font-bold ${macro.color}`}>{macro.value}{macro.unit}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{macro.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 h-2 rounded-full overflow-hidden bg-gray-100">
          <div 
            className="bg-blue-500 transition-all duration-1000" 
            style={{ width: `${(protein / (protein + carbs + fat || 1)) * 100}%` }} 
          />
          <div 
            className="bg-amber-500 transition-all duration-1000" 
            style={{ width: `${(carbs / (protein + carbs + fat || 1)) * 100}%` }} 
          />
          <div 
            className="bg-rose-500 transition-all duration-1000" 
            style={{ width: `${(fat / (protein + carbs + fat || 1)) * 100}%` }} 
          />
        </div>
      </div>
    </div>
  );
}