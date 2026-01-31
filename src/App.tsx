import { useState } from 'react';
import { VanillaPricing } from './pages/VanillaPricing';
import { CombinationPricing } from './pages/CombinationPricing';
import { DigitalPricing } from './pages/DigitalPricing';

type Module = 'vanilla' | 'combination' | 'digital';

const navBtn = (mod: Module, current: Module) => ({
  padding: '0.4rem 0.8rem',
  fontSize: '0.875rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  background: current === mod ? '#2563eb' : '#fff',
  color: current === mod ? '#fff' : '#333',
  cursor: 'pointer' as const,
});

function App() {
  const [module, setModule] = useState<Module>('vanilla');

  return (
    <div style={{ minHeight: '100vh', padding: '1rem 2rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a2e' }}>
          外汇期权计算器
        </h1>
        <nav style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setModule('vanilla')} style={navBtn('vanilla', module)}>
            Vanilla 定价
          </button>
          <button type="button" onClick={() => setModule('digital')} style={navBtn('digital', module)}>
            数字期权定价
          </button>
          <button type="button" onClick={() => setModule('combination')} style={navBtn('combination', module)}>
            组合期权定价
          </button>
        </nav>
      </header>
      <div style={{ display: module === 'vanilla' ? 'block' : 'none' }}>
        <VanillaPricing />
      </div>
      <div style={{ display: module === 'digital' ? 'block' : 'none' }}>
        <DigitalPricing />
      </div>
      <div style={{ display: module === 'combination' ? 'block' : 'none' }}>
        <CombinationPricing />
      </div>
    </div>
  );
}

export default App;
