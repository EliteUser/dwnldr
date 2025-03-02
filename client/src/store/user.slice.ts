import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type UserState = {
    userId: string | null;
};

const initialState: UserState = {
    userId: localStorage.getItem('userId') || null,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserId: (state, action: PayloadAction<string>) => {
            state.userId = action.payload;
            localStorage.setItem('userId', action.payload);
        },
        clearUserId: (state) => {
            state.userId = null;
            localStorage.removeItem('userId');
        },
    },
});

export const { setUserId } = userSlice.actions;
export default userSlice.reducer;
