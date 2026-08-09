import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loader-ring">
        <div className="loader-logo">
          <img src="/logo.png?v=2" alt="FinSmart" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
