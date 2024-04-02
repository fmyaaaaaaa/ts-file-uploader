import React, {useRef, useState} from "react";
import {Button, LinearProgress, Card, CardContent, Typography, Paper, styled} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from "axios";

const CHUNK_SIZE = 1024 * 1024;

const ProgressPaper = styled(Paper)(({ theme }) => ({
    width: 480,
    height: 60,
    ...theme.typography.body2,
    textAlign: 'center',
}));

const status = {
    NONE: 0,
    IS_UPLOADING: 1,
    IS_UPLOADED: 2,
    ERROR: 3
}

const FileUploader: React.FC = () => {
    const [fileName, setFileName] = useState<string>('');
    const [uploadStatus, setUploadStatus] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const makeProgress = (chunkCount: number) => {
        setUploadProgress(prev => {
            const total = prev + 100/chunkCount;
            return total >= 100 ? 100 : total;
        })
    }

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setFileName(files[0].name);
        } else {
            return;
        }

        const file = files[0];
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        setUploadStatus(status.IS_UPLOADING);
        for (let index = 0; index < totalChunks; index++) {
            makeProgress(totalChunks);
            const chunk = file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
            await uploadChunk(chunk, file.name, index + 1, totalChunks);
        }

        await notifyUploadComplete(file.name);
    };

    async function uploadChunk(chunk: Blob, fileName: string, chunkNumber: number, totalChunks: number) {
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('originalName', fileName);
        formData.append('chunkNumber', chunkNumber.toString());
        formData.append('totalChunks', totalChunks.toString());

        try {
            await axios.post(`${process.env.REACT_APP_REST_API_URL}/tsfile/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
        } catch (error) {
            console.error("Error uploading chunk: ", error);
        }
    }

    async function notifyUploadComplete(fileName: string) {
        try {
            const body = {fileName: fileName}
            const response = await axios.post(`${process.env.REACT_APP_REST_API_URL}/tsfile/validation`, body, {
                    headers: {
                        "Content-Type": "application/json"
                    }
            });
            if (response.data.result) {
                setUploadStatus(status.IS_UPLOADED);
            } else {
                setUploadStatus(status.ERROR);
                setErrorMessage(response.data.message);
            }
        } catch (error) {
            console.error("Error notifying server: ", error);
        }
    }

    const handleClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const renderProgressStatusText = () => {
        switch (uploadStatus) {
            case status.NONE:
                return "";
            case status.IS_UPLOADING:
                return <Typography sx={{ fontSize: 12 }} color="text.secondary" component="span">is verifying....</Typography>;
            case status.IS_UPLOADED:
                return <Typography sx={{ fontSize: 12 }} color="text.secondary" component="span">is verified</Typography>;
            case status.ERROR:
                return <Typography sx={{ fontSize: 12 }} color="red" component="span">has problem...</Typography>;
            default:
                return "";
        }
    }

    const renderResultText = () => {
        switch (uploadStatus) {
            case status.IS_UPLOADED:
                return <Typography sx={{ fontSize: 12 }} color="green" component="span">Success: Your uploaded file are valid.</Typography>;
            case status.ERROR:
                return <Typography sx={{ fontSize: 12 }} color="red" component="span">{errorMessage}</Typography>;
            default:
                return <Typography />;
        }
    }

    return (
        <Card sx={{ minWidth: 500 }}>
            <CardContent>
                <Typography variant="h6">
                    You can verify ts media file
                </Typography>
                <Typography sx={{ fontSize: 12 }} color="text.secondary">
                    CLICK ON THE BUTTON TO VERIFY FILES
                </Typography>
                <div style={{marginTop: 20}}>
                    <input
                        type="file"
                        style={{display: 'none'}}
                        onChange={handleFileChange}
                        ref={fileInputRef}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleClick}
                        startIcon={<CloudUploadIcon/>}
                    >
                        Upload File
                    </Button>
                </div>
                <div style={{marginTop: 15}}>
                    <ProgressPaper>
                        <div style={{textAlign: "start", marginLeft: 20, paddingTop: 10}}>
                            <Typography sx={{ fontSize: 12 }} color="text.secondary" >
                                File: {fileName &&
                                <Typography sx={{ fontSize: 12 }} style={{fontWeight: "bold"}} component="span">
                                    {fileName + " "}
                                </Typography>}

                                {renderProgressStatusText()}
                            </Typography>
                        </div>
                        <div>
                            <div style={{marginRight: 30, marginLeft: 30, marginTop: 15 }}>
                                {
                                    uploadStatus !== status.NONE ? <LinearProgress variant="determinate" value={uploadProgress}/> : ""
                                }
                            </div>
                        </div>
                    </ProgressPaper>
                </div>
                <div style={{marginTop: 5, marginLeft: 15, textAlign: "start"}}>
                    {renderResultText()}
                </div>
            </CardContent>
        </Card>
    );
};

export default FileUploader;