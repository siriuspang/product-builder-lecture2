document.addEventListener('DOMContentLoaded', async () => {
    // Model Config
    const MODEL_URL = "https://teachablemachine.withgoogle.com/models/dE6ElUUvO/";
    let model, webcam, labelContainer, maxPredictions;

    // Elements
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    const startWebcamBtn = document.getElementById('start-webcam');
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const webcamContainer = document.getElementById('webcam-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultContainer = document.getElementById('result-container');
    const labelResultDiv = document.getElementById('label-container');
    const placeholder = document.getElementById('placeholder');

    // Theme Logic
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Load Model
    async function loadModel() {
        loadingOverlay.style.display = 'flex';
        try {
            const modelURL = MODEL_URL + "model.json";
            const metadataURL = MODEL_URL + "metadata.json";
            model = await tmImage.load(modelURL, metadataURL);
            maxPredictions = model.getTotalClasses();
            console.log("Model Loaded");
        } catch (error) {
            console.error("Failed to load model", error);
            alert("모델을 불러오는 데 실패했습니다.");
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // Initialize UI
    await loadModel();

    // Predictions Rendering
    function displayResults(predictions) {
        resultContainer.style.display = 'block';
        labelResultDiv.innerHTML = '';
        
        // Find top prediction
        const topPrediction = predictions.reduce((prev, current) => 
            (prev.probability > current.probability) ? prev : current
        );

        const resultTitle = document.getElementById('result-title');
        resultTitle.textContent = `당신은 ${topPrediction.className}상을 닮으셨네요!`;

        predictions.forEach(p => {
            const percent = (p.probability * 100).toFixed(0);
            const barWrapper = document.createElement('div');
            barWrapper.className = 'bar-wrapper';
            barWrapper.innerHTML = `
                <div class="bar-label">
                    <span>${p.className}</span>
                    <span>${percent}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${percent}%"></div>
                </div>
            `;
            labelResultDiv.appendChild(barWrapper);
        });
    }

    // Image Upload Handling
    imageUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Reset webcam if running
        if (webcam) {
            webcam.stop();
            webcamContainer.innerHTML = '';
            webcam = null;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            placeholder.style.display = 'none';
            webcamContainer.style.display = 'none';

            // Wait for image to load before predicting
            imagePreview.onload = async () => {
                const predictions = await model.predict(imagePreview);
                displayResults(predictions);
            };
        };
        reader.readAsDataURL(file);
    });

    // Webcam Handling
    startWebcamBtn.addEventListener('click', async () => {
        if (webcam) {
            webcam.stop();
            webcamContainer.innerHTML = '';
            webcam = null;
            startWebcamBtn.textContent = "실시간 카메라";
            return;
        }

        loadingOverlay.style.display = 'flex';
        const flip = true;
        webcam = new tmImage.Webcam(400, 400, flip);
        try {
            await webcam.setup();
            await webcam.play();
            loadingOverlay.style.display = 'none';
            
            webcamContainer.style.display = 'block';
            webcamContainer.appendChild(webcam.canvas);
            imagePreview.style.display = 'none';
            placeholder.style.display = 'none';
            startWebcamBtn.textContent = "카메라 끄기";
            
            window.requestAnimationFrame(loop);
        } catch (error) {
            console.error(error);
            alert("카메라를 시작할 수 없습니다.");
            loadingOverlay.style.display = 'none';
        }
    });

    async function loop() {
        if (webcam && webcam.canvas) {
            webcam.update();
            const predictions = await model.predict(webcam.canvas);
            displayResults(predictions);
            window.requestAnimationFrame(loop);
        }
    }

    // Partnership Form Logic
    const partnershipForm = document.getElementById('partnership-form');
    if (partnershipForm) {
        partnershipForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submit-btn');
            const originalBtnText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = '보내는 중...';

            const formData = new FormData(partnershipForm);
            
            try {
                const response = await fetch(partnershipForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    alert('제휴 문의가 성공적으로 접수되었습니다. 감사합니다!');
                    partnershipForm.reset();
                } else {
                    alert('Oops! 제출 중 문제가 발생했습니다.');
                }
            } catch (error) {
                alert('Oops! 제출 중 문제가 발생했습니다.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
});
