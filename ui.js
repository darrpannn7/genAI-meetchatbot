import { CONFIG, ICONS } from './config.js';

export class UIManager {
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
            this.elements.themeToggle.innerHTML = icon;
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