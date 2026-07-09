import './LoadingScreen.css';

export default function LoadingScreen({ message = 'Carregando' }) {
  return (
    <div className="loading-container">
      <div className="loading-message">{message}</div>
      <div className="dots-container">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}