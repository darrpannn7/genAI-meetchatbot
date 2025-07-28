import { CONFIG } from './config.js';
import { APIService } from './api.js';

export class EventHandlers {
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