import { atom } from "jotai";

// Forky AI assistant modal open/closed for the public site. Read by
// ClientLayout, ForkyButton (opens) and ForkyModal (closes).
export const forkyOpenAtom = atom(false);
