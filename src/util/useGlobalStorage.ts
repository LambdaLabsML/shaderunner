import { usePort } from "@plasmohq/messaging/hook";
import { useEffect, useState } from "react";
import { generateRandomHash } from "./misc";




const useGlobalStorage = (_tabId: Number | string, ...names: string[]) => {
    const listener = usePort("listener")
    const controller = usePort("controller")
    const [_who] = useState(generateRandomHash(32))
    const [storageSynced, setStatus] = useState(false)

    // register as a listener of tabId results
    useEffect(() => {

        // wait for true _tabId if not initialized, yet
        if (!_tabId) return;

        listener.send({
            cmd: "register",
            tabId: _tabId
        });
    }, [_tabId])

    // create state getter/setter for each name
    const stateVarsReact = names.map(name => [...useState(null), name]);

    // whenever listener changes message, we know we got something new
    useEffect(() => {
        const data = listener.data;
        if (data !== undefined) setStatus(true);
        if (!data) return;
        if (data._who == _who) return;
        stateVarsReact.forEach(([_, setName, name]) => {
            if (name in data) setName(data[name]);
        })
    }, [listener.data]);

    const stateVars = stateVarsReact.map(([getName, setName, name]) => {

        // when saving, we also send the update to the controller
        function setWrapper(val: any) {
            setName(async old => {
                val = (typeof val === 'function') ? val(old) : val;
                controller.send({ [name]: val, _who, _tabId })
                return val;
            });
        }
        return [getName, setWrapper];
    });

    function setGlobalStorage(obj) {
        controller.send({ _tabId, ...obj })
    }

    return [...stateVars, [setGlobalStorage, storageSynced]];
}


export { useGlobalStorage };