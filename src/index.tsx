import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

console.log('Index.tsx: Script starting');
console.log('Index.tsx: Document ready state:', document.readyState);

const rootElement = document.getElementById('root');
console.log('Index.tsx: Root element:', rootElement);

if (!rootElement) {
  console.error('Index.tsx: Root element not found!');
} else {
  console.log('Index.tsx: Root element found, creating React root');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('Index.tsx: About to render App component');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('Index.tsx: App component rendered');
}

reportWebVitals();
