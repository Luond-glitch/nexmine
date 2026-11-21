import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);   // undefined = still checking the session
  useEffect(() => { api("/auth/me").then(setUser).catch(() => setUser(null)); }, []);
  const logout = async () => { await api("/auth/logout", { method: "POST" }); setUser(null); };
  return <Ctx.Provider value={{ user, setUser, logout }}>{children}</Ctx.Provider>;
}
