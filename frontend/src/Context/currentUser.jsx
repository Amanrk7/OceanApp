import { createContext, useState, useContext } from "react";

const CurrentUserContext = createContext();

const CurrentUserProvider = ({ children }) => {
    const [usr, setUsr] = useState(null);


    return (
        <CurrentUserContext.Provider
            value={{
                usr, setUsr
            }}
        >
            {children}
        </CurrentUserContext.Provider>
    );
};


export { CurrentUserContext, CurrentUserProvider };