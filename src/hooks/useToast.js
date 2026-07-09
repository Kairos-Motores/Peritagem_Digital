import { toast } from 'react-toastify';

export function useToast() {
  const success = (msg) => toast.success(msg);
  const error = (msg) => toast.error(msg);
  const info = (msg) => toast.info(msg);
  const warning = (msg) => toast.warning(msg);
  const loading = (msg) => toast.loading(msg);
  const dismiss = () => toast.dismiss();

  return { success, error, info, warning, loading, dismiss };
}