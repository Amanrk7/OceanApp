import { createContext, useState, useContext } from "react";

const App2Context = createContext();

const App2Provider = ({ children }) => {
    const [isStore2, setIsStore2] = useState(false);

    return (
        <App2Context.Provider
            value={{
                isStore2, setIsStore2
            }}
        >
            {children}
        </App2Context.Provider>
    );
};

export { App2Context, App2Provider };