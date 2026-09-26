const uploadTab = document.getElementById("uploadTab");
const recordTab = document.getElementById("recordTab");

const uploadSection = document.getElementById("uploadSection");
const recordSection = document.getElementById("recordSection");

const dropZone = document.getElementById("dropZone");
const audioFile = document.getElementById("audioFile");

const selectedFile = document.getElementById("selectedFile");
const predictButton = document.getElementById("predictButton");

const loading = document.getElementById("loading");
const result = document.getElementById("result");
const errorBox = document.getElementById("errorBox");

const soundClass = document.getElementById("soundClass");
const soundConfidence = document.getElementById("soundConfidence");

const speakerResult = document.getElementById("speakerResult");
const speakerName = document.getElementById("speakerName");
const speakerConfidence = document.getElementById("speakerConfidence");

const probabilityList = document.getElementById("probabilityList");

const micButton = document.getElementById("micButton");
const recordStatus = document.getElementById("recordStatus");

let selectedAudio = null;
let mediaRecorder = null;
let recordedChunks = [];


// ============================================================
// UPLOAD TAB
// ============================================================

uploadTab.addEventListener("click", () => {

    uploadTab.classList.add("active");
    recordTab.classList.remove("active");

    uploadSection.classList.remove("hidden");
    recordSection.classList.add("hidden");

});


// ============================================================
// RECORD TAB
// ============================================================

recordTab.addEventListener("click", () => {

    recordTab.classList.add("active");
    uploadTab.classList.remove("active");

    recordSection.classList.remove("hidden");
    uploadSection.classList.add("hidden");

});


// ============================================================
// CLICK UPLOAD AREA
// ============================================================

dropZone.addEventListener("click", () => {

    audioFile.click();

});


// ============================================================
// FILE SELECTED
// ============================================================

audioFile.addEventListener("change", () => {

    if (audioFile.files.length === 0) {
        return;
    }

    selectedAudio = audioFile.files[0];

    showSelectedFile(selectedAudio);

});


// ============================================================
// DRAG AND DROP
// ============================================================

dropZone.addEventListener("dragover", (event) => {

    event.preventDefault();

    dropZone.classList.add("dragover");

});

dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("dragover");

});

dropZone.addEventListener("drop", (event) => {

    event.preventDefault();

    dropZone.classList.remove("dragover");

    if (event.dataTransfer.files.length === 0) {
        return;
    }

    selectedAudio = event.dataTransfer.files[0];

    showSelectedFile(selectedAudio);

});


// ============================================================
// SHOW SELECTED FILE
// ============================================================

function showSelectedFile(file) {

    selectedFile.textContent =
        "Selected: " + file.name;

    selectedFile.classList.remove("hidden");

    predictButton.disabled = false;

    result.classList.add("hidden");

    errorBox.classList.add("hidden");

}


// ============================================================
// PREDICT
// ============================================================

predictButton.addEventListener("click", async () => {

    if (!selectedAudio) {
        return;
    }

    const formData = new FormData();

    formData.append("audio", selectedAudio);

    loading.classList.remove("hidden");

    result.classList.add("hidden");

    errorBox.classList.add("hidden");

    predictButton.disabled = true;

    try {

        const response = await fetch("/predict", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        console.log("SoundSense API response:", data);

        if (!response.ok || data.success === false) {

            throw new Error(
                data.error || "Prediction failed"
            );

        }

        displayResult(data);

    }
    catch (error) {

        console.error("Prediction error:", error);

        errorBox.textContent =
            error.message || "Prediction failed";

        errorBox.classList.remove("hidden");

    }
    finally {

        loading.classList.add("hidden");

        predictButton.disabled = false;

    }

});


// ============================================================
// DISPLAY RESULT
// ============================================================

function displayResult(data) {

    console.log("Displaying result:", data);

    result.classList.remove("hidden");


    // --------------------------------------------------------
    // CURRENT BACKEND FORMAT
    // --------------------------------------------------------

    const prediction = data.result || {};

    const sound = prediction.sound_category || {};

    const speaker = prediction.speaker || null;


    // --------------------------------------------------------
    // SOUND CLASS
    // --------------------------------------------------------

    const soundLabel =
        sound.label || "Unknown";

    const soundConf =
        sound.confidence;


    soundClass.textContent =
        capitalizeLabel(soundLabel);


    soundConfidence.textContent =
        formatPercent(soundConf);


    // --------------------------------------------------------
    // SPEAKER
    // --------------------------------------------------------

    if (
        speaker &&
        speaker.label &&
        soundLabel.toLowerCase() === "human"
    ) {

        speakerResult.classList.remove("hidden");

        speakerName.textContent =
            capitalizeName(speaker.label);

        speakerConfidence.textContent =
            formatPercent(speaker.confidence);

    }
    else {

        speakerResult.classList.add("hidden");

    }


    // --------------------------------------------------------
    // SOUND PROBABILITIES
    // --------------------------------------------------------

    probabilityList.innerHTML = "";

    const topPredictions =
        sound.top_predictions || [];


    if (Array.isArray(topPredictions) &&
        topPredictions.length > 0) {

        topPredictions.forEach((predictionItem) => {

            const label =
                predictionItem.label || "Unknown";

            const confidence =
                Number(predictionItem.confidence || 0);


            const row =
                document.createElement("div");

            row.className =
                "probability";


            row.innerHTML = `
                <div class="probability-label">
                    <span>${capitalizeLabel(label)}</span>
                    <span>${confidence.toFixed(2)}%</span>
                </div>

                <div class="bar">
                    <div
                        class="bar-inner"
                        style="width:${Math.min(confidence, 100)}%"
                    ></div>
                </div>
            `;


            probabilityList.appendChild(row);

        });

    }


    // --------------------------------------------------------
    // SPEAKER TOP PREDICTIONS
    // --------------------------------------------------------

    if (
        speaker &&
        Array.isArray(speaker.top_predictions) &&
        speaker.top_predictions.length > 0
    ) {

        const speakerTitle =
            document.createElement("div");

        speakerTitle.className =
            "speaker-probabilities-title";

        speakerTitle.textContent =
            "Speaker probabilities";

        probabilityList.appendChild(
            speakerTitle
        );


        speaker.top_predictions.forEach((predictionItem) => {

            const label =
                predictionItem.label || "Unknown";

            const confidence =
                Number(predictionItem.confidence || 0);


            const row =
                document.createElement("div");

            row.className =
                "probability";


            row.innerHTML = `
                <div class="probability-label">
                    <span>${capitalizeName(label)}</span>
                    <span>${confidence.toFixed(2)}%</span>
                </div>

                <div class="bar">
                    <div
                        class="bar-inner"
                        style="width:${Math.min(confidence, 100)}%"
                    ></div>
                </div>
            `;


            probabilityList.appendChild(row);

        });

    }

}


// ============================================================
// FORMAT PERCENTAGE
// ============================================================

function formatPercent(value) {

    if (value === undefined || value === null) {
        return "-";
    }

    let number = Number(value);

    if (Number.isNaN(number)) {
        return "-";
    }

    // Backend currently returns confidence like 81.87
    // If another endpoint returns 0.8187, convert it.
    if (number > 0 && number <= 1) {
        number *= 100;
    }

    return number.toFixed(2) + "%";

}


// ============================================================
// CAPITALIZE LABEL
// ============================================================

function capitalizeLabel(label) {

    if (!label) {
        return "Unknown";
    }

    return String(label)
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());

}


// ============================================================
// CAPITALIZE PERSON NAME
// ============================================================

function capitalizeName(name) {

    if (!name) {
        return "Unknown";
    }

    return String(name)
        .replace(/\b\w/g, letter => letter.toUpperCase());

}


// ============================================================
// MICROPHONE RECORDING
// ============================================================

micButton.addEventListener("click", async () => {

    if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
    ) {

        mediaRecorder.stop();

        return;

    }


    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        recordedChunks = [];


        mediaRecorder =
            new MediaRecorder(stream);


        mediaRecorder.ondataavailable = event => {

            if (event.data.size > 0) {

                recordedChunks.push(event.data);

            }

        };


        mediaRecorder.onstop = () => {

            const blob =
                new Blob(
                    recordedChunks,
                    { type: "audio/webm" }
                );


            selectedAudio =
                new File(
                    [blob],
                    "microphone_recording.webm",
                    { type: "audio/webm" }
                );


            showSelectedFile(selectedAudio);


            stream
                .getTracks()
                .forEach(track => track.stop());


            recordStatus.textContent =
                "Recording ready";

        };


        mediaRecorder.start();


        recordStatus.textContent =
            "Recording... click microphone to stop";

    }
    catch (error) {

        errorBox.textContent =
            "Microphone access failed: " +
            error.message;

        errorBox.classList.remove("hidden");

    }

});