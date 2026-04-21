import { createContext, useState } from "react";
const App2Context = createContext();

const App2Provider = ({ children }) => {
    const [currentStoreId, setCurrentStoreId] = useState(1);
    const [activeStoreIds, setActiveStoreIds] = useState([1]); // stores user is actively working on
    const [storeSelectionDone, setStoreSelectionDone] = useState(false);

    const isStore2 = currentStoreId === 2;
    const setIsStore2 = (val) => setCurrentStoreId(val ? 2 : 1);

    return (
        <App2Context.Provider value={{
            isStore2, setIsStore2,
            currentStoreId, setCurrentStoreId,
            activeStoreIds, setActiveStoreIds,
            storeSelectionDone, setStoreSelectionDone,
        }}>
            {children}
        </App2Context.Provider>
    );
};
export { App2Context, App2Provider };
