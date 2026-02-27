const TX_TZ = "America/Chicago";

/** "Jan 15, 2025" */
export function fmtTXDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        timeZone: TX_TZ,
        month: "short", day: "numeric", year: "numeric",
    });
}

/** "Jan 15, 2025, 3:42 PM" */
export function fmtTX(date) {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
        timeZone: TX_TZ,
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
    });
}

/** "3:42 PM" only */
export function fmtTXTime(date) {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString("en-US", {
        timeZone: TX_TZ,
        hour: "numeric", minute: "2-digit",
    });
}