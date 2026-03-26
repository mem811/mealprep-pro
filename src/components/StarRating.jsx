import React, { useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiStar } = FiIcons;

export default function StarRating({ rating = 0, onRate, readonly = false, size = "md" }) {
  const [hover, setHover] = useState(0);

  const sizes = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-8 h-8"
  };

  const iconClass = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onRate && onRate(star)}
          className={`transition-all duration-200 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
        >
          <SafeIcon
            icon={FiStar}
            className={`${iconClass} ${
              star <= (hover || rating)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200 fill-transparent'
            }`}
          />
        </button>
      ))}
      {!readonly && rating > 0 && (
        <span className="ml-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
          {rating}/5
        </span>
      )}
    </div>
  );
}