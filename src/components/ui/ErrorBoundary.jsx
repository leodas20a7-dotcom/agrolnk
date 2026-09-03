import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Button from './Button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Agrolnk Render Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/dashboard';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAF8] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#E5EDE8] shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0B3326] font-heading">
                Unable to load this view
              </h2>
              <p className="text-xs text-[#566861] mt-1.5 leading-relaxed">
                An unexpected display error occurred while rendering this module.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="accent"
                size="sm"
                icon={RotateCcw}
                onClick={this.handleReset}
                className="w-full sm:w-auto font-bold text-xs"
              >
                Reload View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Home}
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.hash = '#/landing';
                  window.location.reload();
                }}
                className="w-full sm:w-auto text-xs"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
