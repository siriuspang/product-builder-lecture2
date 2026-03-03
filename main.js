document.addEventListener("DOMContentLoaded", () => {
    const MODEL_URL = "https://teachablemachine.withgoogle.com/models/dE6ElUUvO/";
    const html = document.documentElement;
    const themeToggle = document.getElementById("theme-toggle");
    const startWebcamBtn = document.getElementById("start-webcam");
    const imageUpload = document.getElementById("image-upload");
    const imagePreview = document.getElementById("image-preview");
    const webcamContainer = document.getElementById("webcam-container");
    const loadingOverlay = document.getElementById("loading-overlay");
    const loadingMessage = document.getElementById("loading-message");
    const resultContainer = document.getElementById("result-container");
    const labelContainer = document.getElementById("label-container");
    const placeholder = document.getElementById("placeholder");
    const resultTitle = document.getElementById("result-title");
    const resultSummary = document.getElementById("result-summary");
    const currentYear = document.getElementById("current-year");
    const partnershipForm = document.getElementById("partnership-form");

    let model;
    let webcam;
    let modelLoaded = false;

    function setTheme(theme) {
        html.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }

    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const nextTheme = html.getAttribute("data-theme") === "light" ? "dark" : "light";
            setTheme(nextTheme);
        });
    }

    if (currentYear) {
        currentYear.textContent = String(new Date().getFullYear());
    }

    function showLoading(message) {
        if (!loadingOverlay) {
            return;
        }
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        loadingOverlay.hidden = false;
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.hidden = true;
        }
    }

    async function ensureModelLoaded() {
        if (modelLoaded) {
            return;
        }

        showLoading("AI 분석 모델을 불러오는 중입니다.");
        try {
            model = await tmImage.load(`${MODEL_URL}model.json`, `${MODEL_URL}metadata.json`);
            modelLoaded = true;
        } catch (error) {
            console.error("Model load failed:", error);
            alert("AI 모델을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
            throw error;
        } finally {
            hideLoading();
        }
    }

    function stopWebcam() {
        if (!webcam) {
            return;
        }

        webcam.stop();
        webcam = null;
        webcamContainer.innerHTML = "";
        webcamContainer.style.display = "none";
        startWebcamBtn.textContent = "실시간 카메라";
    }

    function resetVisualState() {
        placeholder.style.display = "none";
        resultContainer.hidden = false;
        labelContainer.innerHTML = "";
    }

    function buildInterpretation(topPrediction, percent) {
        if (topPrediction.className.includes("강아지")) {
            return `상위 결과는 ${topPrediction.className}이며, 현재 사진 기준 ${percent}% 경향으로 나타났습니다. 부드럽고 친근한 인상 요소가 상대적으로 더 크게 감지된 경우에 자주 보이는 결과입니다.`;
        }

        return `상위 결과는 ${topPrediction.className}이며, 현재 사진 기준 ${percent}% 경향으로 나타났습니다. 또렷한 눈매와 선명한 분위기처럼 날렵한 인상 요소가 상대적으로 더 크게 감지된 경우에 자주 보이는 결과입니다.`;
    }

    function renderResults(predictions) {
        resetVisualState();

        const topPrediction = predictions.reduce((best, current) => {
            return current.probability > best.probability ? current : best;
        });
        const topPercent = (topPrediction.probability * 100).toFixed(0);

        resultTitle.textContent = `당신은 ${topPrediction.className} 경향이 더 높게 나왔습니다.`;
        resultSummary.textContent = buildInterpretation(topPrediction, topPercent);

        predictions.forEach((prediction) => {
            const percent = (prediction.probability * 100).toFixed(0);
            const barWrapper = document.createElement("div");
            barWrapper.className = "bar-wrapper";

            barWrapper.innerHTML = `
                <div class="bar-label">
                    <span>${prediction.className}</span>
                    <span>${percent}%</span>
                </div>
                <div class="progress-bar" role="img" aria-label="${prediction.className} ${percent}퍼센트">
                    <div class="progress" style="width: ${percent}%"></div>
                </div>
            `;

            labelContainer.appendChild(barWrapper);
        });
    }

    async function predictFromElement(element) {
        await ensureModelLoaded();
        const predictions = await model.predict(element);
        renderResults(predictions);
    }

    if (imageUpload) {
        imageUpload.addEventListener("change", (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) {
                return;
            }

            stopWebcam();

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                imagePreview.src = loadEvent.target.result;
                imagePreview.hidden = false;
                imagePreview.onload = async () => {
                    try {
                        await predictFromElement(imagePreview);
                    } catch (error) {
                        console.error("Prediction failed:", error);
                    }
                };
            };
            reader.readAsDataURL(file);
        });
    }

    async function webcamLoop() {
        if (!webcam || !webcam.canvas) {
            return;
        }

        webcam.update();
        try {
            const predictions = await model.predict(webcam.canvas);
            renderResults(predictions);
        } catch (error) {
            console.error("Webcam prediction failed:", error);
        }
        window.requestAnimationFrame(webcamLoop);
    }

    if (startWebcamBtn) {
        startWebcamBtn.addEventListener("click", async () => {
            if (webcam) {
                stopWebcam();
                placeholder.style.display = "flex";
                imagePreview.hidden = true;
                return;
            }

            try {
                await ensureModelLoaded();
                showLoading("카메라 권한을 요청하는 중입니다.");
                webcam = new tmImage.Webcam(480, 480, true);
                await webcam.setup();
                await webcam.play();
                webcamContainer.style.display = "block";
                webcamContainer.innerHTML = "";
                webcamContainer.appendChild(webcam.canvas);
                imagePreview.hidden = true;
                placeholder.style.display = "none";
                startWebcamBtn.textContent = "카메라 끄기";
                hideLoading();
                window.requestAnimationFrame(webcamLoop);
            } catch (error) {
                console.error("Webcam failed:", error);
                hideLoading();
                stopWebcam();
                alert("카메라를 시작할 수 없습니다. 브라우저 권한을 확인해 주세요.");
            }
        });
    }

    if (partnershipForm) {
        partnershipForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const submitBtn = document.getElementById("submit-btn");
            const originalLabel = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "전송 중...";

            try {
                const response = await fetch(partnershipForm.action, {
                    method: "POST",
                    body: new FormData(partnershipForm),
                    headers: {
                        Accept: "application/json"
                    }
                });

                if (!response.ok) {
                    throw new Error("Form submit failed");
                }

                alert("문의가 정상적으로 접수되었습니다.");
                partnershipForm.reset();
            } catch (error) {
                console.error("Form submit failed:", error);
                alert("문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalLabel;
            }
        });
    }
});
