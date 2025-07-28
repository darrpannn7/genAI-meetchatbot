from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
import os
import re
import json
from datetime import datetime, timedelta
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from typing import List, Optional
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import tempfile

# Optional email imports - only import if needed
EMAIL_AVAILABLE = True
try:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.base import MIMEBase
    from email import encoders
except ImportError:
    EMAIL_AVAILABLE = False
    print("Email functionality disabled - missing email libraries")

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Set up the FastAPI app
app = FastAPI(title="AI Meeting Assistant", description="Transform meeting transcripts into actionable insights")

# Meeting Templates
MEETING_TEMPLATES = {
    "standup": {
        "focus": "daily progress, blockers, and next steps",
        "extra_instructions": """
        Pay special attention to:
        - What each person accomplished yesterday
        - What they're working on today
        - Any blockers or impediments
        - Dependencies between team members
        """
    },
    "planning": {
        "focus": "project planning, task allocation, and timeline setting",
        "extra_instructions": """
        Pay special attention to:
        - Project goals and objectives
        - Task breakdowns and assignments
        - Timeline and milestone discussions
        - Resource allocation decisions
        """
    },
    "retrospective": {
        "focus": "team reflection, what went well, what didn't, and improvements",
        "extra_instructions": """
        Pay special attention to:
        - What went well in the previous period
        - What didn't go well or caused problems
        - Specific improvement actions
        - Process changes or experiments to try
        """
    },
    "client": {
        "focus": "client requirements, project updates, and relationship management",
        "extra_instructions": """
        Pay special attention to:
        - Client feedback and requirements
        - Project status updates
        - Budget or timeline discussions
        - Next steps and deliverables
        """
    },
    "brainstorm": {
        "focus": "creative ideas, problem-solving, and innovation",
        "extra_instructions": """
        Pay special attention to:
        - Creative ideas and solutions proposed
        - Problem statements and challenges
        - Evaluation criteria for ideas
        - Next steps for promising concepts
        """
    }
}

# Enhanced Pydantic models
class ActionItem(BaseModel):
    task: str
    assignee: str
    deadline: str
    priority: str
    context: str

class TopicSegment(BaseModel):
    topic: str
    summary: str
    participants: List[str]
    duration_discussed: str

class SpeakerInsight(BaseModel):
    speaker: str
    contribution_summary: str
    tone: str
    key_points: List[str]

class MeetingOutput(BaseModel):
    summary: str
    action_items: List[ActionItem]
    key_decisions: List[str]
    topic_segments: List[TopicSegment]
    speaker_insights: List[SpeakerInsight]
    meeting_sentiment: str
    next_steps: List[str]

# Request models
class Transcript(BaseModel):
    text: str
    meeting_type: Optional[str] = "general"
    participants: Optional[List[str]] = []

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    meeting_data: dict
    include_pdf: Optional[bool] = True

class CalendarEventRequest(BaseModel):
    title: str
    description: str
    start_time: datetime
    duration_minutes: int
    attendees: List[EmailStr]
    meeting_data: dict

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enhanced deadline inference function
def enhance_deadline_context(transcript_text: str) -> str:
    """Add contextual information about dates and deadlines to help the AI"""
    today = datetime.now()
    
    deadline_context = f"""
    
CONTEXTUAL DATE INFORMATION:
- Today is {today.strftime('%A, %B %d, %Y')}
- This week ends on {(today + timedelta(days=(6-today.weekday()))).strftime('%A, %B %d, %Y')}
- Next week starts on {(today + timedelta(days=(7-today.weekday()))).strftime('%A, %B %d, %Y')}
- End of month: {(today.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)}

DEADLINE INTERPRETATION GUIDE:
- "by tomorrow" = {(today + timedelta(days=1)).strftime('%B %d, %Y')}
- "end of week" = {(today + timedelta(days=(6-today.weekday()))).strftime('%B %d, %Y')}
- "next week" = week of {(today + timedelta(days=(7-today.weekday()))).strftime('%B %d, %Y')}
- "by Friday" = {(today + timedelta(days=(4-today.weekday()) if today.weekday() <= 4 else (11-today.weekday()))).strftime('%B %d, %Y')}

"""
    return transcript_text + deadline_context

# Initialize the output parser
parser = PydanticOutputParser(pydantic_object=MeetingOutput)

# Enhanced prompt template with meeting type awareness
def create_meeting_prompt(meeting_type: str = "general"):
    template_info = MEETING_TEMPLATES.get(meeting_type, {
        "focus": "general meeting analysis",
        "extra_instructions": ""
    })
    
    prompt_template = f"""
You are an expert meeting assistant specialized in {template_info['focus']}. Analyze the following transcript comprehensively.

{template_info['extra_instructions']}

ANALYSIS REQUIREMENTS:
1. **Summary**: Create a concise yet comprehensive summary highlighting the meeting's purpose and outcomes
2. **Action Items**: Extract specific tasks with detailed context:
   - Use the contextual date information to infer realistic deadlines
   - Identify assignees from speaker patterns and explicit assignments
   - Assess priority based on urgency indicators and context
   - Provide context about why this task is important
3. **Key Decisions**: Identify concrete decisions made, not just discussed topics
4. **Topic Segments**: Break down the meeting into distinct discussion topics:
   - Identify who contributed to each topic
   - Estimate relative time spent on each topic
5. **Speaker Insights**: For each identified speaker:
   - Summarize their main contributions
   - Assess their tone (professional, enthusiastic, concerned, etc.)
   - List their key points
6. **Meeting Sentiment**: Overall tone (productive, tense, collaborative, etc.)
7. **Next Steps**: High-level follow-up actions beyond specific tasks

SPEAKER IDENTIFICATION HINTS:
- Look for patterns like "John said", "Sarah mentioned", "According to Mike"
- Identify speakers from dialogue patterns and context clues
- If no explicit names, use descriptive labels like "Project Manager", "Developer", "Client"

DEADLINE INFERENCE GUIDELINES:
- Use the provided contextual date information
- Convert relative dates to specific dates
- If no deadline mentioned, analyze urgency and suggest reasonable timeframes
- Mark unclear deadlines as "To be confirmed" with suggested timeframe

{{format_instructions}}

TRANSCRIPT TO ANALYZE:
---
{{transcript}}
---
"""
    
    return ChatPromptTemplate.from_template(
        template=prompt_template,
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )

# Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash", 
    google_api_key=os.getenv("GOOGLE_API_KEY"), 
    temperature=0.1,
    max_output_tokens=4096
)

@app.get("/api/templates")
def get_meeting_templates():
    """Get available meeting templates"""
    return {
        "templates": [
            {"id": key, "name": key.title(), "description": value["focus"]} 
            for key, value in MEETING_TEMPLATES.items()
        ]
    }

@app.post("/api/process", response_model=MeetingOutput)
async def process_transcript(transcript: Transcript):
    """Processes a meeting transcript with enhanced analysis capabilities."""
    try:
        # Create meeting-type specific prompt
        prompt = create_meeting_prompt(transcript.meeting_type)
        chain = prompt | llm | parser
        
        # Enhance the transcript with deadline context
        enhanced_transcript = enhance_deadline_context(transcript.text)
        
        # Add participant context if provided
        if transcript.participants:
            participant_context = f"\n\nKNOWN PARTICIPANTS: {', '.join(transcript.participants)}"
            enhanced_transcript += participant_context
        
        # Add meeting type context
        type_context = f"\n\nMEETING TYPE: {transcript.meeting_type}"
        enhanced_transcript += type_context
        
        response = await chain.ainvoke({"transcript": enhanced_transcript})
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/api/upload")
async def upload_transcript_file(file: UploadFile = File(...)):
    """Upload and process a transcript file (.txt, .vtt, .srt formats supported)."""
    try:
        # Validate file type
        allowed_extensions = ['.txt', '.vtt', '.srt']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # Basic cleaning for VTT and SRT files
        if file_extension in ['.vtt', '.srt']:
            text_content = clean_subtitle_format(text_content)
        
        # Process the transcript
        transcript = Transcript(text=text_content)
        
        # Create prompt and process
        prompt = create_meeting_prompt(transcript.meeting_type)
        chain = prompt | llm | parser
        enhanced_transcript = enhance_deadline_context(transcript.text)
        
        response = await chain.ainvoke({"transcript": enhanced_transcript})
        return response
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding not supported. Please use UTF-8.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@app.post("/api/export/pdf")
async def export_pdf(meeting_data: dict):
    """Generate a PDF report of the meeting analysis"""
    try:
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        
        # Generate PDF
        doc = SimpleDocTemplate(temp_file.name, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#4A90E2')
        )
        story.append(Paragraph("Meeting Analysis Report", title_style))
        story.append(Spacer(1, 20))
        
        # Summary
        story.append(Paragraph("Summary", styles['Heading2']))
        story.append(Paragraph(meeting_data.get('summary', ''), styles['Normal']))
        story.append(Spacer(1, 15))
        
        # Action Items
        story.append(Paragraph("Action Items", styles['Heading2']))
        action_items = meeting_data.get('action_items', [])
        if action_items:
            for i, item in enumerate(action_items, 1):
                story.append(Paragraph(f"{i}. <b>{item.get('task', '')}</b>", styles['Normal']))
                story.append(Paragraph(f"   Assignee: {item.get('assignee', '')}", styles['Normal']))
                story.append(Paragraph(f"   Deadline: {item.get('deadline', '')}", styles['Normal']))
                story.append(Paragraph(f"   Priority: {item.get('priority', '')}", styles['Normal']))
                story.append(Spacer(1, 10))
        
        # Key Decisions
        story.append(Paragraph("Key Decisions", styles['Heading2']))
        decisions = meeting_data.get('key_decisions', [])
        for i, decision in enumerate(decisions, 1):
            story.append(Paragraph(f"{i}. {decision}", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        return FileResponse(
            temp_file.name, 
            filename=f"meeting-analysis-{datetime.now().strftime('%Y%m%d')}.pdf",
            media_type="application/pdf"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@app.post("/api/email/send")
async def send_email(request: EmailRequest):
    """Send meeting summary via email"""
    if not EMAIL_AVAILABLE:
        raise HTTPException(status_code=500, detail="Email functionality not available")
    
    try:
        # Email configuration
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        sender_email = os.getenv("SENDER_EMAIL")
        sender_password = os.getenv("SENDER_PASSWORD")
        
        if not all([sender_email, sender_password]):
            raise HTTPException(status_code=500, detail="Email configuration missing")
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = request.recipient_email
        msg['Subject'] = request.subject
        
        # Email body
        body = f"""
        Meeting Analysis Summary
        
        Summary: {request.meeting_data.get('summary', '')}
        
        Action Items:
        """
        
        for i, item in enumerate(request.meeting_data.get('action_items', []), 1):
            body += f"\n{i}. {item.get('task', '')} (Assignee: {item.get('assignee', '')}, Deadline: {item.get('deadline', '')})"
        
        body += f"\n\nKey Decisions:\n"
        for i, decision in enumerate(request.meeting_data.get('key_decisions', []), 1):
            body += f"{i}. {decision}\n"
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, request.recipient_email, text)
        server.quit()
        
        return {"message": "Email sent successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email sending failed: {str(e)}")

@app.post("/api/calendar/create-event")
async def create_calendar_event(request: CalendarEventRequest):
    """Create a Google Calendar event for follow-up meeting"""
    try:
        # This is a simplified version - in production you'd need proper OAuth flow
        return {
            "message": "Calendar integration ready - OAuth setup required",
            "event_details": {
                "title": request.title,
                "start_time": request.start_time.isoformat(),
                "duration": request.duration_minutes,
                "attendees": request.attendees
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calendar event creation failed: {str(e)}")

def clean_subtitle_format(content: str) -> str:
    """Clean VTT and SRT subtitle formats to extract just the spoken text."""
    lines = content.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        # Skip timestamp lines, cue settings, and empty lines
        if (line and 
            not re.match(r'^\d+$', line) and  # SRT sequence numbers
            not re.match(r'\d{2}:\d{2}:\d{2}', line) and  # Timestamps
            not line.startswith('WEBVTT') and  # VTT header
            not line.startswith('NOTE') and  # VTT notes
            not '-->' in line):  # Timeline indicators
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)

@app.get("/")
def read_root():
    return {
        "message": "AI Meeting Assistant Backend", 
        "version": "2.1",
        "features": [
            "Enhanced transcript analysis",
            "Meeting templates",
            "PDF export",
            "Email integration" if EMAIL_AVAILABLE else "Email integration (disabled)", 
            "Calendar integration",
            "Speaker identification", 
            "Topic segmentation",
            "Smart deadline inference",
            "File upload support",
            "Comprehensive meeting insights"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()} 