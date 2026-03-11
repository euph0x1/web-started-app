# RunAnywhere Web Starter App

A minimal React + TypeScript starter app demonstrating **on-device AI in the browser** using the [`@runanywhere/web`](https://www.npmjs.com/package/@runanywhere/web) SDK. All inference runs locally via WebAssembly — no server, no API key, 100% private.

## Features

| Tab | What it does |
|-----|-------------|
| **AI Tutor** | Interactive AI tutor that helps students understand concepts through voice or text, with automatic quiz generation and re-explanation features. Conversation persists across tab navigation. |
| **Chat** | Stream text from an on-device LLM (LFM2 350M) |
| **Voice** | Speak naturally — VAD detects speech, STT transcribes, LLM responds, TTS speaks back |
| **Tools** | Function calling and structured JSON output with tool orchestration |

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Models are downloaded on first use and cached in the browser's Origin Private File System (OPFS).

## AI Tutor Feature

The **AI Concept and Doubt Clearing Tutor** is a comprehensive educational tool that demonstrates the full power of the RunAnywhere Web SDK. It combines LLM, STT, TTS, and VAD to create a natural conversational learning experience.

### Optimizations & Improvements

- **Fast Response Times**: Optimized LLM parameters (150 max tokens, simplified context) for quicker responses
- **Global State Management**: Conversation history persists across all tabs - switch between AI Tutor, Chat, Voice, and Tools without losing context
- **Reduced Model Size**: Removed VLM/Vision model to improve loading times and reduce memory usage

### Key Features

- **Voice and Text Input**: Students can ask questions by typing or speaking
- **Automatic Voice Detection (VAD)**: The system automatically detects when students start and stop speaking
- **Speech-to-Text**: Converts spoken questions into text for processing
- **Intelligent Tutoring**: Uses the on-device LLM to provide clear, step-by-step explanations with analogies and examples
- **Text-to-Speech**: Reads explanations aloud so students can listen while learning
- **Conversation Context**: Maintains chat history for follow-up questions and context-aware responses
- **Quick Actions**: One-click buttons for common requests:
  - "Give me an example"
  - "Explain it more simply"
  - "I don't understand" (triggers re-explanation with different approach)
  - "Quiz me" (generates understanding check questions)
- **Check Understanding**: Generates quiz questions to verify comprehension
- **Adaptive Re-explanation**: If a student says "I don't understand", the tutor automatically re-explains using a different approach (simpler language, real-world analogy, or step-by-step breakdown)
- **Visual Status Indicators**: Shows current state (listening, processing, speaking, awaiting quiz answer)

### How It Works

1. **Student asks a question** (by typing or speaking)
2. **VAD detects speech** and captures the audio segment
3. **STT transcribes** the question to text
4. **LLM generates** a clear, educational explanation
5. **TTS synthesizes** and plays the response audio
6. **Student can ask follow-ups** with full conversation context

All processing happens locally in the browser - no data leaves the device, ensuring complete privacy.

## How It Works

```
@runanywhere/web (npm package)
  ├── WASM engine (llama.cpp, whisper.cpp, sherpa-onnx)
  ├── Model management (download, OPFS cache, load/unload)
  └── TypeScript API (TextGeneration, STT, TTS, VAD, VLM, VoicePipeline)
```

The app imports everything from `@runanywhere/web`:

```typescript
import { RunAnywhere, SDKEnvironment } from '@runanywhere/web';
import { TextGeneration, VLMWorkerBridge } from '@runanywhere/web-llamacpp';

await RunAnywhere.initialize({ environment: SDKEnvironment.Development });

// Stream LLM text
const { stream } = await TextGeneration.generateStream('Hello!', { maxTokens: 200 });
for await (const token of stream) { console.log(token); }

// VLM: describe an image
const result = await VLMWorkerBridge.shared.process(rgbPixels, width, height, 'Describe this.');
```

## Project Structure

```
src/
├── main.tsx              # React root
├── App.tsx               # Tab navigation (AI Tutor | Chat | Voice | Tools)
├── runanywhere.ts        # SDK init + model catalog
├── store/
│   └── conversationStore.ts  # Global conversation state management
├── hooks/
│   ├── useModelLoader.ts     # Shared model download/load hook
│   └── useConversationStore.ts  # Hook for global conversation state
├── components/
│   ├── TutorTab.tsx       # AI Concept and Doubt Clearing Tutor
│   ├── ChatTab.tsx        # LLM streaming chat
│   ├── VoiceTab.tsx       # Full voice pipeline
│   ├── ToolsTab.tsx       # Function calling and tool orchestration
│   └── ModelBanner.tsx    # Download progress UI
└── styles/
    └── index.css          # Dark theme CSS
```

## Adding Your Own Models

Edit the `MODELS` array in `src/runanywhere.ts`:

```typescript
{
  id: 'my-custom-model',
  name: 'My Model',
  repo: 'username/repo-name',           // HuggingFace repo
  files: ['model.Q4_K_M.gguf'],         // Files to download
  framework: LLMFramework.LlamaCpp,
  modality: ModelCategory.Language,      // or Multimodal, SpeechRecognition, etc.
  memoryRequirement: 500_000_000,        // Bytes
}
```

Any GGUF model compatible with llama.cpp works for LLM/VLM. STT/TTS/VAD use sherpa-onnx models.

## Deployment

### Vercel

```bash
npm run build
npx vercel --prod
```

The included `vercel.json` sets the required Cross-Origin-Isolation headers.

### Netlify

Add a `_headers` file:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

### Any static host

Serve the `dist/` folder with these HTTP headers on all responses:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

## Browser Requirements

- Chrome 96+ or Edge 96+ (recommended: 120+)
- WebAssembly (required)
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS (for persistent model cache)

## Documentation

- [SDK API Reference](https://docs.runanywhere.ai)
- [npm package](https://www.npmjs.com/package/@runanywhere/web)
- [GitHub](https://github.com/RunanywhereAI/runanywhere-sdks)

## License

MIT

