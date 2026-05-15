// import { createContext, useState, useContext } from "react";

// const CurrentUserContext = createContext();

// const CurrentUserProvider = ({ children }) => {
//     const [usr, setUsr] = useState(null);


//     return (
//         <CurrentUserContext.Provider
//             value={{
//                 usr, setUsr
//             }}
//         >
//             {children}
//         </CurrentUserContext.Provider>
//     );
// };


// export { CurrentUserContext, CurrentUserProvider };

// Context/currentUser.jsx
import { createContext, useState, useContext } from "react";
const CurrentUserContext = createContext();

const CurrentUserProvider = ({ children }) => {
    const [usr, setUsr] = useState(null);
    
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(usr?.role);
    const isTeamMember = ['TEAM1', 'TEAM2', 'TEAM3', 'TEAM4'].includes(usr?.role);
    
    return (
        <CurrentUserContext.Provider value={{ usr, setUsr, isAdmin, isTeamMember }}>
            {children}
        </CurrentUserContext.Provider>
    );
};

export { CurrentUserContext, CurrentUserProvider };
