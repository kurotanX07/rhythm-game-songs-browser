import React from 'react';

const TestHome: React.FC = () => {
  console.log('TestHome: Component rendering');
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#e0e0e0',
      border: '2px solid #ff0000',
      margin: '10px 0'
    }}>
      <h2 style={{ color: '#000', fontSize: '20px', margin: '0 0 10px 0' }}>テスト用簡単なホーム</h2>
      <p style={{ color: '#000', fontSize: '16px' }}>このテキストが表示されていれば、Reactコンポーネントは正常に動作しています。</p>
      <ul style={{ color: '#000', fontSize: '14px' }}>
        <li>Capacitor: 正常</li>
        <li>React: 正常</li>
        <li>レンダリング: 正常</li>
      </ul>
    </div>
  );
};

export default TestHome;