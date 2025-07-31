import React from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent } from './card';

const LoadingOverlay = ({ 
  isLoading, 
  message = 'Loading...', 
  children,
  className = '',
  showSpinner = true 
}) => {
  if (!isLoading) {
    return children;
  }

  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          {showSpinner && <Activity className="h-4 w-4 animate-spin" />}
          <span>{message}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingButton = ({ 
  isLoading, 
  children, 
  loadingText = 'Loading...', 
  className = '',
  ...props 
}) => {
  return (
    <button 
      {...props} 
      disabled={isLoading || props.disabled}
      className={`${className} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 animate-spin" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  );
};

const LoadingSpinner = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <Activity className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

export { LoadingOverlay, LoadingButton, LoadingSpinner }; 