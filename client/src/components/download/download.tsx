import { useState, useEffect, memo, useCallback } from 'react';
import { TextInput, Button, Icon, TextArea, Label, Progress } from '@gravity-ui/uikit';
import { useGetTracksQuery } from '../../api/api.slice';
import { ArrowShapeDownToLine } from '@gravity-ui/icons';

import styles from './download.module.scss';

type DownloadProps = {
    selectedUrl?: string;
};

export const Download = memo<DownloadProps>((props) => {
    const { selectedUrl } = props;

    const [url, setUrl] = useState(selectedUrl || '');
    const [name, setName] = useState('');
    const [album, setAlbum] = useState('');
    const [lyrics, setLyrics] = useState('');

    const [progress, setProgress] = useState(0);
    const [inProgress, setInProgress] = useState(false);

    const { data: track, isFetching } = useGetTracksQuery(url, { skip: !url });

    useEffect(() => {
        setUrl(selectedUrl || '');
    }, [selectedUrl]);

    useEffect(() => {
        if (track && !isFetching) {
            setName(`${track.user.username} - ${track.title}`);
        }
    }, [track, isFetching]);

    const handleDownload = useCallback(async () => {
        if (!url || !name) {
            return;
        }

        setInProgress(true);

        const body = {
            url,
            name,
            ...(album && { album }),
            ...(lyrics && { lyrics }),
        };

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/octet-stream',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Failed to download track: ${response.statusText}`);
            }

            const totalSize = parseInt(response.headers.get('content-length') ?? '0');
            const fileName =
                response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `${name}.mp3`;

            const reader = response.body?.getReader();

            let receivedSize = 0;
            const chunks = [];

            while (true) {
                const { done, value } = await reader!.read();

                if (done) {
                    const blob = new Blob(chunks);
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');

                    a.href = downloadUrl;
                    a.download = fileName;
                    a.click();
                    window.URL.revokeObjectURL(downloadUrl);

                    break;
                }

                chunks.push(value);
                receivedSize += value.length;

                const percentage = (receivedSize / totalSize) * 100;

                setProgress(percentage);
            }
        } catch (error) {
            console.error('Error downloading track:', error);
            alert('Failed to download the track');
        } finally {
            setInProgress(false);
            setProgress(0);
        }
    }, [album, lyrics, name, url]);

    return (
        <div className={styles.download}>
            <TextInput
                startContent={
                    <Label className={styles.label} theme='normal' size='m'>
                        URL
                    </Label>
                }
                size='xl'
                hasClear
                value={url}
                onChange={(evt) => setUrl(evt.target.value)}
                placeholder='Enter track URL'
            />

            <TextInput
                startContent={
                    <Label className={styles.label} theme='normal' size='m'>
                        Name
                    </Label>
                }
                size='xl'
                hasClear
                value={name}
                onChange={(evt) => setName(evt.target.value)}
                placeholder='Track name'
            />

            <TextInput
                size='xl'
                hasClear
                value={album}
                onChange={(evt) => setAlbum(evt.target.value)}
                placeholder='Album (optional)'
            />

            <TextArea
                size='xl'
                hasClear
                value={lyrics}
                onChange={(evt) => setLyrics(evt.target.value)}
                placeholder='Lyrics (optional)'
                minRows={4}
                controlProps={{ style: { resize: 'vertical' } }}
            />

            <Button size='xl' view='action' onClick={handleDownload} disabled={inProgress || !url || !name}>
                <Icon size={16} data={ArrowShapeDownToLine} /> Download
            </Button>

            {inProgress && <Progress size='xs' theme='warning' value={progress} />}
        </div>
    );
});
