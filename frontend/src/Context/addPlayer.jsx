import { createContext, useState, useContext } from "react";

const AddPlayerContext = createContext();

const AddPlayerProvider = ({ children }) => {
    const [addPlayer, setAddPlayer] = useState(false);

    return (
        <AddPlayerContext.Provider
            value={{
                addPlayer, setAddPlayer
            }}
        >
            {children}
        </AddPlayerContext.Provider>
    );
};

// Custom hook - makes it easier to use the context
// export const useAddPlayer = () => {
//     const context = useContext(AddPlayerContext);
//     if (!context) {
//         throw new Error("useAddPlayer must be used within AddPlayerProvider");
//     }
//     return context;
// };

export { AddPlayerContext, AddPlayerProvider };