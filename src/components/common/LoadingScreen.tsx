import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <div>Loading Virtual Tour...</div>
    </div>
  );
};

export default LoadingScreen;
