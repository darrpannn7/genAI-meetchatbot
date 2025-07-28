// Hunter Squad AI Meeting Assistant - Unified App
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        API_BASE_URL: 'http://127.0.0.1:8000',
        
        TEMPLATE_DESCRIPTIONS: {
            general: "General meeting analysis",
            standup: "Focus on daily progress, blockers, and next steps",
            planning: "Emphasize project planning, task allocation, and timelines",
            retrospective: "Analyze what went well, what didn't, and improvements",
            client: "Focus on client requirements, updates, and relationship management",
            brainstorm: "Highlight creative ideas, problem-solving, and innovation"
        },
        
        LOADING_MESSAGES: [
            "Hunter Squad is tracking down insights...",
            "Our hunters are on the trail of key decisions...",
            "Hunting for action items in the meeting jungle...",
            "Squad deployed - scanning for meeting intelligence...",
            "Tracking conversation patterns in the wild...",
            "Hunter Squad's AI is stalking the perfect summary..."
        ],
        
        ALLOWED_FILE_TYPES: ['.txt', '.vtt', '.srt'],
        
        THEME: {
            LIGHT: 'light',
            DARK: 'dark'
        }
    };

    const ICONS = {
        SUMMARY: '📄',
        ACTION_ITEMS: '✅',
        KEY_DECISIONS: '🛡️',
        TOPICS: '📋',
        SPEAKER_INSIGHTS: '👥',
        NEXT_STEPS: '➡️',
        EXPORT: '↗️',
        UPLOAD: '📁',
        CLOSE: '✕',
        MOON: '🌙',
        SUN: '☀️'
    };

    // API Service
    class APIService {
        constructor() {
            this.baseURL = CONFIG.API_BASE_URL;
        }

        async processTextTranscript(data) {
            return this._makeRequest('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        async processFileUpload(file) {
            const formData = new FormData();
            formData.append('file', file);
            
            return this._makeRequest('/api/upload', {
                method: 'POST',
                body: formData
            });
        }

        async generatePDF(results) {
            const response = await fetch(`${this.baseURL}/api/export/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(results)
            });
            
            if (!response.ok) {
                throw new Error('PDF generation failed');
            }
            
            return response.blob();
        }

        async sendEmail(emailData) {
            return this._makeRequest('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData)
            });
        }

        async createCalendarEvent(eventData) {
            return this._makeRequest('/api/calendar/create-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
        }

        async _makeRequest(endpoint, options) {
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'An unexpected error occurred.');
            }
            
            return response.json();
        }
    }

    // UI Manager
    class UIManager {
        constructor() {
            this.elements = this._initializeElements();
            this.currentTheme = this._getStoredTheme();
            this._applyTheme();
        }

        _initializeElements() {
            return {
                // Main content areas
                inputSection: document.getElementById('input-section'),
                resultsSection: document.getElementById('results-section'),
                loadingSpinner: document.getElementById('loading-spinner'),
                errorMessage: document.getElementById('error-message'),
                outputContainer: document.getElementById('output'),

                // Input elements
                transcriptInput: document.getElementById('transcript-input'),
                analysisType: document.getElementById('analysis-type'),
                participants: document.getElementById('participants'),
                processBtn: document.getElementById('process-btn'),
                processBtnText: document.querySelector('.button-text'),
                fileInput: document.getElementById('file-input'),
                fileSelectBtn: document.getElementById('file-select-btn'),
                uploadArea: document.getElementById('upload-area'),
                fileInfo: document.getElementById('file-info'),

                // Additional controls
                advancedOptions: document.getElementById('advanced-options'),
                themeToggle: document.getElementById('theme-toggle'),

                // Modals
                emailModal: document.getElementById('email-modal'),
                calendarModal: document.getElementById('calendar-modal'),
                closeEmailModal: document.getElementById('close-email-modal'),
                closeCalendarModal: document.getElementById('close-calendar-modal'),

                // Email form
                recipientEmail: document.getElementById('recipient-email'),
                emailSubject: document.getElementById('email-subject'),
                includePdf: document.getElementById('include-pdf'),
                sendEmailBtn: document.getElementById('send-email-btn'),

                // Calendar form
                eventTitle: document.getElementById('event-title'),
                eventDate: document.getElementById('event-date'),
                eventDuration: document.getElementById('event-duration'),
                eventAttendees: document.getElementById('event-attendees'),
                createEventBtn: document.getElementById('create-event-btn')
            };
        }

        showAdvancedOptions() {
            if (this.elements.advancedOptions) {
                this.elements.advancedOptions.classList.remove('hidden');
                this.elements.advancedOptions.style.animation = 'fadeInDown 0.3s ease-out';
            }
        }

        hideAdvancedOptions() {
            if (this.elements.advancedOptions) {
                this.elements.advancedOptions.classList.add('hidden');
            }
        }

        showLoading(isLoading) {
            if (this.elements.resultsSection) {
                this.elements.resultsSection.classList.remove('hidden');
            }
            if (this.elements.loadingSpinner) {
                this.elements.loadingSpinner.classList.toggle('hidden', !isLoading);
            }
            if (this.elements.outputContainer) {
                this.elements.outputContainer.classList.toggle('hidden', isLoading);
            }
            if (this.elements.errorMessage) {
                this.elements.errorMessage.classList.add('hidden');
            }
            if (this.elements.processBtn) {
                this.elements.processBtn.disabled = isLoading;
            }
            if (this.elements.processBtnText) {
                this.elements.processBtnText.textContent = isLoading ? 'Analyzing...' : 'Analyze Meeting';
            }
            
            if (isLoading) {
                const randomMessage = CONFIG.LOADING_MESSAGES[Math.floor(Math.random() * CONFIG.LOADING_MESSAGES.length)];
                const loadingText = document.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = randomMessage;
                }
            }
        }

        showError(message) {
            if (this.elements.resultsSection) {
                this.elements.resultsSection.classList.remove('hidden');
            }
            if (this.elements.loadingSpinner) {
                this.elements.loadingSpinner.classList.add('hidden');
            }
            if (this.elements.outputContainer) {
                this.elements.outputContainer.classList.add('hidden');
            }
            if (this.elements.errorMessage) {
                this.elements.errorMessage.textContent = message;
                this.elements.errorMessage.classList.remove('hidden');
            }
        }

        displayResults(results) {
            if (!this.elements.outputContainer) {
                console.error('Output container not found');
                return;
            }

            this.elements.outputContainer.innerHTML = '';
            
            // Create bento grid layout
            const bentoGrid = document.createElement('div');
            bentoGrid.className = 'bento-grid';
            
            // Summary - Large feature card
            this._createFeatureCard(bentoGrid, 'Summary', ICONS.SUMMARY, results.summary, 'large');
            
            // Action Items - Interactive card
            this._createActionItemsCard(bentoGrid, results.action_items || []);
            
            // Key Decisions
            this._createListCard(bentoGrid, 'Key Decisions', ICONS.KEY_DECISIONS, results.key_decisions || []);
            
            // Topics
            this._createTopicsCard(bentoGrid, results.topic_segments || []);
            
            // Speaker Insights
            this._createSpeakerInsightsCard(bentoGrid, results.speaker_insights || []);
            
            // Next Steps
            this._createListCard(bentoGrid, 'Next Steps', ICONS.NEXT_STEPS, results.next_steps || []);
            
            // Export Card
            this._createExportCard(bentoGrid);
            
            this.elements.outputContainer.appendChild(bentoGrid);
            
            if (this.elements.resultsSection) {
                this.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }

        _createFeatureCard(container, title, icon, content, size = 'medium') {
            const card = document.createElement('div');
            card.className = `bento-card ${size}`;
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">${icon}</div>
                    <h3 class="card-title">${title}</h3>
                </div>
                <div class="card-content">
                    <p>${content || 'No summary available.'}</p>
                </div>
            `;
            container.appendChild(card);
        }

        _createActionItemsCard(container, actionItems) {
            const card = document.createElement('div');
            card.className = 'bento-card medium action-items-card';
            
            const itemsHtml = actionItems.map((item, index) => `
                <div class="action-item" data-index="${index}">
                    <div class="action-item-header">
                        <input type="checkbox" id="action-${index}" class="action-checkbox">
                        <label for="action-${index}" class="action-text">${item.task || item}</label>
                        ${item.priority ? `<span class="priority-badge priority-${item.priority.toLowerCase()}">${item.priority}</span>` : ''}
                    </div>
                    ${item.assignee || item.deadline ? `
                    <div class="action-details">
                        ${item.assignee ? `<span class="assignee">👤 ${item.assignee}</span>` : ''}
                        ${item.deadline ? `<span class="deadline">📅 ${item.deadline}</span>` : ''}
                    </div>
                    ` : ''}
                </div>
            `).join('');

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">${ICONS.ACTION_ITEMS}</div>
                    <h3 class="card-title">Action Items</h3>
                    <span class="item-count">${actionItems.length}</span>
                </div>
                <div class="card-content">
                    ${itemsHtml || '<p class="empty-state">No action items identified.</p>'}
                </div>
            `;
            
            container.appendChild(card);
        }

        _createListCard(container, title, icon, items) {
            const card = document.createElement('div');
            card.className = 'bento-card small';
            
            const itemsHtml = items.length > 0 
                ? `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`
                : `<p class="empty-state">No ${title.toLowerCase()} identified.</p>`;

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">${icon}</div>
                    <h3 class="card-title">${title}</h3>
                    <span class="item-count">${items.length}</span>
                </div>
                <div class="card-content">
                    ${itemsHtml}
                </div>
            `;
            
            container.appendChild(card);
        }

        _createTopicsCard(container, topics) {
            const card = document.createElement('div');
            card.className = 'bento-card medium';
            
            const topicsHtml = topics.map(topic => `
                <div class="topic-item">
                    <h4 class="topic-title">${topic.topic || topic}</h4>
                    ${topic.summary ? `<p class="topic-summary">${topic.summary}</p>` : ''}
                </div>
            `).join('');

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">${ICONS.TOPICS}</div>
                    <h3 class="card-title">Discussion Topics</h3>
                    <span class="item-count">${topics.length}</span>
                </div>
                <div class="card-content">
                    ${topicsHtml || '<p class="empty-state">No topics identified.</p>'}
                </div>
            `;
            
            container.appendChild(card);
        }

        _createSpeakerInsightsCard(container, speakers) {
            const card = document.createElement('div');
            card.className = 'bento-card medium';
            
            const speakersHtml = speakers.map(speaker => `
                <div class="speaker-item">
                    <div class="speaker-header">
                        <span class="speaker-name">${speaker.speaker || speaker.name || 'Unknown Speaker'}</span>
                        ${speaker.tone ? `<span class="speaker-tone tone-${speaker.tone.toLowerCase()}">${speaker.tone}</span>` : ''}
                    </div>
                    <p class="speaker-contribution">${speaker.contribution_summary || speaker.contribution || ''}</p>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">${ICONS.SPEAKER_INSIGHTS}</div>
                    <h3 class="card-title">Speaker Insights</h3>
                    <span class="item-count">${speakers.length}</span>
                </div>
                <div class="card-content">
                    ${speakersHtml || '<p class="empty-state">No speaker insights identified.</p>'}
                </div>
            `;
            
            container.appendChild(card);
        }

        _createExportCard(container) {
            const card = document.createElement('div');
            card.className = 'bento-card large export-card';
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-icon">${ICONS.EXPORT}</div>
                    <h3 class="card-title">Export & Share</h3>
                </div>
                <div class="card-content">
                    <div class="export-grid">
                        <button class="export-btn primary" data-format="markdown">
                            📋 Copy Markdown
                        </button>
                        <button class="export-btn secondary" data-format="pdf">
                            📄 Download PDF
                        </button>
                        <button class="export-btn secondary" data-format="email">
                            ✉️ Share via Email
                        </button>
                        <button class="export-btn secondary" data-format="calendar">
                            📅 Create Meeting
                        </button>
                        <button class="export-btn secondary" data-format="summary">
                            💬 Copy Summary
                        </button>
                        <button class="export-btn secondary" data-format="json">
                            💾 Download JSON
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        }

        showModal(type) {
            const modal = type === 'email' ? this.elements.emailModal : this.elements.calendarModal;
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        }

        hideModal(type) {
            const modal = type === 'email' ? this.elements.emailModal : this.elements.calendarModal;
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }

        showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        toggleTheme() {
            this.currentTheme = this.currentTheme === CONFIG.THEME.LIGHT ? CONFIG.THEME.DARK : CONFIG.THEME.LIGHT;
            this._applyTheme();
            this._storeTheme();
        }

        _applyTheme() {
            document.documentElement.setAttribute('data-theme', this.currentTheme);
            const icon = this.currentTheme === CONFIG.THEME.DARK ? ICONS.SUN : ICONS.MOON;
            if (this.elements.themeToggle) {
                this.elements.themeToggle.textContent = icon;
            }
        }

        _getStoredTheme() {
            return localStorage.getItem('theme') || CONFIG.THEME.LIGHT;
        }

        _storeTheme() {
            localStorage.setItem('theme', this.currentTheme);
        }

        updateFileInfo(file) {
            if (this.elements.fileInfo) {
                this.elements.fileInfo.innerHTML = `
                    <div class="file-info-content">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${this._formatFileSize(file.size)}</span>
                    </div>
                `;
                this.elements.fileInfo.classList.remove('hidden');
            }
        }

        _formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    }

    // Event Handlers
    class EventHandlers {
        constructor(uiManager) {
            this.ui = uiManager;
            this.api = new APIService();
            this.currentFile = null;
            this.lastResults = null;
            this._initializeEventListeners();
        }

        _initializeEventListeners() {
            // Input handling
            if (this.ui.elements.transcriptInput) {
                this.ui.elements.transcriptInput.addEventListener('input', () => this._handleInputChange());
            }
            if (this.ui.elements.processBtn) {
                this.ui.elements.processBtn.addEventListener('click', () => this.handleProcess());
            }
            
            // File handling
            if (this.ui.elements.fileSelectBtn) {
                this.ui.elements.fileSelectBtn.addEventListener('click', () => {
                    if (this.ui.elements.fileInput) {
                        this.ui.elements.fileInput.click();
                    }
                });
            }
            if (this.ui.elements.fileInput) {
                this.ui.elements.fileInput.addEventListener('change', (e) => this._handleFileSelect(e));
            }
            if (this.ui.elements.uploadArea) {
                this.ui.elements.uploadArea.addEventListener('dragover', (e) => this._handleDragOver(e));
                this.ui.elements.uploadArea.addEventListener('dragleave', (e) => this._handleDragLeave(e));
                this.ui.elements.uploadArea.addEventListener('drop', (e) => this._handleFileDrop(e));
            }
            
            // Theme toggle
            if (this.ui.elements.themeToggle) {
                this.ui.elements.themeToggle.addEventListener('click', () => this.ui.toggleTheme());
            }
            
            // Modal controls
            if (this.ui.elements.closeEmailModal) {
                this.ui.elements.closeEmailModal.addEventListener('click', () => this.ui.hideModal('email'));
            }
            if (this.ui.elements.closeCalendarModal) {
                this.ui.elements.closeCalendarModal.addEventListener('click', () => this.ui.hideModal('calendar'));
            }
            if (this.ui.elements.sendEmailBtn) {
                this.ui.elements.sendEmailBtn.addEventListener('click', () => this.handleSendEmail());
            }
            if (this.ui.elements.createEventBtn) {
                this.ui.elements.createEventBtn.addEventListener('click', () => this.handleCreateEvent());
            }
            
            // Close modals on background click
            if (this.ui.elements.emailModal) {
                this.ui.elements.emailModal.addEventListener('click', (e) => {
                    if (e.target === this.ui.elements.emailModal) this.ui.hideModal('email');
                });
            }
            if (this.ui.elements.calendarModal) {
                this.ui.elements.calendarModal.addEventListener('click', (e) => {
                    if (e.target === this.ui.elements.calendarModal) this.ui.hideModal('calendar');
                });
            }
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => this._handleKeyboardShortcuts(e));
            
            // Export button delegation
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('export-btn')) {
                    this.handleExport(e.target.dataset.format);
                }
            });
            
            // Action item checkboxes
            document.addEventListener('change', (e) => {
                if (e.target.classList.contains('action-checkbox')) {
                    this._handleActionItemToggle(e.target);
                }
            });

            // Drag and drop on the main textarea
            if (this.ui.elements.transcriptInput) {
                this.ui.elements.transcriptInput.addEventListener('dragover', (e) => this._handleTextareaDragOver(e));
                this.ui.elements.transcriptInput.addEventListener('drop', (e) => this._handleTextareaDrop(e));
            }
        }

        _handleInputChange() {
            if (!this.ui.elements.transcriptInput || !this.ui.elements.advancedOptions) return;
            
            const hasContent = this.ui.elements.transcriptInput.value.trim().length > 0;
            if (hasContent && this.ui.elements.advancedOptions.classList.contains('hidden')) {
                this.ui.showAdvancedOptions();
            } else if (!hasContent && !this.ui.elements.advancedOptions.classList.contains('hidden')) {
                this.ui.hideAdvancedOptions();
            }
        }

        async handleProcess() {
            const transcriptText = this.ui.elements.transcriptInput ? this.ui.elements.transcriptInput.value.trim() : '';
            
            if (!transcriptText && !this.currentFile) {
                this.ui.showError('Please provide a transcript or upload a file before analyzing.');
                return;
            }

            try {
                this.ui.showLoading(true);
                
                let results;
                if (this.currentFile) {
                    results = await this.api.processFileUpload(this.currentFile);
                } else {
                    const requestData = {
                        text: transcriptText,
                        meeting_type: this.ui.elements.analysisType ? this.ui.elements.analysisType.value : 'general',
                        participants: this.ui.elements.participants ? 
                            this.ui.elements.participants.value.trim().split(',').map(p => p.trim()).filter(Boolean) : []
                    };
                    results = await this.api.processTextTranscript(requestData);
                }
                
                this.lastResults = results;
                this.ui.displayResults(results);
                
            } catch (error) {
                this.ui.showError(error.message);
            } finally {
                this.ui.showLoading(false);
            }
        }

        _handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) {
                this._processFile(file);
            }
        }

        _handleDragOver(e) {
            e.preventDefault();
            if (this.ui.elements.uploadArea) {
                this.ui.elements.uploadArea.classList.add('dragover');
            }
        }

        _handleDragLeave(e) {
            e.preventDefault();
            if (this.ui.elements.uploadArea) {
                this.ui.elements.uploadArea.classList.remove('dragover');
            }
        }

        _handleFileDrop(e) {
            e.preventDefault();
            if (this.ui.elements.uploadArea) {
                this.ui.elements.uploadArea.classList.remove('dragover');
            }
            const file = e.dataTransfer.files[0];
            if (file) {
                this._processFile(file);
            }
        }

        _handleTextareaDragOver(e) {
            e.preventDefault();
            if (this.ui.elements.uploadArea) {
                this.ui.elements.uploadArea.style.display = 'flex';
                this.ui.elements.uploadArea.classList.add('dragover');
            }
        }

        _handleTextareaDrop(e) {
            e.preventDefault();
            if (this.ui.elements.uploadArea) {
                this.ui.elements.uploadArea.style.display = 'none';
                this.ui.elements.uploadArea.classList.remove('dragover');
            }
            const file = e.dataTransfer.files[0];
            if (file) {
                this._processFile(file);
            }
        }

        _processFile(file) {
            const allowedTypes = CONFIG.ALLOWED_FILE_TYPES;
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(fileExtension)) {
                this.ui.showError(`Unsupported file type. Please use: ${allowedTypes.join(', ')}`);
                return;
            }
            
            this.currentFile = file;
            this.ui.updateFileInfo(file);
            
            // Clear text input when file is selected
            if (this.ui.elements.transcriptInput) {
                this.ui.elements.transcriptInput.value = '';
            }
            this.ui.showAdvancedOptions();
        }

        async handleExport(format) {
            if (!this.lastResults) {
                this.ui.showError('No results to export. Please process a transcript first.');
                return;
            }

            try {
                switch (format) {
                    case 'markdown':
                        this._copyToClipboard(this._generateMarkdown(this.lastResults), 'Markdown copied to clipboard!');
                        break;
                    case 'summary':
                        this._copyToClipboard(this.lastResults.summary, 'Summary copied to clipboard!');
                        break;
                    case 'json':
                        this._downloadJson(this.lastResults);
                        break;
                    case 'pdf':
                        await this._downloadPDF();
                        break;
                    case 'email':
                        this.ui.showModal('email');
                        break;
                    case 'calendar':
                        this.ui.showModal('calendar');
                        break;
                }
            } catch (error) {
                this.ui.showError(`Export failed: ${error.message}`);
            }
        }

        async handleSendEmail() {
            const recipientEmail = this.ui.elements.recipientEmail ? this.ui.elements.recipientEmail.value.trim() : '';
            const subject = this.ui.elements.emailSubject ? this.ui.elements.emailSubject.value.trim() : '';
            
            if (!recipientEmail || !subject) {
                this.ui.showError('Please fill in all email fields.');
                return;
            }
            
            try {
                this.ui.showNotification('Sending email...');
                await this.api.sendEmail({
                    recipient_email: recipientEmail,
                    subject: subject,
                    meeting_data: this.lastResults,
                    include_pdf: this.ui.elements.includePdf ? this.ui.elements.includePdf.checked : false
                });
                
                this.ui.hideModal('email');
                this.ui.showNotification('Email sent successfully!');
                
                // Reset form
                if (this.ui.elements.recipientEmail) this.ui.elements.recipientEmail.value = '';
                if (this.ui.elements.emailSubject) this.ui.elements.emailSubject.value = 'Meeting Analysis Summary';
                
            } catch (error) {
                this.ui.showError(`Email sending failed: ${error.message}`);
            }
        }

        async handleCreateEvent() {
            const title = this.ui.elements.eventTitle ? this.ui.elements.eventTitle.value.trim() : '';
            const dateTime = this.ui.elements.eventDate ? this.ui.elements.eventDate.value : '';
            const duration = this.ui.elements.eventDuration ? parseInt(this.ui.elements.eventDuration.value) : 60;
            const attendeesText = this.ui.elements.eventAttendees ? this.ui.elements.eventAttendees.value.trim() : '';
            
            if (!title || !dateTime) {
                this.ui.showError('Please fill in the event title and date/time.');
                return;
            }
            
            const attendees = attendeesText ? attendeesText.split(',').map(email => email.trim()).filter(Boolean) : [];
            
            try {
                this.ui.showNotification('Creating calendar event...');
                await this.api.createCalendarEvent({
                    title: title,
                    description: `Follow-up meeting based on analysis: ${this.lastResults.summary}`,
                    start_time: new Date(dateTime).toISOString(),
                    duration_minutes: duration,
                    attendees: attendees,
                    meeting_data: this.lastResults
                });
                
                this.ui.hideModal('calendar');
                this.ui.showNotification('Calendar event created successfully!');
                
                // Reset form
                if (this.ui.elements.eventTitle) this.ui.elements.eventTitle.value = '';
                if (this.ui.elements.eventDate) this.ui.elements.eventDate.value = '';
                if (this.ui.elements.eventDuration) this.ui.elements.eventDuration.value = '60';
                if (this.ui.elements.eventAttendees) this.ui.elements.eventAttendees.value = '';
                
            } catch (error) {
                this.ui.showError(`Calendar event creation failed: ${error.message}`);
            }
        }

        _handleActionItemToggle(checkbox) {
            const actionItem = checkbox.closest('.action-item');
            if (actionItem) {
                actionItem.classList.toggle('completed', checkbox.checked);
                
                // You could also send this to your backend to save the state
                const itemIndex = actionItem.dataset.index;
                console.log(`Action item ${itemIndex} ${checkbox.checked ? 'completed' : 'uncompleted'}`);
            }
        }

        _handleKeyboardShortcuts(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleProcess();
            }
            if (e.key === 'Escape') {
                this.ui.hideModal('email');
                this.ui.hideModal('calendar');
            }
        }

        _generateMarkdown(results) {
            let markdown = `# Meeting Analysis\n\n## Summary\n${results.summary || 'No summary available'}\n\n`;
            
            if (results.action_items && results.action_items.length > 0) {
                markdown += `## Action Items\n`;
                results.action_items.forEach(item => {
                    const task = item.task || item;
                    const assignee = item.assignee || 'Unassigned';
                    const priority = item.priority || 'Medium';
                    const deadline = item.deadline || 'No deadline';
                    markdown += `- **${assignee}:** ${task} (Priority: ${priority}, Deadline: ${deadline})\n`;
                });
                markdown += '\n';
            }
            
            if (results.key_decisions && results.key_decisions.length > 0) {
                markdown += `## Key Decisions\n`;
                results.key_decisions.forEach(decision => {
                    markdown += `- ${decision}\n`;
                });
                markdown += '\n';
            }
            
            if (results.next_steps && results.next_steps.length > 0) {
                markdown += `## Next Steps\n`;
                results.next_steps.forEach(step => {
                    markdown += `- ${step}\n`;
                });
            }
            
            return markdown;
        }

        _copyToClipboard(text, message) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    this.ui.showNotification(message);
                }).catch(() => {
                    this.ui.showError('Failed to copy to clipboard');
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    this.ui.showNotification(message);
                } catch (err) {
                    this.ui.showError('Failed to copy to clipboard');
                }
                document.body.removeChild(textArea);
            }
        }

        _downloadJson(data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meeting-analysis-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.ui.showNotification('JSON file downloaded successfully!');
        }

        async _downloadPDF() {
            try {
                this.ui.showNotification('Generating PDF...');
                const blob = await this.api.generatePDF(this.lastResults);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `meeting-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.ui.showNotification('PDF downloaded successfully!');
            } catch (error) {
                throw new Error('PDF generation failed: ' + error.message);
            }
        }
    }

    // Main App Class
    class App {
        constructor() {
            this.ui = null;
            this.handlers = null;
            this.init();
        }

        init() {
            try {
                // Initialize UI manager
                this.ui = new UIManager();
                
                // Initialize event handlers
                this.handlers = new EventHandlers(this.ui);
                
                console.log('🎯 Hunter Squad AI Meeting Assistant initialized successfully!');
                
            } catch (error) {
                console.error('Failed to initialize app:', error);
                this._showInitializationError();
            }
        }

        _showInitializationError() {
            document.body.innerHTML = `
                <div style="
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    font-family: 'Inter', sans-serif;
                    background: #f8f9fa;
                    margin: 0;
                    padding: 20px;
                    box-sizing: border-box;
                ">
                    <div style="
                        text-align: center; 
                        background: white; 
                        padding: 2rem; 
                        border-radius: 12px; 
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                        max-width: 400px;
                    ">
                        <h2 style="color: #e74c3c; margin-bottom: 1rem;">⚠️ Initialization Error</h2>
                        <p style="color: #666; margin-bottom: 1.5rem;">
                            Failed to initialize the application. Please refresh the page and try again.
                        </p>
                        <button onclick="window.location.reload()" style="
                            background: #4A90E2; 
                            color: white; 
                            border: none; 
                            padding: 0.75rem 1.5rem; 
                            border-radius: 8px; 
                            cursor: pointer;
                            font-size: 1rem;
                        ">
                            Reload Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Initialize the application when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });

})(); 