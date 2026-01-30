import { useState } from 'react';
import { VanillaPricing } from './pages/VanillaPricing';
import { CombinationPricing } from './pages/CombinationPricing';

type Module = 'vanilla' | 'combination';

function App() {
  const [module, setModule] = useState<Module>('vanilla');

  return (
    <div style={{ minHeight: '100vh', padding: '1rem 2rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a2e' }}>
          外汇期权计算器
        </h1>
        <nav style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setModule('vanilla')}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.875rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: module === 'vanilla' ? '#2563eb' : '#fff',
              color: module === 'vanilla' ? '#fff' : '#333',
              cursor: 'pointer',
            }}
          >
            Vanilla 定价
          </button>
          <button
            type="button"
            onClick={() => setModule('combination')}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.875rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: module === 'combination' ? '#2563eb' : '#fff',
              color: module === 'combination' ? '#fff' : '#333',
              cursor: 'pointer',
            }}
          >
            组合期权定价
          </button>
        </nav>
      </header>
      <div style={{ display: module === 'vanilla' ? 'block' : 'none' }}>
        <VanillaPricing />
      </div>
      <div style={{ display: module === 'combination' ? 'block' : 'none' }}>
        <CombinationPricing />
      </div>
    </div>
  );
}

export default App;
