import { createContext, useState, useContext } from "react";

const ShiftStatusContext = createContext();

const ShiftStatusProvider = ({ children }) => {
    const [shiftActive, setShiftActive] = useState(false);
    // const [pastShifts, setPastShifts] = useState([
    //     {
    //         id: 1,
    //         user: user.username,
    //         date: 'Aug 11, 2025',
    //         startTime: '1:30 a.m.',
    //         endTime: '1:38 a.m.',
    //         netProfit: '-$4.00',
    //         duration: '8 minutes',
    //     },
    // ]);
    return (
        <ShiftStatusContext.Provider
            value={{
                shiftActive, setShiftActive
            }}
        >
            {children}
        </ShiftStatusContext.Provider>
    );
};


export { ShiftStatusContext, ShiftStatusProvider };