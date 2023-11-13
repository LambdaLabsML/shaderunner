import React, { useState } from 'react';

const EditableText = ({ text, onSubmit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(typeof text == "object" ? "" : text);

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

  return (
    <div className="editable-text">
      {isEditing ? (
        <input
          type="text"
          value={editedText}
          onChange={handleInputChange}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <span onClick={handleTextClick}>{text}</span>
      )}
    </div>
  );
};

export default EditableText;