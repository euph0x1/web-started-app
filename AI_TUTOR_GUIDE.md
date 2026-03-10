# AI Concept and Doubt Clearing Tutor - User Guide

## Overview

The AI Tutor is an interactive learning assistant built with the RunAnywhere Web SDK. It uses on-device AI models to provide a natural, conversational learning experience that helps students understand academic concepts through explanations, examples, and quizzes.

**New in this version:**
- **Persistent Conversations**: Conversation history is maintained globally and persists when switching between tabs (AI Tutor, Chat, Voice, Tools)
- **Faster Response Times**: Optimized LLM parameters for quicker responses (150 tokens vs 300)
- **Reduced Memory Usage**: Removed VLM/Vision model, reducing total download from ~925 MB to ~425 MB

## Key Technologies

- **LLM (Language Model)**: LFM2 350M for generating educational explanations
- **STT (Speech-to-Text)**: Whisper Tiny for transcribing student questions
- **TTS (Text-to-Speech)**: Piper TTS for reading explanations aloud
- **VAD (Voice Activity Detection)**: Silero VAD for automatic speech detection

## Features

### 1. Multi-Modal Input

#### Text Input
- Type your question in the text box at the bottom
- Press Enter or click "Send" to submit
- Works for any academic topic or concept

#### Voice Input
- Click the microphone button to start listening
- Speak your question naturally
- The system automatically detects when you stop speaking
- Your question is transcribed and processed

### 2. Intelligent Tutoring

The AI tutor is designed to:
- Explain concepts step-by-step using simple language
- Use analogies and real-world examples for clarity
- Adapt explanations based on your responses
- Maintain conversation context for follow-up questions
- Keep responses concise (2-4 sentences) but clear

### 3. Quick Action Buttons

Four convenient buttons provide instant access to common requests:

#### Example Button
- Automatically asks: "Can you give me an example?"
- Useful when you understand the theory but want to see it applied

#### Simpler Button
- Automatically asks: "Can you explain that more simply?"
- Great when the explanation is too technical or complex

#### Confused Button
- Automatically triggers: "I don't understand. Can you explain it differently?"
- The tutor will re-explain using a completely different approach:
  - Simpler language
  - Real-world analogy
  - Step-by-step breakdown

#### Quiz Me Button
- Automatically requests: "Check my understanding with a quiz question"
- The tutor generates a relevant quiz question
- After you answer, the tutor evaluates your response

### 4. Conversation Context

The system remembers your conversation history:
- Ask follow-up questions without repeating context
- Say "what about..." or "how does..." and it understands the topic
- The last 10 messages are kept for context (to manage performance)

### 5. Check Understanding Mode

When you request a quiz (via the "Quiz Me" button or by asking):
- The tutor asks a quiz question related to your topic
- Quiz questions are highlighted with a green border
- Answer using text or voice
- The tutor evaluates your answer and provides feedback

### 6. Adaptive Re-explanation

If you say "I don't understand" or "I'm confused":
- The tutor automatically switches to a different teaching approach
- It might use:
  - Simpler vocabulary and shorter sentences
  - A real-world analogy or metaphor
  - A step-by-step breakdown with smaller chunks
  - A different angle or perspective on the concept

### 7. Voice Responses

Every explanation is automatically:
- Displayed in the chat interface
- Read aloud using natural-sounding text-to-speech
- You can read along or just listen

### 8. Visual Status Indicators

The tutor shows its current state with an icon and description:
- 💬 Ready to help! (idle)
- ⏳ Loading AI models... (loading)
- 🎤 Listening... speak your question (recording)
- 🤔 Thinking... (processing your question)
- 🔊 Speaking response... (playing audio)
- ❓ Answer the quiz question above (awaiting quiz answer)

### 9. Cross-Tab Persistence

**NEW**: Your conversation with the AI Tutor persists across all tabs:
- Start a conversation in AI Tutor
- Switch to Chat, Voice, or Tools tab
- Return to AI Tutor - your conversation is still there
- All responses and context are maintained
- No data is lost when navigating between features

## Usage Examples

### Example 1: Learning a New Concept
```
You: "What is photosynthesis?"
Tutor: [Provides clear explanation with analogy]
You: [Click "Example" button]
Tutor: [Gives real-world example]
You: [Click "Quiz Me" button]
Tutor: [Asks quiz question to check understanding]
```

### Example 2: Asking Follow-up Questions
```
You: "Explain Newton's first law"
Tutor: [Explains the law]
You: "How does this apply to space travel?"
Tutor: [Explains application with context]
You: "Give me another example"
Tutor: [Provides additional example]
```

### Example 3: When Confused
```
You: "What is quantum entanglement?"
Tutor: [Provides technical explanation]
You: [Click "Confused" button]
Tutor: [Re-explains using simple analogy]
You: "That makes more sense!"
```

## System Requirements

### Browser Compatibility
- Chrome 96+ or Edge 96+ (recommended: 120+)
- WebAssembly support (required)
- SharedArrayBuffer (for better performance)
- OPFS (for model caching)

### First-Time Setup
On your first use, the system needs to download 4 AI models:
1. **VAD** (~5 MB) - Voice Activity Detection
2. **STT** (~105 MB) - Speech-to-Text
3. **LLM** (~250 MB) - Language Model
4. **TTS** (~65 MB) - Text-to-Speech

Total download: ~425 MB

These models are cached in your browser and don't need to be downloaded again.

### Performance Notes
- All AI processing happens locally in your browser
- No internet connection needed after initial model download
- No data is sent to external servers
- Privacy is guaranteed - everything stays on your device
- **Optimized for speed**: Responses now generate faster with reduced token limits
- **Lighter memory footprint**: Vision/VLM model removed to improve performance

## Tips for Best Results

### Getting Good Explanations
- Be specific in your questions
- Mention your current level of understanding
- Ask for examples when concepts are abstract
- Use the quick action buttons to refine explanations

### Using Voice Input
- Speak clearly and at normal pace
- Wait for the 🎤 icon to appear before speaking
- The system automatically detects when you're done
- Background noise may affect transcription accuracy

### Conversation Flow
- Ask one concept at a time for clarity
- Use follow-up questions to go deeper
- Request examples to solidify understanding
- Take quizzes to verify comprehension

### Troubleshooting
- If models fail to load, check your internet connection
- Clear browser cache if you encounter persistent errors
- Use a stable WiFi connection for initial model download
- Close other tabs if the browser runs out of memory

## Privacy and Security

- ✅ All AI processing happens on your device
- ✅ No data is sent to external servers
- ✅ No tracking or analytics
- ✅ Conversations are not stored beyond your session
- ✅ Models are cached locally in browser storage
- ✅ Safe to use in schools and educational institutions

## Technical Implementation

### Architecture
```
Student Input (Text/Voice)
    ↓
VAD (detects speech) → STT (transcribes)
    ↓
LLM (generates explanation)
    ↓
Display in Chat + TTS (speaks aloud)
    ↓
Student can ask follow-up
```

### Model Pipeline
1. **Audio Capture**: Captures microphone input at 16kHz
2. **VAD Processing**: Detects speech start/end automatically
3. **STT Transcription**: Converts speech segment to text
4. **LLM Generation**: Generates educational response with streaming
5. **TTS Synthesis**: Converts response to speech audio
6. **Audio Playback**: Plays synthesized speech

### Conversation Management
- System prompt defines tutor behavior and personality
- Conversation history stored in global state (persists across tabs)
- Last 6 messages used for context (optimized from 10 for better performance)
- Topic tracking for re-explanation requests
- Quiz mode state management
- No data lost when switching between AI Tutor, Chat, Voice, or Tools tabs

## Code References

### Main Component
- **File**: `src/components/TutorTab.tsx`
- **Lines**: 1-473
- Implements complete tutor functionality

### Key Functions
- `processUserInput()` - Handles LLM generation with context (src/components/TutorTab.tsx:90)
- `synthesizeAndPlay()` - TTS synthesis and playback (src/components/TutorTab.tsx:178)
- `startListening()` - VAD + STT integration (src/components/TutorTab.tsx:228)
- `processSpeech()` - Speech-to-text processing (src/components/TutorTab.tsx:267)

### Global State Management
- **File**: `src/store/conversationStore.ts`
- Singleton store for conversation history
- Maintains messages across tab navigation
- Provides subscribe/notify pattern for reactive updates
- Exports `conversationStore` for global access

### React Hook
- **File**: `src/hooks/useConversationStore.ts`
- Custom hook using `useSyncExternalStore`
- Ensures components re-render on state changes
- Provides convenient API for message management

### Styling
- **File**: `src/styles/index.css`
- **Lines**: 705-904
- Custom tutor interface styles

## Future Enhancements

Potential improvements for the AI Tutor:
- Multi-language support for global education
- Subject-specific tutor personalities (math, science, history)
- Progress tracking and learning analytics
- Flashcard generation from conversations
- Study session summaries
- Voice pitch/speed customization for TTS
- Custom quiz difficulty levels
- Integration with educational curriculum standards

## Support and Feedback

For issues, questions, or feature requests:
- [GitHub Issues](https://github.com/RunanywhereAI/runanywhere-sdks/issues)
- [RunAnywhere Documentation](https://docs.runanywhere.ai)

## License

MIT License - See project LICENSE file for details
