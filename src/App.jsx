import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import { InspecaoProvider } from './contexts/InspecaoContext';
import { OfflineProvider } from './contexts/OfflineContext'; // ← NOVO
import ToastProvider from './components/ui/ToastProvider';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SyncProvider>
          <InspecaoProvider>
            <OfflineProvider>   {/* ← ENVOLVE A APLICAÇÃO */}
              <ToastProvider />
              <AppRoutes />
            </OfflineProvider>
          </InspecaoProvider>
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;