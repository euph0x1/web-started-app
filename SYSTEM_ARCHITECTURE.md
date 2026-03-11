# System Architecture

## Overview

This document provides a comprehensive overview of the AI Concept and Doubt Clearing Tutor system architecture, showing how all components work together to deliver an intelligent, offline-capable educational experience.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER DEVICE                            │
│                      (Browser / Laptop)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND UI                            │
│                         React App                             │
│                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│   │  AI Tutor   │   │    Chat     │   │    Voice    │     │
│   │   Tab       │   │    Tab      │   │     Tab     │     │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│          │                 │                 │              │
│          └───────────┬─────┴─────┬───────────┘              │
│                      ▼           ▼                          │
│              Shared Conversation UI                           │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    GLOBAL STATE LAYER                         │
│                                                              │
│                conversationStore (Singleton)                  │
│                                                              │
│   messages[]      lastTopic        listeners                  │
│   role            context          reactive updates           │
│   text            timestamps                                  │
│                                                              │
│   Ensures conversation persists across tabs                   │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI SERVICE LAYER                         │
│                                                              │
│                    aiService.ts                               │
│                                                              │
│  Handles:                                                    │
│  • Prompt building                                           │
│  • Model selection                                           │
│  • Streaming responses                                       │
│  • Voice pipeline orchestration                              │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    RUNANYWHERE SDK LAYER                      │
│                                                              │
│  ┌──────────────────┐   ┌──────────────────┐                  │
│  │ @runanywhere/web │   │@runanywhere/web │                  │
│  │ (Core Runtime)   │   │ -onnx           │                  │
│  │                  │   │                  │                  │
│  │ ModelManager     │   │ Speech Models    │                  │
│  │ RunAnywhere      │   │ STT / TTS       │                  │
│  │ EventBus         │   │ VAD              │                  │
│  └─────────┬────────┘   └─────────┬────────┘                  │
│            │                      │                            │
│            ▼                      ▼                            │
│      ┌──────────────────────────────────────┐                 │
│      │ @runanywhere/web-llamacpp            │                 │
│      │                                      │                 │
│      │ LLM inference engine                 │                 │
│      │ Token streaming                      │                 │
│      │ WebGPU acceleration                 │                 │
│      └──────────────────────────────────────┘
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    WASM RUNTIME LAYER                         │
│                                                              │
│        ┌──────────────────────────────┐                       │
│        │ sherpa-onnx.wasm             │                       │
│        │ Speech AI runtime           │                       │
│        └──────────────────────────────┘                       │
│                                                              │
│        ┌──────────────────────────────┐                       │
│        │ llama.cpp.wasm              │                       │
│        │ LLM inference engine        │                       │
│        └──────────────────────────────┘                       │
│                                                              │
│        Optional: WebGPU acceleration                          │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI MODEL LAYER                           │
│                                                              │
│   ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│   │     LLM     │     STT     │     TTS     │     VAD     │ │
│   │             │             │             │             │ │
│   │ LFM2-350M  │ Whisper    │ Piper      │ Silero      │ │
│   │ (GGUF)     │ Tiny       │ (ONNX)     │ (ONNX)      │ │
│   │             │ (ONNX)     │             │             │ │
│   │ ~250 MB    │ ~105 MB    │ ~65 MB     │ ~5 MB       │ │
│   └─────────────┴─────────────┴─────────────┴─────────────┘ │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI PROCESSING PIPELINE                       │
│                                                              │
│   Voice Input                                                │
│       │                                                      │
│       ▼                                                      │
│     VAD ──► detects speech start/end                         │
│       │                                                      │
│       ▼                                                      │
│     STT ──► converts speech to text                          │
│       │                                                      │
│       ▼                                                      │
│     LLM ──► generates explanation / answer                   │
│       │                                                      │
│       ▼                                                      │
│     TTS ──► converts response text to audio                   │
│       │                                                      │
│       ▼                                                      │
│     Speaker / Chat Output                                    │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        OFFLINE STORAGE                        │
│                                                              │
│               Browser OPFS (Origin Private FS)                │
│                                                              │
│   Cached Models:                                             │
│   • LLM model (250MB)                                       │
│   • STT model (105MB)                                       │
│   • TTS model (65MB)                                        │
│   • VAD model (5MB)                                         │
│   • WASM runtimes                                            │
│                                                              │
│   Total storage ≈ 425 MB                                     │
│                                                              │
│                ✔ Works fully offline                         │
│                ✔ No server required                          │
│                ✔ Privacy preserving                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Descriptions

### 1. Frontend UI Layer

The React-based user interface provides multiple interaction tabs:

| Component | Description |
|-----------|-------------|
| **AI Tutor Tab** | Main educational interface with voice/text input |
| **Chat Tab** | Simple LLM conversation interface |
| **Voice Tab** | Voice-only conversation demo |
| **Tools Tab** | Function calling demonstration |

**Key Features:**
- Tab-based navigation
- Shared conversation state
- Responsive design
- Modern chat interface

---

### 2. Global State Layer

Manages application state across all components:

```
┌─────────────────────────────────────────┐
│       conversationStore (Singleton)       │
├─────────────────────────────────────────┤
│                                          │
│  Properties:                             │
│  ┌─────────────────────────────────┐   │
│  │ messages: Message[]             │   │
│  │   - role: 'user' | 'assistant' │   │
│  │   - text: string               │   │
│  │   - timestamp: number          │   │
│  │   - isQuiz?: boolean          │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ lastTopic: string               │   │
│  │ (for re-explanation)           │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ listeners: Set<() => void>     │   │
│  │ (reactive updates)             │   │
│  └─────────────────────────────────┘   │
│                                          │
│  Methods:                               │
│  • getMessages()                        │
│  • addMessage()                         │
│  • updateMessage()                      │
│  • subscribe(listener)                  │
│  • clearConversation()                  │
│                                          │
└─────────────────────────────────────────┘
```

**Purpose:** Ensures conversation history persists when switching between tabs

---

### 3. AI Service Layer

Handles business logic for AI interactions:

| Function | Description |
|----------|-------------|
| Prompt Building | Constructs system prompts with context |
| Model Selection | Chooses appropriate model for task |
| Streaming | Handles token-by-token response streaming |
| Voice Pipeline | Orchestrates VAD → STT → LLM → TTS |

---

### 4. RunAnywhere SDK Layer

Core SDK providing AI capabilities:

#### Core Package (`@runanywhere/web`)
- Model management
- Event system
- Voice pipeline orchestration

#### ONNX Package (`@runanywhere/web-onnx`)
- **STT:** Whisper for speech recognition
- **TTS:** Piper for voice synthesis
- **VAD:** Silero for voice detection

#### LlamaCpp Package (`@runanywhere/web-llamacpp`)
- LLM inference engine
- Token streaming
- WebGPU acceleration

---

### 5. WASM Runtime Layer

WebAssembly runtimes for browser-based AI:

| Runtime | Purpose |
|---------|---------|
| `sherpa-onnx.wasm` | Speech AI (STT, TTS, VAD) |
| `llama.cpp.wasm` | LLM text generation |
| `llama.cpp-webgpu.wasm` | GPU-accelerated LLM |

---

### 6. AI Model Layer

All models run locally in the browser:

| Model | Type | Size | Purpose |
|-------|------|------|---------|
| **LFM2-350M** | LLM | ~250 MB | Text generation |
| **Whisper Tiny** | STT | ~105 MB | Speech-to-text |
| **Piper TTS** | TTS | ~65 MB | Text-to-speech |
| **Silero VAD** | VAD | ~5 MB | Voice detection |

---

## Data Flow

### Text Input Flow

```
User types question
       │
       ▼
React Component captures input
       │
       ▼
processUserInput() function
       │
       ▼
Build system prompt + context
       │
       ▼
TextGeneration.generateStream()
       │
       ├── Token 1 ──► Stream to UI
       ├── Token 2 ──► Stream to UI
       ├── Token 3 ──► Stream to UI
       └── ... ──────► Stream to UI
       │
       ▼
Complete response generated
       │
       ├──► Display in chat
       │
       └──► TTS.synthesize() ──► AudioPlayback
```

### Voice Input Flow

```
User clicks microphone
       │
       ▼
AudioCapture starts (16kHz)
       │
       ▼
VAD.processSamples() continuously
       │
       ├── Speech starts detected
       │       │
       │       ▼
       │   Capture audio segment
       │
       └── Speech ends detected
               │
               ▼
           VAD.popSpeechSegment()
               │
               ▼
           STT.transcribe(audio)
               │
               ▼
           "transcribed text"
               │
               ▼
           processUserInput(text)
               │
               ▼
           (Same as text flow)
```

---

## Offline Storage

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser OPFS Storage                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /opfs/                                                    │
│  ├── models/                                               │
│  │   ├── lfm2-350m-q4_k_m.gguf  (250 MB)                 │
│  │   ├── whisper-tiny/             (105 MB)               │
│  │   ├── piper-voice/              (65 MB)                │
│  │   └── silero-vad.onnx           (5 MB)                 │
│  │                                                        │
│  └── wasm/                                                 │
│      ├── sherpa-onnx.wasm          (12 MB)                 │
│      └── llama.cpp.wasm            (4 MB)                 │
│                                                              │
│  Total: ~441 MB                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Interaction Diagram              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   TutorTab.tsx                                             │
│   ├── uses: useConversationStore() ──► conversationStore    │
│   │                                      │                  │
│   │                                      ▼                  │
│   │                            ┌─────────────────┐          │
│   │                            │ TextGeneration │          │
│   │                            │   (LLM)        │          │
│   │                            └────────┬────────┘          │
│   │                                     │                   │
│   ├── uses: useModelLoader() ──► ModelManager               │
│   │                                      │                   │
│   │                                      ▼                   │
│   │                            ┌─────────────────┐          │
│   │                            │    VAD         │          │
│   │                            │  (Voice)       │          │
│   │                            └────────┬────────┘          │
│   │                                     │                   │
│   │                                     ▼                   │
│   │                            ┌─────────────────┐          │
│   │                            │     STT        │          │
│   │                            │  (Speech)      │          │
│   │                            └────────┬────────┘          │
│   │                                     │                   │
│   │                                     ▼                   │
│   │                            ┌─────────────────┐          │
│   │                            │     TTS        │          │
│   │                            │  (Speech)       │          │
│   │                            └────────┬────────┘          │
│   │                                     │                   │
│   │                                     ▼                   │
│   │                            ┌─────────────────┐          │
│   │                            │ AudioPlayback   │          │
│   │                            │  (Speaker)      │          │
│   │                            └─────────────────┘          │
│   │                                                     │
│   └── JSX UI ──► Browser DOM ──► User sees response         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Security & Privacy

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                   USER DEVICE                        │  │
│   │                                                      │  │
│   │   ┌────────────────────────────────────────────┐    │  │
│   │   │         Browser Sandbox                     │    │  │
│   │   │                                              │    │  │
│   │   │  ┌──────────────────────────────────────┐  │    │  │
│   │   │  │         Application Code             │  │    │  │
│   │   │  │                                      │  │    │  │
│   │   │  │  • React App                        │  │    │  │
│   │   │  │  • RunAnywhere SDK                  │  │    │  │
│   │   │  │  • AI Models                        │  │    │  │
│   │   │  │  • User Data                        │  │    │  │
│   │   │  │                                      │  │    │  │
│   │   │  └──────────────────────────────────────┘  │    │  │
│   │   │                    │                         │    │  │
│   │   │                    │                         │    │  │
│   │   │         ┌──────────▼──────────┐             │    │  │
│   │   │         │   Browser APIs     │             │    │  │
│   │   │         │   (No network)     │             │    │  │
│   │   │         └─────────────────────┘             │    │  │
│   │   │                                              │    │  │
│   │   └────────────────────────────────────────────┘    │  │
│   │                                                      │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                              │
│   Data Flow:                                                │
│   ┌─────────────────────────────────────────────────┐     │
│   │  Input ──► Processing ──► Output                │     │
│   │                                                     │     │
│   │  All happens INSIDE the browser                  │     │
│   │  NO data sent to ANY external server             │     │
│   └─────────────────────────────────────────────────┘     │
│                                                              │
│   Privacy Guarantees:                                       │
│   ✓ No API calls to external servers                       │
│   ✓ No user data stored externally                         │
│   ✓ No analytics or tracking                              │
│   ✓ Works completely offline                              │
│   ✓ Safe for children and schools                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This architecture enables:

| Capability | Implementation |
|------------|----------------|
| **Offline-first** | Models cached in browser OPFS |
| **Privacy-focused** | All processing in-browser |
| **Voice-enabled** | Complete VAD → STT → TTS pipeline |
| **Responsive** | React with streaming responses |
| **Persistent** | Global state across tabs |
| **Scalable** | WebAssembly-based AI engines |
| **Accessible** | Voice input/output support |

---

## Related Documentation

- [PROJECT_DESCRIPTION.md](./PROJECT_DESCRIPTION.md)
- [AI_TUTOR_GUIDE.md](./AI_TUTOR_GUIDE.md)
- [RunAnywhere Documentation](https://docs.runanywhere.ai)
