import { useEffect, useMemo, useState } from "react";
import { generateRandomHash } from "./misc";


const useGlobalStorage = (_tabId: Number | string, ...names: string[]) => {
    const [storageData, setStorageData] = useState({});
    const [isStorageSynced, setIsStorageSynced] = useState(false);
    const listenerId = useMemo(() => generateRandomHash(32), []);

    // register variables to listen to + apply updates
    useEffect(() => {
        if(!_tabId) return;

        // listen for changes
        const handleMessage = (message) => {
            if (message.action != "storage_listener_notify" || message.tabId !== _tabId || message.listenerId !== listenerId) return;

            setStorageData(prevData => {
                setIsStorageSynced(true);
                return {...prevData, ...message.update};
            });
        };
        chrome.runtime.onMessage.addListener(handleMessage);

        // register this component with the backend to listen for changes
        chrome.runtime.sendMessage({ action: "storage_listener_register", tabId: _tabId, variables: names, listenerId });

        // cleanup listener
        return () => chrome.runtime.onMessage.removeListener(handleMessage);

    }, [_tabId, names.join(','), listenerId]);

    // generate + update frontend value/setValue pairs
    const stateVars = names.map(name => {
        const [value, setValue] = useState(null);

        // update value when storageData changes
        useEffect(() => {
            if (name in storageData) {
                setValue(storageData[name]);
            }
        }, [storageData, name]);

        // setter function that can handle both values and update functions
        const updateValue = newValue => {
            setValue(prevValue => {
                // Determine whether newValue is a function and calculate the next value accordingly
                const nextValue = newValue instanceof Function ? newValue(prevValue) : newValue;

                // Send update to backend
                chrome.runtime.sendMessage({ action: "storage_variable_changed", tabId: _tabId, update: { [name]: nextValue } });
                return nextValue;
            });
        };

        return [value, updateValue];
    });

    // TODO: remove
    function setGlobalStorage(obj) {
        chrome.runtime.sendMessage({ action: "storage_variable_changed", tabId: _tabId, update: obj });
        setStorageData(prev => ({...prev, ...obj}))
    }

    return [...stateVars, [setGlobalStorage, isStorageSynced]];
};


export { useGlobalStorage };