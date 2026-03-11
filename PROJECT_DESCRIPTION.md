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
## Technical Architecture

The application uses the RunAnywhere Web SDK, which provides:

- **LLM (LFM2 350M):** On-device language model for generating responses
- **STT (Whisper Tiny):** Speech-to-text for voice input transcription
- **TTS (Piper):** Text-to-speech for voice output
- **VAD (Silero):** Voice activity detection for automatic speech recognition

All models run locally in the browser via WebAssembly, requiring no external API calls.

## System Architecture
┌───────────────────────────────────────────────────────────────┐
│                        USER DEVICE                            │
│                      (Browser / Laptop)                       │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                        FRONTEND UI                            │
│                         React App                             │
│                                                               │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│   │  AI Tutor   │   │    Chat     │   │    Voice    │         │
│   │   Tab       │   │    Tab      │   │     Tab     │         │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘         │
│          │                 │                 │                │
│          └───────────┬─────┴─────┬───────────┘                │
│                      ▼           ▼                            │
│              Shared Conversation UI                           │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                    GLOBAL STATE LAYER                         │
│                                                               │
│                conversationStore (Singleton)                  │
│                                                               │
│   messages[]      lastTopic        listeners                  │
│   role            context          reactive updates           │
│   text            timestamps                                  │
│                                                               │
│   Ensures conversation persists across tabs                   │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                      AI SERVICE LAYER                         │
│                                                               │
│                    aiService.ts                               │
│                                                               │
│  Handles:                                                     │
│  • Prompt building                                            │
│  • Model selection                                            │
│  • Streaming responses                                        │
│  • Voice pipeline orchestration                               │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                    RUNANYWHERE SDK LAYER                      │
│                                                               │
│  ┌──────────────────┐   ┌──────────────────┐                  │
│  │ @runanywhere/web │   │@runanywhere/web  │                  │
│  │ (Core Runtime)   │   │ -onnx            │                  │
│  │                  │   │                  │                  │
│  │ ModelManager     │   │ Speech Models    │                  │
│  │ RunAnywhere      │   │ STT / TTS        │                  │
│  │ EventBus         │   │ VAD              │                  │
│  └─────────┬────────┘   └─────────┬────────┘                  │
│            │                      │                            │
│            ▼                      ▼                            │
│      ┌──────────────────────────────────────┐                 │
│      │ @runanywhere/web-llamacpp            │                 │
│      │                                      │                 │
│      │ LLM inference engine                 │
│      │ Token streaming                      │
│      │ WebGPU acceleration                  │
│      └──────────────────────────────────────┘
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                    WASM RUNTIME LAYER                         │
│                                                               │
│        ┌──────────────────────────────┐                       │
│        │ sherpa-onnx.wasm             │                       │
│        │ Speech AI runtime            │                       │
│        └──────────────────────────────┘                       │
│                                                               │
│        ┌──────────────────────────────┐                       │
│        │ llama.cpp.wasm               │                       │
│        │ LLM inference engine         │                       │
│        └──────────────────────────────┘                       │
│                                                               │
│        Optional: WebGPU acceleration                          │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                      AI MODEL LAYER                           │
│                                                               │
│   ┌─────────────┬─────────────┬─────────────┬─────────────┐   │
│   │     LLM     │     STT     │     TTS     │     VAD     │   │
│   │             │             │             │             │   │
│   │ LFM2-350M   │ Whisper     │ Piper       │ Silero      │   │
│   │ (GGUF)      │ Tiny (ONNX) │ (ONNX)      │ (ONNX)      │   │
│   │ ~250 MB     │ ~105 MB     │ ~65 MB      │ ~5 MB       │   │
│   └─────────────┴─────────────┴─────────────┴─────────────┘   │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                  AI PROCESSING PIPELINE                       │
│                                                               │
│   Voice Input                                                 │
│       │                                                       │
│       ▼                                                       │
│     VAD ──► detects speech start/end                          │
│       │                                                       │
│       ▼                                                       │
│     STT ──► converts speech to text                           │
│       │                                                       │
│       ▼                                                       │
│     LLM ──► generates explanation / answer                    │
│       │                                                       │
│       ▼                                                       │
│     TTS ──► converts response text to audio                   │
│       │                                                       │
│       ▼                                                       │
│     Speaker / Chat Output                                     │
└───────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                        OFFLINE STORAGE                        │
│                                                               │
│               Browser OPFS (Origin Private FS)                │
│                                                               │
│   Cached Models:                                              │
│   • LLM model (250MB)                                         │
│   • STT model (105MB)                                         │
│   • TTS model (65MB)                                          │
│   • VAD model (5MB)                                           │
│   • WASM runtimes                                             │
│                                                               │
│   Total storage ≈ 425 MB                                      │
│                                                               │
│                ✔ Works fully offline                          │
│                ✔ No server required                           │
│                ✔ Privacy preserving                           │
└───────────────────────────────────────────────────────────────┘
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

## Conclusion

This project addresses critical gaps in modern education by providing an accessible, private, and offline-capable AI tutoring system. It democratizes access to personalized learning assistance and empowers students to learn at their own pace with instant feedback and support.
