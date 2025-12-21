import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

import { Soundcloud } from 'soundcloud.ts';

import { APP_PORT } from './constants';
import { downloadTrack, getTrackData, removeFolder } from './utils';

const app = express();

const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const staticPath = isProduction
    ? path.join(__dirname, '../../../client/dist')
    : path.join(__dirname, '../../client/dist');

app.use(express.static(staticPath));
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173/' }));

const soundcloud = new Soundcloud();

app.get('/api/users', async (req, res) => {
    console.info('GET /users', req.query);

    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).send('userId is required');
        }

        const user = await soundcloud.users.getAlt(userId as string);

        if (!user) {
            return res.status(400).send(`User with id ${userId} not found`);
        }

        res.send(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching user info');
    }
});

app.get('/api/tracks', async (req, res) => {
    console.info('GET /tracks', req.query);

    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).send('Track URL is required');
        }

        const track = await soundcloud.tracks.get(url as string);

        res.send(getTrackData(track));
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching track info');
    }
});

app.get('/api/favorites', async (req, res) => {
    console.info('GET /favorites', req.query);

    try {
        const { userId, limit } = req.query as any;

        if (!userId) {
            return res.status(400).send('userId is required');
        }

        const user = await soundcloud.users.getAlt(userId);

        if (!user) {
            return res.status(400).send(`User with id ${userId} not found`);
        }

        const favorites = await soundcloud.users.likes(user?.id, limit);

        const processed = favorites?.map((original) => {
            return getTrackData(original);
        });

        res.send(processed);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching favorites');
    }
});

app.post('/api/download', async (req, res) => {
    console.info('POST /download', req.body);

    const { url, name, album, lyrics } = req.body;

    try {
        if (!url) {
            return res.status(400).send('URL is required');
        }

        const { path: trackPath, folder } = await downloadTrack(soundcloud, { url, name, album, lyrics });

        if (!trackPath || !fs.existsSync(trackPath)) {
            return res.status(404).send('File not found');
        }

        const stat = fs.statSync(trackPath);
        const fileSize = stat.size;
        const fileName = path.basename(trackPath);

        res.setHeader('Content-Length', fileSize);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const readStream = fs.createReadStream(trackPath);

        readStream.on('error', (err) => {
            console.error('Stream error:', err);
            res.status(500).send('Error streaming file');
        });

        readStream.on('end', () => {
            if (folder) {
                setTimeout(() => {
                    removeFolder(folder);
                }, 30000);
            }
        });

        readStream.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error downloading track');
    }
});

app.listen(APP_PORT, () => {
    console.info(`Server running at http://localhost:${APP_PORT}`);
});
