

const SwitchInput = ({ label, options, selected, onChange }) => (
  <div className="setting-item">
    <label>{label}</label>
    <div className="switch-options">
      {options.map((option) => (
        <button
          key={option}
          className={`switch-option ${selected === option ? 'active' : ''}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

export default SwitchInput;