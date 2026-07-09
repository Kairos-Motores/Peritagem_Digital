import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import { InspecaoProvider } from './contexts/InspecaoContext';
import ToastProvider from './components/ui/ToastProvider';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
          <InspecaoProvider>
            <ToastProvider />
            <AppRoutes />
          </InspecaoProvider>
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;