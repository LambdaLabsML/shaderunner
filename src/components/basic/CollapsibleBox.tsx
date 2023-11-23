import React, { useState } from "react";

const CollapsibleBox = (props) => {
    const [open, setOpen] = useState(props.open ?? true);
    const toggleCollapse = () => setOpen(!open);

    return (
        <div className={`ShadeRunner ${props.className || ""}`}>
            <div className="header" onClick={toggleCollapse}>{props.title}</div>
            {open ? props.children : ""}
        </div>
    );
}

export default CollapsibleBox;