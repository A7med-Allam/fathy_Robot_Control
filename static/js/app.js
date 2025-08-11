// Fathy Robot Control System - JavaScript
// Handles HTTP requests to API endpoints
class FathyRobotController {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiUrl = `${this.baseUrl}/api`;
        this.statusUpdateInterval = 5000;
        this.currentRequests = new Map();
        // New properties for MediaRecorder
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingActive = false; // To track recording state
        this.init();
    }
    init() {
        console.log('🤖 Fathy Robot Controller initialized');
        this.setupEventListeners();
        this.startStatusUpdates();
        this.updateLastUpdateTime();
    }
    setupEventListeners() {
        document.querySelectorAll('.function-btn').forEach(button => {
            // ONLY attach generic handler to non-talk buttons
            if (button.dataset.function !== 'talk_to_fathy') {
                button.addEventListener('click', (e) => this.handleFunctionClick(e));
            }
        });
        // Special event listener for the "Talk to Fathy" button
        const talkButton = document.getElementById('talk-btn');
        if (talkButton) {
            talkButton.addEventListener('click', () => {
                if (!this.recordingActive) {
                    this.startAudioRecording(talkButton); // Start recording
                } else {
                    this.stopAudioRecording(talkButton); // Stop recording and send
                }
            });
        }

        // Event listener for language buttons
        document.querySelectorAll('.lang-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const clickedButton = e.currentTarget;
                const buttonGroup = clickedButton.parentElement;

                // Remove 'active' class from all buttons in the same group
                buttonGroup.querySelectorAll('.lang-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                // Add 'active' class to the clicked button
                clickedButton.classList.add('active');
            });
        });


        const closeBtn = document.getElementById('close-response');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideResponseDisplay());
        }
        const responseDisplay = document.getElementById('response-display');
        if (responseDisplay) {
            responseDisplay.addEventListener('click', (e) => {
                if (e.target === responseDisplay) {
                    this.hideResponseDisplay();
                }
            });
        }
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.function-btn') || {
                e.preventDefault();
            }
        }, { passive: false });
    }
    // --- Core function execution (mostly unchanged) ---
    async handleFunctionClick(event) {
        const button = event.currentTarget;
        const functionName = button.dataset.function;
        if (!functionName) {
            console.error('No function name specified');
            return;
        }
        if (this.currentRequests.has(functionName)) {
            console.log(`Function ${functionName} already running`);
            return;
        }
        try {
            await this.executeFunction(functionName, button);
        } catch (error) {
            console.error(`Error executing function ${functionName}:`, error);
            this.showError(`Error executing ${functionName}: ${error.message}`);
        }
    }
    // --- Modified executeFunction to handle audio Blob or JSON ---
    async executeFunction(functionName, button, audioBlob = null, messageText = null) {
        const card = button.closest('.function-card');
        const statusIndicator = card.querySelector('.status-indicator');
        const statusText = card.querySelector('.status-text');
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        try {
            this.setLoadingState(button, statusIndicator, statusText, btnText, btnLoader, true);
            this.currentRequests.set(functionName, true);
            const endpoint = this.getApiEndpoint(functionName);
            const requestData = this.prepareRequestData(functionName); // Prepare base data
            // Override message if provided (e.g., from Speech-to-Text)
            if (messageText !== null) {
                requestData.message = messageText;
            }
            console.log(`🚀 Executing function: ${functionName}`);
            console.log(`📡 API endpoint: ${endpoint}`);
            console.log(`📝 Request data (base):`, requestData); // Log base data for debugging
            let response;
            if (functionName === 'talk_to_fathy' && audioBlob) {
                console.log('Sending audio file to talk_to_fathy...');
                const formData = new FormData();
                formData.append('audio', audioBlob, 'fathy_input.wav'); // Use audioBlob

                // Get language values from the active buttons
                const selectedLang = document.querySelector('#input-lang-group .lang-btn.active').dataset.lang;

                formData.append('whisper_language', selectedLang);
                formData.append('xtts_language', selectedLang);
                console.log(`🗣️  Language selected: ${selectedLang}`);
                response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });
            } else {
                console.log('Sending JSON data to API...');
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });
            }
            // Handle API response (either audio or JSON)
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('audio/wav')) {
                console.log('Received audio response.');
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
                this.handleSuccessResponse(functionName, { message: "Audio response played!" }, statusIndicator, statusText);
                this.showResponseDisplay(functionName, { message: "Audio response played!", url: audioUrl });
            } else {
                const result = await response.json();
                if (response.ok) {
                    console.log(`✅ Success:`, result);
                    this.handleSuccessResponse(functionName, result, statusIndicator, statusText);
                    this.showResponseDisplay(functionName, result);
                } else {
                    console.error(`❌ Error:`, result);
                    this.handleErrorResponse(functionName, result, statusIndicator, statusText);
                    this.showError(`${functionName} failed: ${result.error || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.error(`💥 Network error:`, error);
            this.handleErrorResponse(functionName, { error: error.message }, statusIndicator, statusText);
            this.showError(`Network error: ${error.message}`);
        } finally {
            this.setLoadingState(button, statusIndicator, statusText, btnText, btnLoader, false);
            this.currentRequests.delete(functionName);
        }
    }
    getApiEndpoint(functionName) {
        // Paths from Flask's dynamic loading: /api/folder/module/function
        const endpointMap = {
            'shake_hand': `${this.apiUrl}/robot_functions/shake_hand/execute`,
            'talk_to_fathy': `${this.apiUrl}/robot_functions/talk_to_fathy/execute`,
            'heart_inspection': `${this.apiUrl}/robot_functions/heart_inspection/execute`,
            'basic_tour': `${this.apiUrl}/robot_functions/basic_tour/execute`,
            'listen': `${this.apiUrl}/robot_functions/talk_to_fathy/listen`, // For the 'listen' endpoint if directly called
            'status_check': `${this.apiUrl}/utilities/status_check/execute`
        };
        return endpointMap[functionName] || `${this.apiUrl}/robot_functions/${functionName}/execute`; // Default fallback
    }
    prepareRequestData(functionName) {
        const baseData = {
            timestamp: new Date().toISOString(),
            source: 'web_interface'
        };
        switch (functionName) {
            case 'shake_hand':
                return { ...baseData, intensity: 'gentle', duration: 3 };
            case 'talk_to_fathy':
                // For talk_to_fathy, initial text message and language for UI.
                // Actual audioBlob will be passed directly to executeFunction during recording.
                return { ...baseData, message: "Voice input needed", language: 'en', whisper_language: null, xtts_language: 'en' };
            case 'heart_inspection':
                return { ...baseData, sensors: ['heart_rate', 'blood_pressure', 'temperature'], duration: 30 };
            case 'basic_tour':
                return { ...baseData, tour_type: 'basic', duration: 300 };
            default:
                return baseData;
        }
    }
    setLoadingState(button, statusIndicator, statusText, btnText, btnLoader, isLoading) {
        // Also disable language buttons during processing
        document.querySelectorAll('.lang-btn').forEach(btn => btn.disabled = isLoading);

        if (isLoading) {
            button.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline';
            statusIndicator.className = 'status-indicator warning';
            statusText.textContent = 'Processing...';
        } else {
            // Restore button text and loader state for non-talk buttons
            if (button.dataset.function !== 'talk_to_fathy') {
                button.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        }
    }
    handleSuccessResponse(functionName, result, statusIndicator, statusText) {
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Success';
        this.updateSystemStatus();
        setTimeout(() => {
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'Ready';
        }, 5000);
    }
    handleErrorResponse(functionName, result, statusIndicator, statusText) {
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'Error';
        setTimeout(() => {
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'Ready';
        }, 5000);
    }
    // --- Audio Recording Logic (MediaRecorder) ---
    async startAudioRecording(button) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' }); // Create WAV Blob
                console.log('Recording stopped. Audio Blob size:', audioBlob.size, 'type:', audioBlob.type);
                // Now send the recorded audio to the API
                await this.executeFunction('talk_to_fathy', button, audioBlob);
                // Stop the microphone stream
                stream.getTracks().forEach(track => track.stop());
                this.resetTalkButtonUI(button);
            };
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder Error:', event.error);
                this.showError(`Recording error: ${event.error.name}`);
                stream.getTracks().forEach(track => track.stop());
                this.resetTalkButtonUI(button);
            };
            this.mediaRecorder.start();
            this.recordingActive = true;
            console.log('Recording started...');
            // Update UI for recording state
            button.querySelector('.btn-text').textContent = 'Stop Talking';
            button.querySelector('.btn-loader').style.display = 'inline'; // Show mic icon
            button.closest('.function-card').querySelector('.status-text').textContent = 'Recording...';
            button.closest('.function-card').querySelector('.status-indicator').className = 'status-indicator warning';

            // Disable language buttons during recording
            document.querySelectorAll('.lang-btn').forEach(btn => btn.disabled = true);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            this.showError(`Microphone access denied: ${err.message}. Please allow microphone access.`);
            this.resetTalkButtonUI(button);
        }
    }
    stopAudioRecording(button) {
        if (this.mediaRecorder && this.recordingActive) {
            this.mediaRecorder.stop();
            this.recordingActive = false;
            console.log('Stopping recording...');
            // UI will be reset in onstop handler after sending
        }
    }
    resetTalkButtonUI(button) {
        button.querySelector('.btn-text').textContent = 'Start Talking';
        button.querySelector('.btn-loader').style.display = 'none';
        button.disabled = false;
        button.closest('.function-card').querySelector('.status-text').textContent = 'Ready';
        button.closest('.function-card').querySelector('.status-indicator').className = 'status-indicator';

        // Re-enable language buttons
        document.querySelectorAll('.lang-btn').forEach(btn => btn.disabled = false);
    }
    // --- Other methods (mostly unchanged, removed redundant voice recognition) ---
    async updateSystemStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/system/status`);
            const status = await response.json();
            if (response.ok) {
                this.updateStatusDisplay(status);
            } else {
                console.error("Failed to fetch system status:", status);
                const connectionStatus = document.getElementById('connection-status');
                if (connectionStatus) {
                    connectionStatus.textContent = 'Disconnected';
                    connectionStatus.style.color = '#EF4444';
                }
            }
        } catch (error) {
            console.error('Error updating system status:', error);
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.textContent = 'Offline';
                connectionStatus.style.color = '#EF4444';
            }
        }
    }
    updateStatusDisplay(status) { /* ... unchanged ... */ }
    updateLastUpdateTime() { /* ... unchanged ... */ }
    startStatusUpdates() { /* ... unchanged ... */ }
    showResponseDisplay(functionName, result) { /* ... unchanged ... */ }
    hideResponseDisplay() { /* ... unchanged ... */ }
    showError(message) { /* ... unchanged ... */ }
}
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Fathy Robot Controller...');
    window.fathyController = new FathyRobotController();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('📱 App hidden - pausing updates');
    } else {
        console.log('📱 App visible - resuming updates');
        if (window.fathyController) {
            window.fathyController.updateSystemStatus();
        }
    }
});
window.addEventListener('online', () => {
    console.log('🌐 Network online');
    if (window.fathyController) {
        window.fathyController.updateSystemStatus();
    }
});
window.addEventListener('offline', () => {
    console.log('📡 Network offline');
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
        connectionStatus.textContent = 'Offline';
        connectionStatus.style.color = '#EF4444';
    }
});
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
