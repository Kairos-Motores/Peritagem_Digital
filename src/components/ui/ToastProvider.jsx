import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ToastOverride.css'; // personalizações adicionais

export default function ToastProvider() {
  return (
    <ToastContainer
      position="bottom-center"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      transition={Slide}
      theme="colored"
      toastClassName="custom-toast"
      progressClassName="custom-progress"
      bodyClassName="custom-toast-body"
      closeButton={true}
      icon={false} // usaremos ícones próprios se quiser
    />
  );
}