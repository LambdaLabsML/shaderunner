import React, { useEffect, useState } from 'react';

const EditableText = ({ text, onSubmit, wrapped=true, editable=undefined }) => {
  const [isEditing, setIsEditing] = useState(editable);
  const [editedText, setEditedText] = useState(typeof text == "object" ? "" : text);

  useEffect(() => {
    if (editable !== undefined)
      setIsEditing(editable)
  }, [editable]);

  const handleTextClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (e) => {
    setEditedText(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onSubmit(editedText);
  };

  const handleEnter = (ev) => {
    if (ev.keyCode == 13 && ev.shiftKey == false) {
      ev.preventDefault(); 
      onSubmit(editedText);
    }
  };

  // note: we dont want edits on the text if parent component has set edit mode themselves
  const textHtml = isEditing ? (
    <input
      type="text"
      value={editedText}
      onKeyDown={handleEnter}
      onChange={handleInputChange}
      onBlur={handleBlur}
      autoFocus
    />
  ) : (
    <span onClick={editable === undefined ? handleTextClick : null}>{text}</span>
  );

  if (!wrapped)
    return textHtml;

  return (
    <div className="editable-text">
      {textHtml}
    </div>
  );
};

export default EditableText;