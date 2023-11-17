import EditableText from "./EditableText";

const ClassModifierList = ({title, classList, onSubmit}) => {
    return (<div className="ClassModifier">
      <h4>{title}</h4>
      {
          classList.map((c, i) => ( <EditableText key={c} text={c} onSubmit={(c_new) => onSubmit(classList, c_new, i)}/> ))
      }
      <EditableText key={"new"+Math.random()} text={(<i>Add New</i>)} onSubmit={(c_new) => onSubmit(classList, c_new, -1)}/>
    </div>);
  };
  
export default ClassModifierList;