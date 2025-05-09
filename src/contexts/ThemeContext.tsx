// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { PaletteMode, responsiveFontSizes } from '@mui/material';

// Define theme context type
interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try to get stored theme preference or use system preference
  const getInitialMode = (): PaletteMode => {
    const storedMode = localStorage.getItem('themeMode');
    
    if (storedMode === 'dark' || storedMode === 'light') {
      return storedMode;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  };
  
  const [mode, setMode] = useState<PaletteMode>(getInitialMode);
  
  // Toggle between light and dark modes
  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };
  
  // Save theme preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    
    // Update the data-theme attribute on the document for potential CSS selectors
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);
  
  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const storedMode = localStorage.getItem('themeMode');
      
      // Only update if user hasn't explicitly set a preference
      if (!storedMode) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    
    // Add event listener with compatibility check
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // For older browsers
      mediaQuery.addListener(handleChange);
    }
    
    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // For older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  
  // Create theme
  let theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#3f51b5',
        ...(mode === 'dark' && {
          main: '#5c6bc0', // Lighter shade in dark mode for better contrast
        }),
      },
      secondary: {
        main: '#f50057',
        ...(mode === 'dark' && {
          main: '#ff4081', // Lighter shade in dark mode
        }),
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      text: {
        primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
        secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      },
    },
    typography: {
      fontFamily: [
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      // モバイル向けのフォントサイズ調整
      fontSize: 14,
      htmlFontSize: 16,
      h5: {
        fontSize: '1.25rem', // 元の1.5remから小さく
      },
      h6: {
        fontSize: '1.125rem', // 元の1.25remから小さく
      },
      body1: {
        fontSize: '0.875rem', // 元の1remから小さく
      },
      body2: {
        fontSize: '0.75rem',  // 元の0.875remから小さく
      },
      button: {
        fontSize: '0.8125rem', // 元の0.875remから小さく
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s, color 0.3s',
            ...(mode === 'dark' && {
              scrollbarColor: '#6b6b6b #2b2b2b',
              '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                backgroundColor: '#2b2b2b',
              },
              '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                borderRadius: 8,
                backgroundColor: '#6b6b6b',
                minHeight: 24,
                border: '3px solid #2b2b2b',
              },
              '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
                backgroundColor: '#959595',
              },
              '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
                backgroundColor: '#959595',
              },
              '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#959595',
              },
              '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
                backgroundColor: '#2b2b2b',
              },
            }),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: mode === 'light' 
              ? '0 4px 6px rgba(0,0,0,0.1)' 
              : '0 4px 6px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.3s, box-shadow 0.3s',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '6px 12px',
          },
          sizeSmall: {
            padding: '4px 8px',
            fontSize: '0.75rem',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: mode === 'light' 
                ? 'rgba(0, 0, 0, 0.04)' 
                : 'rgba(255, 255, 255, 0.04)',
            },
          },
        },
      },
      // モバイル向けのコンポーネント調整を追加
      MuiIconButton: {
        styleOverrides: {
          root: {
            // タップ領域を広げる
            padding: '8px',
          },
          sizeSmall: {
            padding: '4px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem',
          },
          sizeSmall: {
            fontSize: '0.65rem',
            height: '24px',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          // モバイル向けにツールバーを小さく
          regular: {
            '@media (max-width: 600px)': {
              minHeight: '56px',
              padding: '0 8px',
            },
          },
        },
      },
    },
  });
  
  // フォントサイズをレスポンシブに調整
  theme = responsiveFontSizes(theme);
  
  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;