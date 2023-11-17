
const NumericInput = ({ label, value, step, onChange }) => (
    <div className="setting-item">
        <label>{label}</label>
        <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
);

export default NumericInput;