import { create } from "zustand";

interface AuthState {
  userRole: string;
  agencyId: string;
  setUserRole: (role: string) => void;
  setAgencyId: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userRole: "",
  agencyId: "",
  setUserRole: (role) => set({ userRole: role }),
  setAgencyId: (id) => set({ agencyId: id }),
  logout: () => set({ userRole: "", agencyId: "" }),
}));
