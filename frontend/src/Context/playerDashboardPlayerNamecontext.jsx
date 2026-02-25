import { createContext, useState, useContext } from "react";
import playersData from '../DemoData/players_data.json';

const PlayerDashboardPlayerNamecontext = createContext();

const PlayerDashboardPlayerNameProvider = ({ children }) => {
    const [playerDashboard, setPlayerDashboard] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');


    return (
        <PlayerDashboardPlayerNamecontext.Provider
            value={{
                playerDashboard, setPlayerDashboard,
                selectedPlayer, setSelectedPlayer
            }}
        >
            {children}
        </PlayerDashboardPlayerNamecontext.Provider>
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

export { PlayerDashboardPlayerNamecontext, PlayerDashboardPlayerNameProvider };