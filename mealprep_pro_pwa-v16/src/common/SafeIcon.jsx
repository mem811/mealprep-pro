import React from 'react';
import * as FiIcons from 'react-icons/fi';
import { FiAlertTriangle } from 'react-icons/fi';

const SafeIcon = ({ icon: IconComponent, name, ...props }) => {
  try {
    if (IconComponent) return <IconComponent {...props} />;
    if (name) {
      const ResolvedIcon = FiIcons[name];
      if (ResolvedIcon) return <ResolvedIcon {...props} />;
    }
  } catch (e) {
    console.error('Icon rendering error:', e);
  }
  return <FiAlertTriangle {...props} />;
};

export default SafeIcon;