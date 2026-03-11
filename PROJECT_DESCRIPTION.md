# AI Concept and Doubt Clearing Tutor

## Project Description

A web-based **AI Concept and Doubt Clearing Tutor** built with the RunAnywhere Web SDK that helps students understand academic concepts through natural voice interaction. The application uses on-device AI (LLM, STT, TTS, VAD) to create a conversational learning experience that works locally in the browser without requiring internet connectivity after initial setup.

---

## Problem Statement

### 1. Limited Access to Personal Tutoring
Students often cannot get personalized help when learning new concepts. Teachers have limited time, private tutoring is expensive, and many questions go unanswered, leading to gaps in understanding.

### 2. Difficulty Understanding Complex Concepts
Students struggle with abstract or technical topics. Textbooks are too complex, and there is no one to explain in simple terms. Different students need different explanations.

### 3. Lack of Immediate Feedback
Students have no way to verify if they truly understand a concept. Mistakes go uncorrected, and there is no mechanism to test comprehension.

### 4. Communication Barriers
Some students have difficulty typing or prefer speaking. Students with visual impairments cannot rely solely on text-based learning.

### 5. Privacy and Security Concerns
Many online educational tools collect student data and send information to external servers, raising privacy concerns for schools and parents.

### 6. Internet Dependency
Many educational tools require constant internet connection, making them inaccessible to students in rural areas or schools with limited connectivity.

---

## Solution

An AI-powered tutor that:
- Provides 24/7 unlimited Q&A for any academic concept
- Explains using analogies, examples, and simple language
- Automatically re-teaches when student is confused
- Generates quiz questions to verify understanding
- Supports voice input and output for accessibility
- Works completely offline after initial download
- Ensures 100% privacy - no data ever leaves the browser

---

## Key Features

### Core Features
1. **Multi-modal Input** - Ask questions via text or voice
2. **Voice Activity Detection (VAD)** - Automatic speech detection using Silero VAD
3. **Speech-to-Text (STT)** - Transcribe voice input using Whisper
4. **Intelligent Explanations** - AI generates clear, step-by-step explanations
5. **Text-to-Speech (TTS)** - Read explanations aloud using Piper TTS
6. **Conversation Context** - Maintain history for follow-up questions
7. **Quick Actions** - One-click buttons for examples, simplifications, or quizzes
8. **Check Understanding** - Generate quiz questions to verify comprehension
9. **Adaptive Re-explanation** - Automatically re-teach when confused
10. **Offline Mode** - Works without internet after initial model download
11. **Privacy First** - All processing happens on-device

### User Experience Features
- Modern ChatGPT-like interface
- Welcome screen with suggested questions
- Smooth animations and transitions
- Rich text formatting in responses
- Responsive design for mobile and desktop

---

## What Makes This Solution Unique?

### 1. 100% On-Device Processing
Most AI tutoring solutions require sending data to external servers. This solution processes everything locally using WebAssembly, ensuring data never leaves the user's device.

### 2. Complete Privacy
- No data sent to cloud
- No conversations stored externally
- Compliant with educational data protection requirements
- Safe for schools and children

### 3. Works Without Internet
After downloading AI models once (~425 MB), the application works completely offline. Perfect for rural schools, developing countries, and low-connectivity areas.

### 4. Voice-First Experience
Complete voice pipeline:
1. **VAD** - Automatically detects when user starts/stops speaking
2. **STT** - Transcribes speech to text
3. **LLM** - Generates educational response
4. **TTS** - Speaks the answer back

### 5. Adaptive Teaching
- Student says "I don't understand" → Tutor re-explains with different approach
- Student clicks "Quiz Me" → Tutor generates relevant quiz question
- Student clicks "Simpler" → Tutor simplifies the explanation

### 6. No Costs
- No API keys required
- No monthly subscriptions
- No usage limits
- Free forever

---

## Technical Architecture

### Technology Stack
- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **AI SDK:** RunAnywhere Web SDK
- **Styling:** Custom CSS (Dark Theme)

### AI Models Used

| Model | Purpose | Size | Technology |
|-------|---------|------|------------|
| LFM2 350M | Language Model | ~250 MB | GGUF (llama.cpp) |
| Whisper Tiny | Speech-to-Text | ~105 MB | ONNX (sherpa-onnx) |
| Piper TTS | Text-to-Speech | ~65 MB | ONNX (sherpa-onnx) |
| Silero VAD | Voice Detection | ~5 MB | ONNX (sherpa-onnx) |

**Total:** ~425 MB (cached in browser OPFS)

### Processing Pipeline

```
User Input (Text or Voice)
           │
           ▼
┌──────────────────┐
│       VAD        │ ← Silero VAD detects speech start/end
│  (Voice Input)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│       STT        │ ← Whisper transcribes audio to text
│ (Speech-to-Text) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│       LLM        │ ← LFM2 350M generates educational response
│  (Text Generation)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│       TTS        │ ← Piper synthesizes speech
│ (Text-to-Speech) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Audio Playback  │ ← Plays audio through speakers
└──────────────────┘
```

### File Structure

```
src/
├── main.tsx                      # React entry point
├── App.tsx                       # Tab navigation
├── runanywhere.ts                # SDK initialization + model catalog
│
├── store/
│   └── conversationStore.ts      # Global conversation state
│
├── hooks/
│   ├── useModelLoader.ts        # Model download/load hook
│   └── useConversationStore.ts # Global state hook
│
├── components/
│   ├── TutorTab.tsx            # AI Tutor (main feature)
│   ├── ChatTab.tsx             # Simple LLM chat
│   ├── VoiceTab.tsx            # Voice conversation demo
│   ├── ToolsTab.tsx            # Function calling demo
│   └── ModelBanner.tsx         # Download progress UI
│
└── styles/
    └── index.css               # All CSS styles
```

---

## Target Audience

| User Group | Need Addressed |
|------------|----------------|
| K-12 Students | Instant answers to homework questions |
| College Students | Supplement classroom learning |
| Self-learners | Learn at their own pace |
| Schools | Safe, private AI assistant |
| Remote Learners | Works without reliable internet |
| Students with Disabilities | Voice-based interaction |

---

## Impact Summary

| Before | After |
|--------|-------|
| Limited questions due to teacher availability | Unlimited 24/7 Q&A |
| Text-only interaction | Natural voice conversation |
| Data sent to external servers | 100% private |
| Doesn't work offline | Works without internet |
| Basic demo UI | Modern, engaging interface |
| No knowledge verification | Quiz mode to check understanding |
| One-size-fits-all explanations | Adaptive explanations |

---

## Getting Started

### Prerequisites
- Chrome 96+ or Edge 96+ (recommended: 120+)
- WebAssembly support
- ~500 MB storage space

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd web-started-app

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
http://localhost:5173
```

### First-Time Setup
1. Open the application
2. Click on "AI Tutor" tab
3. Models will download automatically (~425 MB)
4. Once complete, start asking questions!

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 96+ | Fully supported |
| Edge | 96+ | Fully supported |
| Firefox | 119+ | Supported (no WebGPU) |
| Safari | 17+ | Basic support |

---

## License

MIT License

---

## Documentation

- [RunAnywhere Documentation](https://docs.runanywhere.ai)
- [AI Tutor User Guide](./AI_TUTOR_GUIDE.md)
