import { CONFIG } from './config.js';

export class APIService {
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