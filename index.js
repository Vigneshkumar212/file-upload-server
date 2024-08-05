//CONSTANTS
const CHUNK_UPLOAD_FILE_LIMIT_BYTES = 1 * 1024 * 1024; // 1MB chunks

//create "plus" button shown on home screen
const createButtonElement = document.getElementById("createButtonElement");
//hidden file input to input files
const fileInputElement = document.getElementById("fileInputElement");

//when clicked on create
createButtonElement.addEventListener("click",handleCreateButtonClick)

//when a new file change is detected
fileInputElement.addEventListener("change", uploadFiles);

//NEWLY ADDED INCOMPLETE
function handleCreateButtonClick(){
    CreateNewOptionSelector("Create", "Please select an option", ["Upload File","Upload File (advanced)", "Create Folder"]).then(async e => {
        console.log(e);
        if(e== -1){
            console.info("User requested close popup! for create button click")
        }else if(e==0){
            fileInputElement.click() 
        }else if(e==1){
            alert("Feature under development!")
        }else if(e==2){
            alert("Feature under development!")
        }
    })
}

//UPLOADING FILES RELATED THINGS

//uploading file
function uploadFiles() {
    //getting files 
    const fileInput = fileInputElement;
    const files = fileInput.files;
    if (files.length === 0) {
        console.error("No files selected");
        return;
    }
    //for each files opened pushing the file only to 'allFiles'
    const allFiles = []
    for (var i = 0; i < fileInputElement.files.length; i++) {
        allFiles.push(fileInputElement.files[i])
    }

    //sending to handleUploads
    handleUploads(allFiles);
}
//uploads files one after another (calls uploadfile)
function handleUploads(files) {
    //this process uploads files one by one
    if (files && files[0]) {
        //getting last file
        const file = files.pop();
        //uploading file
        uploadFile(file).then(res => {
            //once done 
            //NOTE FOR BOTH NEXT ITERATION IS CALLED IN THE FOLLOWING FUNCTIONS!
            if (res) {
                //showing message
                updateProgressBarSucessAndIterate(files) 
            } else {
                //showing message
                updateProgressBarFailureAndIterate(files)
            }
        })
    }

}

//uploads one file
function uploadFile(file) {
    return new Promise((res, rej) => {
        const chunkSize = CHUNK_UPLOAD_FILE_LIMIT_BYTES
        const totalChunks = Math.ceil(file.size / chunkSize);
        const uploadUUID = uuid();
        let currentChunk = 0;
        function readNextChunk() {
            const start = currentChunk * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const reader = new FileReader();
            reader.onload = function (e) {
                console.log(`Uploading chunk ${currentChunk + 1} of ${totalChunks} for file ${file.name}`);
                updateProgressBar(currentChunk, totalChunks, file.size, file.name, chunkSize)

                // Send the chunk to the server
                fetch('/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        file: Array.from(new Uint8Array(e.target.result)),
                        filename: file.name,
                        size: file.size,
                        chunknumber: currentChunk + 1,
                        totalchunks: totalChunks,
                        uploadUUID: uploadUUID
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        currentChunk++;
                        if (currentChunk < totalChunks) {
                            readNextChunk();
                            updateProgressBar(currentChunk, totalChunks, file.size, file.name, chunkSize)
                        } else {
                            console.log(`File ${file.name} upload complete`);
                            res(true)
                        }
                    })
                    .catch(error => {
                        console.error("Error uploading chunk", error);
                        res(false)
                    });
            };
            reader.readAsArrayBuffer(chunk);
        }

        readNextChunk();
    })

}

const AllFileElements = []

//gets all uploaded files 
function getUploadedFilesInfo() {
    //This function gets all the user uploaded files details and calls render to show them on UI
    AllFileElements.forEach(e => {
        //removing all previous shown elements
        e.remove();
    })

    //Getting latest files uploaded info
    fetch('/filesuploaded')
        .then(response => response.json())
        .then(data => {

            //gettings keys
            const keys = Object.keys(data);
            var entries = Object.entries(data);

            //sorting in descending order based on time uploaded so latest uploaded is on top
            entries.sort((a, b) => b[1].uploadTime - a[1].uploadTime);

            //converting back to json
            var sortedObject = Object.fromEntries(entries);

            //displaying total files count
            document.querySelectorAll(".counter")[0].innerHTML = "Showing " + keys.length + " files"

            //rendering ui elements
            for (const key in sortedObject) {
                const element = sortedObject[key];
                renderUploadedServerFiles(element)
            }
        })
        .catch(error => {
            console.error("Error fetching uploaded files", error);
        });
}
//init for first load
getUploadedFilesInfo()

//renders file UI (each file tile)
function renderUploadedServerFiles(fileInfo) {
    //NOTE: current rendering file as UI (fileInfo:var) will be reffered to as as 'file' in this function
    const { filename, size, totalchunks, serverFilename, fileUUID, uploadTime, fileType } = fileInfo

    //creating dom element and updating all of its info (i know im using plan html in this way it was just easier)
    const div = document.createElement("div")
    div.classList.add("fileDisplay")
    div.innerHTML = `
				<div class="overlay">
					<div class="top">
						<div class="l">
							<div class="title">${filename}</div>
							<div class="row">
								<div class="fileType">${fileType}</div>
								•
								<div class="size">${formatBytes(size)}</div>
							</div>
						</div>
						<div class="r">
							<div class="date">${getTimeDifferenceMessage(uploadTime)}</div>
						</div>
					</div>
					<div class="otherDetails">
					</div>
					<div class="buttons">
						<div class="button cache">cache</div>

						<div class="button download"><span class="material-symbols-outlined">
								download
							</span> download</div>
						<div class="button delete"><span class="material-symbols-outlined">
								delete
							</span> delete</div>
					</div>
				</div>

				<div class="fileIconWatermark">
					<span class="material-symbols-outlined">
						${getFileTypeIcon(fileType)}
					</span>
				</div>
    `

    //handling button clicks (download)
    div.querySelectorAll(".button")[1].addEventListener("click", () => {
        showDownloadPopup(fileInfo)
    })

    //handling button clicks (delete)
    div.querySelectorAll(".button")[2].addEventListener("click", () => {
        alert("Feature under development!")
    })

    //handling button clicks (cache)
    div.querySelectorAll(".button")[0].addEventListener("click", () => {
        alert("Feature under development!")
    })

    //pushing to be deleted later
    AllFileElements.push(div)

    //appending to render on screen
    document.querySelectorAll(".home")[0].append(div)
}




//to dhow upload progress
const uploaderElement = document.querySelectorAll(".uploader")[0]
function updateProgressBar(currentChunk, totalChunks, totalsize, filename, chunkSize) {
    //UPDATING PERCENTAGES ON UI WHEN UPLOAD FILE
    uploaderElement.style.bottom = "40px";
    currentChunk++
    uploaderElement.querySelectorAll(".filename")[0].innerHTML = filename
    var uploadedBytes = currentChunk * chunkSize
    if (uploadedBytes > totalsize) {
        uploadedBytes = totalsize
    }
    var percentage = (uploadedBytes / totalsize) * 100
    uploaderElement.querySelectorAll(".bytesprogress")[0].innerHTML = formatBytes(uploadedBytes) + " / " + formatBytes(totalsize)
    uploaderElement.querySelectorAll(".complete")[0].style.width = percentage + "%"
}

//when file upload complete or incomplete showing the error message or success message and iterating to next file upload
function updateProgressBarSucessAndIterate(files) {
    //updating DOM
    document.querySelectorAll(".uploader .col .bytesprogress")[0].innerHTML = "<span class='material-symbols-outlined' style='color: #4dd36591'>check_small</span> Upload Complete"
    setTimeout(() => {
        document.querySelectorAll(".uploader")[0].style.bottom = "-100px";
        setTimeout(() => {
        //after animation is over
            //iterating to next file
            handleUploads(files)
        }, 500);
    }, 1500);
    //updating DOM of uploaded files
    getUploadedFilesInfo();
}
function updateProgressBarFailureAndIterate(files) {
    //updating DOM
    document.querySelectorAll(".uploader .col .bytesprogress")[0].innerHTML = "<span class='material-symbols-outlined' style='color: #d34d4d91'>dangerous</span> Upload Failed. Try Again"
    setTimeout(() => {
        document.querySelectorAll(".uploader")[0].style.bottom = "-100px";
        setTimeout(() => {
            //after animation is over
                //iterating to next file
            handleUploads(files)
        }, 500);
    }, 1500);
    //updating DOM of uploaded files
    getUploadedFilesInfo();
}

//to get icon based on file type
function getFileTypeIcon(fileType) {
    const extensions_icons = {
        "video": "movie",
        "audio": "mic_external_on",
        "text": "text_fields",
        "log": "info",
        "document": "description",
        "spreadsheet": "dataset",
        "presentation": "subscriptions",
        "image": "photo_library",
        "archive": "archive",
        "disk image": "save",
        "executable": "apps",
        "script": "code",
        "web": "language",
        "data": "reorder",
        "binary": "manufacturing",
        "configuration": "settings",
        "database": "database",
        "backup": "cloud_upload",
        "temporary": "running_with_errors",
        "calendar": "calendar_month",
        "contact": "contacts",
        "email": "mail",
        "source code": "frame_source"
    }
    return extensions_icons[fileType]
}

//the full download process (can be broken down into more functions but as of yet it is what it is)
function showDownloadPopup(fileInfo) {
    showLoading();


    //IF file is video
    if (fileInfo.fileType == "video") {
        //IGNORE THIS CODE IDK WHAT I WROTE BEFORE
        //if video then show compress and audio only 
        /* const a = document.createElement("a");
        a.href = "/uploads/" + fileInfo.serverFilename
        a.download = fileInfo.filename;
        a.click(); */

        hideLoading();

        //showing popup animation
        CreateNewOptionSelector("Download Method", "Select a file format", ["full file (.mp4)", "lowered bit rate (.mp4)", "only audio (.mp3)"]).then(async e => {
            showLoading()
            //-1 means user closed
            if (e == -1 || e == "user requested close") {
                hideLoading();
            }
            //downloading selected file
            if (e == 0) {
                //full res
                const a = document.createElement("a");
                a.href = "/uploads/" + fileInfo.serverFilename
                a.download = fileInfo.filename;
                a.click();
                hideLoading()

            }
            //ILL comment this later
            if (e == 1) {
                //lowered bitrate
                if (fileInfo.compressedVideoServerFilename) {

                    const a = document.createElement("a");
                    a.href = "/uploads/" + fileInfo.compressedVideoServerFilename
                    console.log(a.href)
                    const filename = fileInfo.filename

                    const filenameSplit = filename.split(".")
                    const filenameExtension = filenameSplit.pop();
                    const filenameFinal = filenameSplit.join(".")
                    const compressedFilename = filenameFinal + "_compressed" + "." + filenameExtension
                    a.download = compressedFilename;
                    a.click();
                    hideLoading()
                } else {
                    //request for compressed video

                    try {
                        fetch('/makeCompressedVideoServerFilename?fileUUID=' + fileInfo.fileUUID)
                            .then(response => response.json())
                            .then(data => {
                                if (data.code == "1") {
                                    fetch('/filesuploaded').then(response => response.json()).then(data => {
                                        const a = document.createElement("a");
                                        a.href = "/uploads/" + data[fileInfo.fileUUID].compressedVideoServerFilename
                                        console.log(a.href)
                                        const filename = fileInfo.filename

                                        const filenameSplit = filename.split(".")
                                        const filenameExtension = filenameSplit.pop();
                                        const filenameFinal = filenameSplit.join(".")
                                        const compressedFilename = filenameFinal + "_compressed" + "." + filenameExtension
                                        a.download = compressedFilename;
                                        a.click();
                                        hideLoading()
                                    }).catch(error => {
                                        console.error("Error fetching uploaded files", error);
                                    });
                                }
                            })
                    } catch (error) {
                        hideLoading()

                    }

                }
                // alert("feature not available yet")
            }
            //download only audio
            if (e == 2) {
                //only audio
                if (fileInfo.audioExtractedServerFilename) {
                    const a = document.createElement("a");
                    a.href = "/uploads/" + fileInfo.audioExtractedServerFilename
                    const filename = fileInfo.filename
                    const filenameSplit = filename.split(".")
                    const filenameExtension = filenameSplit.pop();
                    const filenameFinal = filenameSplit.join(".")
                    const audioFilename = filenameFinal + "_audio" + ".mp3"
                    a.download = audioFilename;
                    a.click();
                    hideLoading()
                } else {
                    //request for audio
                    try {
                        fetch('/makeAudioExtractedServerFilename?fileUUID=' + fileInfo.fileUUID)
                            .then(response => response.json())
                            .then(data => {
                                if (data.code == "1") {
                                    fetch('/filesuploaded').then(response => response.json()).then(data => {
                                        const a = document.createElement("a");
                                        a.href = "/uploads/" + data[fileInfo.fileUUID].audioExtractedServerFilename
                                        const filename = fileInfo.filename
                                        const filenameSplit = filename.split(".")
                                        const filenameExtension = filenameSplit.pop();
                                        const filenameFinal = filenameSplit.join(".")
                                        const audioFilename = filenameFinal + "_audio" + ".mp3"
                                        a.download = audioFilename;
                                        a.click();
                                        hideLoading()
                                    }).catch(error => {
                                        console.error("Error fetching uploaded files", error);
                                    });
                                }
                            })
                    } catch (error) {
                        hideLoading()
                    }
                }

                // alert("feature not available yet")
            }
        })
    } else {
        //if the file is not video then normal download
        const a = document.createElement("a");
        a.href = "/uploads/" + fileInfo.serverFilename
        a.download = fileInfo.filename;
        a.click();
        hideLoading()
    }
}

//custom pop up, used for download or create
function CreateNewOptionSelector(title, helperText, options = []) {
    return new Promise((res, rej) => {
        const pickerDiv = document.createElement("div");
        pickerDiv.classList.add("optiongetter")
        pickerDiv.innerHTML = `
					<h1 class="title">${title}</h1>
					<p class="helper">${helperText}</p>
					<div class="options"></div>
					
					<div class="button">
						Continue <span class="material-symbols-outlined">
							arrow_right_alt
							</span>
					</div>
                `
        const allOptionElements = []
        var selectedOption = ""
        function closeThis() {
            res("user requested close")
            pickerDiv.remove()
            delete pickerDiv
            delete allOptionElements;
            delete selectedOption;
            document.querySelectorAll(".popups")[0].style.display = "none"
            document.querySelectorAll(".popups .back")[0].removeEventListener("click", closeThis)
        }
        options.forEach(optionText => {
            const option = document.createElement("div");
            allOptionElements.push(option)
            option.classList.add("option")
            option.innerHTML = `
						<div class="selector">
							<div class="circle"></div>
						</div>
						<p>${optionText}</p>
                    `
            pickerDiv.querySelectorAll(".options")[0].append(option);
            option.addEventListener("click", e => {
                allOptionElements.forEach(e => {
                    e.classList.remove("selected")
                })
                option.classList.add("selected")
                selectedOption = optionText;
            })
            document.querySelectorAll(".popups .back")[0].addEventListener("click", closeThis)

        })
        //defaulting to first option
        allOptionElements[0].click();

        pickerDiv.querySelectorAll(".button")[0].addEventListener("click", () => {
            res(options.indexOf(selectedOption))
            pickerDiv.remove()
            delete pickerDiv
            delete allOptionElements;
            delete selectedOption;
            document.querySelectorAll(".popups")[0].style.display = "none"
        })


        document.querySelectorAll(".popups")[0].style.display = "block"
        document.querySelectorAll(".popups .content")[0].append(pickerDiv);
    })
}
function showLoading() {
    document.querySelectorAll(".loader2")[0].style.display = "flex"
}
function hideLoading() {
    document.querySelectorAll(".loader2")[0].style.display = "none"

}


//CREATING FOLDER


//GENERAL STUFF
//create a uuid
function uuid() {
    return 'UPLOAD-FILE-UUID-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

//getting time difference from timesamp and current time
function getTimeDifferenceMessage(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffTime = Math.abs(now - past);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffMonths / 12);

    if (diffDays === 0) {
        return "today";
    } else if (diffDays === 1) {
        return "yesterday";
    } else if (diffDays < 30) {
        return `${diffDays} days ago`;
    } else if (diffMonths === 1) {
        return "1 month ago";
    } else if (diffMonths < 12) {
        return `${diffMonths} months ago`;
    } else if (diffYears === 1) {
        return "1 year ago";
    } else {
        return `${diffYears} years ago`;
    }
}

//getting bytes formatted as KB MB GB TB...
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}