import { usePort } from "@plasmohq/messaging/hook";
import { useEffect, useState } from "react";


const useGlobalStorage = (tabId: Number | string, ...names: string[]) => {
    const listener = usePort("listener")

    // register as a listener of tabId results
    useEffect(() => {
        listener.send({
            cmd: "register",
            tabId: tabId
        });
    }, [tabId])

    // create state getter/setter for each name
    const stateVars = names.map(name => [...useState(null), name]);

    // whenever listener changes message, we know we got something new
    useEffect(() => {
        const data = listener.data;
        if (!data) return;
        stateVars.forEach(([_, setName, name]) => {
            if (data[name]) setName(data[name]);
        })
    }, [listener.data]);

    return stateVars.map(vars => vars[0]);
}


export { useGlobalStorage };