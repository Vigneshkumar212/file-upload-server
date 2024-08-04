# file-upload-server
A google drive like project to upload and store all your files and access them on the internet

> This project is still under developemnt. No releases as of yet.
> If you have any ideas that you may like to be added please feel free to open a pull request

### Feature support as of latest update:
- File upload.
- File download (for videos: download original, compressed version, only audio).
- Easy to use UI to manage files.

### Future Goals / To Do
- Make it almost a full replacement for google drive
- transcribe audio for audio/video transcribe based search (openai-wishper)
- people identification in images (tensorflow)
- document searching
- delete files
- search files

> Any and all support to completing this project is appreciated!

## Installation

### Pre-Requisites
- [Node.js](https://nodejs.org/).
- GIT bash (to clone this repo)
- Python 3.10+ (not compulsory as of yet)
- Open AI - whisper (not compulory as of yet)

### Instructions

```sh
git clone https://github.com/Vigneshkumar212/file-upload-server.git
cd file-upload-server
npm install
```
Make a folder called `uploads` inside the `app` folder
Make a file called `uploads_details_server_use_only.json` inside the `app` folder with the following content:

```json
{
  "uploadedFilesInfo": {}
}
```

```sh
node server.js
```

The server should be started and then open http://localhost:3000

## Development

Want to contribute? Great!

`file-upload-server` is made with the bascis, nodejs, html css and js

We're more than happy to see what you've added to this!

## License

Read more here: [file-upload-server/License](https://github.com/Vigneshkumar212/file-upload-server/blob/main/LICENSE)

Thanks for checking out `file-upload-server`
