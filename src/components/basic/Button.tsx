const Button = ({ children, onClick }) => (
  <div className="setting-item">
    <div className="switch-options">
        <button
          className={`switch-option active`}
          onClick={() => onClick()}
        >
          {children}
        </button>
    </div>
  </div>
);

export default Button;