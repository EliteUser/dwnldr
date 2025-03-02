import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

type UserResult = {
    avatar_url: string;
    full_name: string;
};

type TracksResult = {
    id: number;
    artwork_url: string;
    permalink_url: string;
    title: string;
    user: {
        username: string;
    };
};

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    endpoints: (builder) => ({
        getUser: builder.query<UserResult, string>({
            query: (userId) => ({
                url: 'users',
                params: { userId },
            }),
        }),
        getTracks: builder.query<TracksResult, string>({
            query: (url) => ({
                url: 'tracks',
                params: { url },
            }),
        }),
        getFavorites: builder.query<TracksResult[], string>({
            query: (userId) => ({
                url: 'favorites',
                params: { userId },
            }),
        }),
    }),
});

export const { useGetUserQuery, useGetTracksQuery, useGetFavoritesQuery } = apiSlice;
