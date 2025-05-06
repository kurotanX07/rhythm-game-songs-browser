// src/components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon, BugReport as BugReportIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Custom error handling logic
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // You could also log to an error reporting service here
    // Example: reportErrorToService(error, errorInfo);
  }

  private handleRefresh = () => {
    // Reset the error state and try re-rendering
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            m: 2, 
            maxWidth: 600, 
            mx: 'auto', 
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          <BugReportIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          
          <Typography variant="h5" color="error" gutterBottom>
            エラーが発生しました
          </Typography>
          
          <Typography variant="body1" paragraph>
            申し訳ありませんが、問題が発生しました。以下のオプションを試してください：
          </Typography>
          
          <Box sx={{ my: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<RefreshIcon />}
              onClick={this.handleRefresh}
              sx={{ mr: 2 }}
            >
              再試行
            </Button>
            
            <Button 
              variant="outlined"
              href="/"
            >
              ホームに戻る
            </Button>
          </Box>
          
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <Box sx={{ mt: 4, textAlign: 'left', bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" color="error">
                エラー詳細（開発環境のみ表示）:
              </Typography>
              <Typography variant="body2" component="pre" sx={{ overflow: 'auto', maxHeight: 200 }}>
                {this.state.error.toString()}
              </Typography>
              {this.state.errorInfo && (
                <Typography variant="body2" component="pre" sx={{ overflow: 'auto', maxHeight: 300, mt: 2, fontSize: '0.75rem' }}>
                  {this.state.errorInfo.componentStack}
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;