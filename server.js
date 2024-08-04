const express = require('express');
const fs = require('fs');
const path = require('path');

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const uploadDetailsFile = path.join(__dirname, 'app', 'uploads_details_server_use_only.json');


// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);


const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

// Serve static files from the 'app' directory
app.use(express.static(path.join(__dirname, 'app')));

// Directory to save the uploaded files
const uploadDir = path.join(__dirname, "app", 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}


const uploadUUIDMaps = {};

// Handle file upload

app.post('/upload', (req, res) => {
    const { file, filename, size, chunknumber, totalchunks, uploadUUID } = req.body;

    if (!file || !filename || !size || !chunknumber || !totalchunks) {
        return res.status(400).send('Invalid request');
    }
    function uuid() {
        return 'SERVER-FILE-UUID-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var fileUUID = "";

    if (uploadUUIDMaps[uploadUUID]) {
        fileUUID = uploadUUIDMaps[uploadUUID]
    } else {
        fileUUID = uuid();
        uploadUUIDMaps[uploadUUID] = fileUUID
    }

    const filenameSplit = filename.split(".")
    const filenameExtension = filenameSplit.pop();
    const fileType = getFileType(filenameExtension)
    const filenameFinal = filenameSplit.join(".")
    const server_filename = filenameFinal + "_" + fileUUID + "." + filenameExtension


    const filePath = path.join(uploadDir, server_filename);
    if (chunknumber === 1) {
        // Create a new file
        fs.writeFileSync(filePath, '');
    }

    const buffer = Buffer.from(file);
    const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    writeStream.write(buffer, (err) => {
        if (err) {
            return res.status(500).send('Error writing file');
        }

        writeStream.end(() => {
            res.status(200).json({ message: `Chunk ${chunknumber} of ${totalchunks} for ${filename} uploaded` });

            if (chunknumber === totalchunks) {
                console.log(`File ${filename} upload complete`);

                saveFileInfo(filename, size, totalchunks, filePath, server_filename, fileUUID, fileType)
            }
        });
    });
});

app.get("/filesuploaded", (req, res) => {
    res.send(
        getFileUploadsDetails()
    )
})



app.get("/makeCompressedVideoServerFilename", (req, res) => {
    const fileUUID = req.query["fileUUID"]
    console.log(fileUUID);

    let uploadDetails = {
        uploadedFilesInfo: {}
    };
    if (fs.existsSync(uploadDetailsFile)) {
        const data = fs.readFileSync(uploadDetailsFile, 'utf-8');
        uploadDetails = JSON.parse(data);
    }
    if (fileUUID in uploadDetails.uploadedFilesInfo) {
        const fileInfo = uploadDetails.uploadedFilesInfo[fileUUID]
        const filename = fileInfo.filename;

        const filenameSplit = filename.split(".")
        const filenameExtension = filenameSplit.pop();
        const filenameFinal = filenameSplit.join(".")
        const compressedVideoServerFilename = filenameFinal + "_compressed" + fileUUID + "." + filenameExtension
        const compressedFinalFilePath = path.join(uploadDir, compressedVideoServerFilename);

        uploadDetails.uploadedFilesInfo[fileUUID].compressedVideoServerFilename = compressedVideoServerFilename;




        ffmpeg(fileInfo.filePath)
            .output(compressedFinalFilePath)
            .on('end', () => {
                console.log('Conversion finished');
                fs.writeFileSync(uploadDetailsFile, JSON.stringify(uploadDetails, null, 2), 'utf-8');

                res.send({ code: 1 })

            })
            .on('error', (err) => {
                console.error('Error:', err);
                res.send({ code: 0 })
            })
            .run();
    } else {
        res.send({ code: 0 })
    }
})

app.get("/makeAudioExtractedServerFilename", (req, res) => {
    const fileUUID = req.query["fileUUID"]
    console.log(fileUUID);

    let uploadDetails = {
        uploadedFilesInfo: {}
    };
    if (fs.existsSync(uploadDetailsFile)) {
        const data = fs.readFileSync(uploadDetailsFile, 'utf-8');
        uploadDetails = JSON.parse(data);
    }
    if (fileUUID in uploadDetails.uploadedFilesInfo) {
        const fileInfo = uploadDetails.uploadedFilesInfo[fileUUID]
        const filename = fileInfo.filename;

        const filenameSplit = filename.split(".")
        const filenameExtension = filenameSplit.pop();
        const filenameFinal = filenameSplit.join(".")
        const audioExtractedServerFilename = filenameFinal + "_audio" + fileUUID + ".mp3"
        const compressedFinalFilePath = path.join(uploadDir, audioExtractedServerFilename);

        uploadDetails.uploadedFilesInfo[fileUUID].audioExtractedServerFilename = audioExtractedServerFilename;




        ffmpeg(fileInfo.filePath)
            .output(compressedFinalFilePath)
            .on('end', () => {
                console.log('Conversion finished');
                fs.writeFileSync(uploadDetailsFile, JSON.stringify(uploadDetails, null, 2), 'utf-8');

                res.send({ code: 1 })
            })
            .on('error', (err) => {
                console.error('Error:', err);
                res.send({ code: 0 })
            })
            .run();
    } else {
        res.send({ code: 0 })
    }
})


function saveFileInfo(filename, size, totalchunks, filePath, serverFilename, fileUUID, fileType) {
    let uploadDetails = {
        uploadedFilesInfo: {}
    };
    if (fs.existsSync(uploadDetailsFile)) {
        const data = fs.readFileSync(uploadDetailsFile, 'utf-8');
        uploadDetails = JSON.parse(data);
    }

    const fileInfo = {
        filename,
        size,
        totalchunks,
        filePath,
        serverFilename,
        fileUUID,
        uploadTime: Date.now(),
        fileType
    };

    uploadDetails.uploadedFilesInfo[fileUUID] = fileInfo;

    fs.writeFileSync(uploadDetailsFile, JSON.stringify(uploadDetails, null, 2), 'utf-8');
}

function getFileUploadsDetails() {
    let uploadDetails = {
        uploadedFilesInfo: {}
    };
    if (fs.existsSync(uploadDetailsFile)) {
        const data = fs.readFileSync(uploadDetailsFile, 'utf-8');
        uploadDetails = JSON.parse(data);
    }
    for (const key in uploadDetails.uploadedFilesInfo) {
        delete uploadDetails.uploadedFilesInfo[key].filePath
    }
    return uploadDetails.uploadedFilesInfo
}

function getFileType(filenameExtension) {
    extensions = {
        "mp4": "video",
        "mkv": "video",
        "mov": "video",
        "avi": "video",
        "wmv": "video",
        "flv": "video",
        "webm": "video",
        "mp3": "audio",
        "wav": "audio",
        "flac": "audio",
        "aac": "audio",
        "ogg": "audio",
        "wma": "audio",
        "m4a": "audio",
        "txt": "text",
        "md": "text",
        "log": "text",
        "rtf": "text",
        "doc": "document",
        "docx": "document",
        "pdf": "document",
        "odt": "document",
        "xls": "spreadsheet",
        "xlsx": "spreadsheet",
        "ods": "spreadsheet",
        "ppt": "presentation",
        "pptx": "presentation",
        "odp": "presentation",
        "jpg": "image",
        "jpeg": "image",
        "png": "image",
        "gif": "image",
        "bmp": "image",
        "tiff": "image",
        "svg": "image",
        "psd": "image",
        "ai": "image",
        "eps": "image",
        "zip": "archive",
        "rar": "archive",
        "7z": "archive",
        "tar": "archive",
        "gz": "archive",
        "iso": "disk image",
        "dmg": "disk image",
        "exe": "executable",
        "msi": "executable",
        "sh": "script",
        "bat": "script",
        "py": "script",
        "js": "script",
        "html": "web",
        "htm": "web",
        "css": "web",
        "json": "data",
        "xml": "data",
        "csv": "data",
        "yaml": "data",
        "dat": "data",
        "bin": "binary",
        "ini": "configuration",
        "cfg": "configuration",
        "conf": "configuration",
        "json5": "data",
        "yaml": "data",
        "yml": "data",
        "sql": "database",
        "db": "database",
        "sqlite": "database",
        "sqlite3": "database",
        "mdb": "database",
        "accdb": "database",
        "log": "log",
        "bak": "backup",
        "tmp": "temporary",
        "bak": "backup",
        "old": "backup",
        "torrent": "torrent",
        "ics": "calendar",
        "vcf": "contact",
        "eml": "email",
        "msg": "email",
        "exe": "executable",
        "msi": "executable",
        "apk": "executable",
        "deb": "executable",
        "rpm": "executable",
        "jar": "executable",
        "class": "executable",
        "bat": "script",
        "cmd": "script",
        "sh": "script",
        "ps1": "script",
        "vbs": "script",
        "js": "script",
        "ts": "script",
        "php": "script",
        "rb": "script",
        "pl": "script",
        "java": "source code",
        "c": "source code",
        "cpp": "source code",
        "h": "source code",
        "cs": "source code",
        "swift": "source code",
        "go": "source code",
        "rs": "source code",
        "kt": "source code",
        "html": "web",
        "htm": "web",
        "css": "web",
        "scss": "web",
        "less": "web",
        "jsx": "web",
        "tsx": "web",
        "xml": "web",
        "xhtml": "web",
        "php": "web",
        "asp": "web",
        "aspx": "web"
    }
    if (filenameExtension in extensions) {
        return extensions[filenameExtension]
    } else {
        return "unknown"
    }
}


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});