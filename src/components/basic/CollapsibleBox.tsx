import React, { useState } from "react";

const CollapsibleBox = (props) => {
    const [open, setOpen] = useState(props.open ?? true);
    const toggleCollapse = () => setOpen(!open);

    return (
        <div className={`CollapsibleBox ${props.className || ""}`}>
            <div className="header" onClick={toggleCollapse}>{props.title}</div>
            {open ? props.children : ""}
        </div>
    );
}

export default CollapsibleBox;