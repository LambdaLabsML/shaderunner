import { useState } from "react";

const CollapsibleBox = (props) => {
    const [collapsed, setCollapsed] = useState(true);

    const toggleCollapse = () => setCollapsed(!collapsed);

    if (!collapsed)
        return (<div><h3 onClick={toggleCollapse}>{props.title} (click to close)</h3>{props.children}</div>);

    return (<h3 onClick={toggleCollapse}>{props.title} (collapsed, click to open)</h3>);
};

export default CollapsibleBox;