import Dashboard from './pages/Dashboard';
import { Toaster, toast } from 'sonner';
import { Button } from './components/common/Button';
import { BellRing } from 'lucide-react';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <Button 
          icon={<BellRing size={16} />} 
          onClick={() => toast.success('Thông báo test thành công!')}
        >
          Test Toast
        </Button>
        <Button variant="danger" onClick={() => toast.error('Lỗi mẫu hiển thị!')}>
          Lỗi Demo
        </Button>
      </div>

      <Dashboard />
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default App;
