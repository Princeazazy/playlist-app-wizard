import { memo } from 'react';

const StarField = memo(() => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {/* Layer 1 - Small stars */}
      <div className="stars-layer stars-small" />
      {/* Layer 2 - Medium stars */}
      <div className="stars-layer stars-medium" />
      {/* Layer 3 - Large twinkling stars */}
      <div className="stars-layer stars-large" />
    </div>
  );
});

StarField.displayName = 'StarField';

export default StarField;
