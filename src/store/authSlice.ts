import { deleteCookie, getCookie } from "@/utils/cookie";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type Theme = "light" | "dark" | "system_default";

// Full User interface for profile and auth
export interface Device {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  ip:string;
  loginDateTime: string;
  expirationDateTime: string;
  isCurrent: boolean;
}

export interface User {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  role: string;
  profilePicture?: string | null;
  isEnabled: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  loggedInDevices?: Device[];
  language?: string;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  theme?: Theme;
  push_notifications?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: string[] | null;
  theme: Theme;
}

const getInitialTheme = (): Theme => {
	const savedTheme = localStorage.getItem("theme") as Theme | null;
	return savedTheme && ["light", "dark", "system_default"].includes(savedTheme)
		? savedTheme
		: "system_default";
};

const initialState: AuthState = {
  token: getCookie("token"),
  user: null,
  permissions: null,
  theme: getInitialTheme(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{
        token?: string;
        user: any; 
        permissions?: string[] | null;
      }>,
    ) => {
      let userData = action.payload.user;
      if (userData && userData.settings) {
        userData = { ...userData, ...userData.settings };
      }

      if (action.payload.token) {
        state.token = action.payload.token;
      }
      state.user = userData;
      state.permissions = action.payload.permissions || null;

      if (userData.theme) {
        state.theme = userData.theme;
        localStorage.setItem("theme", userData.theme);
      }
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.permissions = null;
      deleteCookie("token");
    },
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      localStorage.setItem("theme", action.payload);
    },
  },
});

export const { setAuth, clearAuth, setTheme } = authSlice.actions;
export default authSlice.reducer;