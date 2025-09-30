import { configureStore } from '@reduxjs/toolkit';

import { apiSlice } from '../api/api.slice';
import userReducer from './user.slice';
import filesSlice from './files.slice';

export const store = configureStore({
    reducer: {
        user: userReducer,
        files: filesSlice,
        [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
