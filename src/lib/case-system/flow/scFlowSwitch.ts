/**
 * THE NEW SMALL CLAIMS FLOW'S SWITCH (site owner, 26 Nov 2026). Off unless NEXT_PUBLIC_SC_FLOW_V2 is "on": the old screens
 * keep working until the new flow passes the journey matrix (checks 2, 3, 6 and 10 at zero, check 11 correct) on every
 * Small Claims story, signed in and as a guest who signs up. Switching it on, and deleting the old screens, is a later PR.
 */
export const SC_FLOW_V2 = process.env.NEXT_PUBLIC_SC_FLOW_V2 === "on";
