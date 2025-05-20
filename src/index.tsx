import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// デバッグログを削除
// console.log(`アプリケーション起動: ${new Date().toLocaleString()}`);
// console.log('キャッシュ機能が有効になりました');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// StrictModeのコメントアウトを解除
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
