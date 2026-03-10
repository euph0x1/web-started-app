import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelCategory, ModelManager, AudioCapture, AudioPlayback, SpeechActivity, VoicePipeline } from '@runanywhere/web';
import { VAD } from '@runanywhere/web-onnx';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  isQuiz?: boolean;
  isAudioPlaying?: boolean;
}

type TutorState = 'idle' | 'loading-models' | 'listening' | 'processing' | 'speaking' | 'awaiting-quiz-answer';

const TUTOR_SYSTEM_PROMPT = `You are an AI tutor designed to help students understand academic concepts. Your goals are:
1. Explain concepts step-by-step using simple language
2. Use analogies and real-world examples to make concepts clear
3. Ask follow-up questions to verify understanding
4. If a student says "I don't understand", re-explain using a different approach (simpler explanation, analogy, or step-by-step breakdown)
5. When asked to "check understanding", provide a short quiz question related to the concept
6. Keep responses concise (2-4 sentences) but clear and educational
7. Be encouraging and supportive

Always adapt your teaching style based on the student's responses.`;

export function TutorTab() {
  const llmLoader = useModelLoader(ModelCategory.Language, true);
  const sttLoader = useModelLoader(ModelCategory.SpeechRecognition, true);
  const ttsLoader = useModelLoader(ModelCategory.SpeechSynthesis, true);
  const vadLoader = useModelLoader(ModelCategory.Audio, true);

  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi! I\'m your AI tutor. Ask me any concept or doubt you have, either by typing or speaking. I\'m here to help you understand!',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastExplanationTopic, setLastExplanationTopic] = useState<string>('');
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuizTopic, setCurrentQuizTopic] = useState<string>('');

  const micRef = useRef<AudioCapture | null>(null);
  const vadUnsub = useRef<(() => void) | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<Array<{ role: string; content: string }>>([]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      micRef.current?.stop();
      vadUnsub.current?.();
      cancelRef.current?.();
    };
  }, []);

  // Ensure all 4 models are loaded
  const ensureModels = useCallback(async (): Promise<boolean> => {
    setTutorState('loading-models');
    setError(null);

    const results = await Promise.all([
      vadLoader.ensure(),
      sttLoader.ensure(),
      llmLoader.ensure(),
      ttsLoader.ensure(),
    ]);

    if (results.every(Boolean)) {
      setTutorState('idle');
      return true;
    }

    setError('Failed to load one or more models');
    setTutorState('idle');
    return false;
  }, [vadLoader, sttLoader, llmLoader, ttsLoader]);

  // Process user input (text or speech) with LLM
  const processUserInput = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed) return;

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', text: trimmed, timestamp: Date.now() }]);
    setIsGenerating(true);
    setTutorState('processing');

    try {
      // Detect special commands
      const lowerText = trimmed.toLowerCase();
      const isConfused = lowerText.includes("don't understand") || lowerText.includes("confused") || lowerText.includes("explain again");
      const isCheckUnderstanding = lowerText.includes("check understanding") || lowerText.includes("quiz me") || lowerText.includes("test me");
      
      // Build conversation context
      let systemPrompt = TUTOR_SYSTEM_PROMPT;
      
      if (isConfused && lastExplanationTopic) {
        systemPrompt += `\n\nThe student is confused about: ${lastExplanationTopic}. Re-explain this concept using a different approach - try a simpler explanation, a real-world analogy, or a step-by-step breakdown.`;
      } else if (isCheckUnderstanding) {
        systemPrompt += `\n\nCreate a short quiz question to check the student's understanding of the topic we've been discussing. Make it clear and concise.`;
        setQuizMode(true);
        setCurrentQuizTopic(lastExplanationTopic || trimmed);
      }

      // Add conversation history for context
      conversationHistory.current.push({ role: 'user', content: trimmed });
      
      // Keep only last 10 messages for context (to manage token usage)
      const recentHistory = conversationHistory.current.slice(-10);
      
      // Build prompt with context
      let contextualPrompt = trimmed;
      if (recentHistory.length > 1) {
        const historyText = recentHistory.slice(0, -1).map(msg => `${msg.role}: ${msg.content}`).join('\n');
        contextualPrompt = `Previous conversation:\n${historyText}\n\nCurrent question: ${trimmed}`;
      }

      // Generate response with streaming
      const { stream, result, cancel } = await TextGeneration.generateStream(contextualPrompt, {
        maxTokens: 300,
        temperature: 0.7,
        systemPrompt: systemPrompt,
      });
      cancelRef.current = cancel;

      // Add empty assistant message for streaming
      const assistantIdx = messages.length + 1;
      setMessages((prev) => [...prev, { role: 'assistant', text: '', timestamp: Date.now(), isQuiz: isCheckUnderstanding }]);

      let accumulated = '';
      for await (const token of stream) {
        accumulated += token;
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIdx] = { 
            role: 'assistant', 
            text: accumulated, 
            timestamp: Date.now(),
            isQuiz: isCheckUnderstanding,
          };
          return updated;
        });
      }

      const finalResult = await result;
      const finalText = finalResult.text || accumulated;
      
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIdx] = { 
          role: 'assistant', 
          text: finalText, 
          timestamp: Date.now(),
          isQuiz: isCheckUnderstanding,
        };
        return updated;
      });

      // Update conversation history
      conversationHistory.current.push({ role: 'assistant', content: finalText });
      
      // Remember the topic for re-explanations
      if (!isCheckUnderstanding && !isConfused) {
        setLastExplanationTopic(trimmed);
      }

      // Synthesize and play audio response
      await synthesizeAndPlay(finalText);

      if (isCheckUnderstanding) {
        setTutorState('awaiting-quiz-answer');
      } else {
        setTutorState('idle');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${msg}`, timestamp: Date.now() }]);
      setError(msg);
      setTutorState('idle');
    } finally {
      cancelRef.current = null;
      setIsGenerating(false);
    }
  }, [messages.length, lastExplanationTopic]);

  // Synthesize text to speech and play
  const synthesizeAndPlay = useCallback(async (text: string) => {
    try {
      setTutorState('speaking');
      
      // Import TTS functionality from web-onnx package
      const { TTS } = await import('@runanywhere/web-onnx');
      
      // Check if TTS model is loaded
      const ttsModel = ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis);
      if (!ttsModel) {
        console.warn('TTS model not loaded, skipping audio playback');
        return;
      }

      // Synthesize speech
      const result = await TTS.synthesize(text, { speed: 1.0 });
      
      // Play audio
      const player = new AudioPlayback({ sampleRate: result.sampleRate });
      await player.play(result.audioData, result.sampleRate);
      player.dispose();
    } catch (err) {
      console.error('TTS error:', err);
      // Don't show error to user, just skip audio playback
    }
  }, []);

  // Handle text input submission
  const handleTextSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isGenerating) return;

    // Ensure models are loaded
    if (llmLoader.state !== 'ready' || ttsLoader.state !== 'ready') {
      const ok = await ensureModels();
      if (!ok) return;
    }

    const text = input;
    setInput('');
    
    // Reset quiz mode if answering a quiz
    if (quizMode) {
      setQuizMode(false);
    }

    await processUserInput(text);
  }, [input, isGenerating, llmLoader.state, ttsLoader.state, ensureModels, processUserInput, quizMode]);

  // Start listening with VAD + STT
  const startListening = useCallback(async () => {
    setError(null);

    // Load models if needed
    const anyMissing = !ModelManager.getLoadedModel(ModelCategory.Audio)
      || !ModelManager.getLoadedModel(ModelCategory.SpeechRecognition)
      || !ModelManager.getLoadedModel(ModelCategory.Language)
      || !ModelManager.getLoadedModel(ModelCategory.SpeechSynthesis);

    if (anyMissing) {
      const ok = await ensureModels();
      if (!ok) return;
    }

    setTutorState('listening');

    const mic = new AudioCapture({ sampleRate: 16000 });
    micRef.current = mic;

    // Start VAD
    VAD.reset();

    vadUnsub.current = VAD.onSpeechActivity((activity) => {
      if (activity === SpeechActivity.Ended) {
        const segment = VAD.popSpeechSegment();
        if (segment && segment.samples.length > 1600) {
          // Process speech segment
          processSpeech(segment.samples);
        }
      }
    });

    await mic.start(
      (chunk) => { VAD.processSamples(chunk); },
      (level) => { setAudioLevel(level); },
    );
  }, [ensureModels]);

  // Process speech segment through STT
  const processSpeech = useCallback(async (audioData: Float32Array) => {
    // Stop mic during processing
    micRef.current?.stop();
    vadUnsub.current?.();
    setTutorState('processing');
    setAudioLevel(0);

    try {
      // Import STT from web-onnx package
      const { STT } = await import('@runanywhere/web-onnx');
      
      // Transcribe audio
      const sttResult = await STT.transcribe(audioData);
      const transcribedText = sttResult.text;

      if (transcribedText.trim()) {
        // Reset quiz mode if answering a quiz via voice
        if (quizMode) {
          setQuizMode(false);
        }
        
        // Process the transcribed text
        await processUserInput(transcribedText);
      } else {
        setTutorState('idle');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setTutorState('idle');
    }
  }, [processUserInput, quizMode]);

  // Stop listening
  const stopListening = useCallback(() => {
    micRef.current?.stop();
    vadUnsub.current?.();
    setTutorState('idle');
    setAudioLevel(0);
  }, []);

  // Cancel generation
  const handleCancel = useCallback(() => {
    cancelRef.current?.();
    setIsGenerating(false);
    setTutorState('idle');
  }, []);

  // Quick action buttons
  const handleQuickAction = useCallback(async (action: string) => {
    let text = '';
    switch (action) {
      case 'example':
        text = 'Can you give me an example?';
        break;
      case 'simpler':
        text = 'Can you explain that more simply?';
        break;
      case 'confused':
        text = "I don't understand. Can you explain it differently?";
        break;
      case 'quiz':
        text = 'Check my understanding with a quiz question';
        break;
    }
    
    if (text) {
      setInput(text);
      // Auto-submit after a brief delay
      setTimeout(() => {
        setInput(text);
        processUserInput(text);
      }, 100);
    }
  }, [processUserInput]);

  // Which loaders are still loading?
  const pendingLoaders = [
    { label: 'VAD', loader: vadLoader },
    { label: 'STT', loader: sttLoader },
    { label: 'LLM', loader: llmLoader },
    { label: 'TTS', loader: ttsLoader },
  ].filter((l) => l.loader.state !== 'ready');

  return (
    <div className="tab-panel tutor-panel">
      {pendingLoaders.length > 0 && tutorState === 'idle' && (
        <ModelBanner
          state={pendingLoaders[0].loader.state}
          progress={pendingLoaders[0].loader.progress}
          error={pendingLoaders[0].loader.error}
          onLoad={ensureModels}
          label={`AI Tutor (${pendingLoaders.map((l) => l.label).join(', ')})`}
        />
      )}

      {error && <div className="model-banner"><span className="error-text">{error}</span></div>}

      {/* Status indicator */}
      <div className="tutor-status">
        <div className="tutor-status-indicator" data-state={tutorState}>
          {tutorState === 'idle' && '💬'}
          {tutorState === 'loading-models' && '⏳'}
          {tutorState === 'listening' && '🎤'}
          {tutorState === 'processing' && '🤔'}
          {tutorState === 'speaking' && '🔊'}
          {tutorState === 'awaiting-quiz-answer' && '❓'}
        </div>
        <span className="tutor-status-text">
          {tutorState === 'idle' && 'Ready to help!'}
          {tutorState === 'loading-models' && 'Loading AI models...'}
          {tutorState === 'listening' && 'Listening... speak your question'}
          {tutorState === 'processing' && 'Thinking...'}
          {tutorState === 'speaking' && 'Speaking response...'}
          {tutorState === 'awaiting-quiz-answer' && 'Answer the quiz question above'}
        </span>
      </div>

      {/* Message history */}
      <div className="tutor-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`tutor-message tutor-message-${msg.role}`}>
            <div className={`tutor-message-bubble ${msg.isQuiz ? 'tutor-quiz-bubble' : ''}`}>
              <p>{msg.text || '...'}</p>
              {msg.isQuiz && <div className="tutor-quiz-badge">Quiz Question</div>}
            </div>
          </div>
        ))}
        {isGenerating && tutorState === 'processing' && (
          <div className="tutor-message tutor-message-assistant">
            <div className="tutor-message-bubble tutor-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="tutor-quick-actions">
        <button className="btn btn-sm" onClick={() => handleQuickAction('example')} disabled={isGenerating}>
          📝 Example
        </button>
        <button className="btn btn-sm" onClick={() => handleQuickAction('simpler')} disabled={isGenerating}>
          💡 Simpler
        </button>
        <button className="btn btn-sm" onClick={() => handleQuickAction('confused')} disabled={isGenerating}>
          🤷 Confused
        </button>
        <button className="btn btn-sm" onClick={() => handleQuickAction('quiz')} disabled={isGenerating}>
          ✅ Quiz Me
        </button>
      </div>

      {/* Input area */}
      <form className="tutor-input" onSubmit={handleTextSubmit}>
        <button
          type="button"
          className={`tutor-mic-button ${tutorState === 'listening' ? 'tutor-mic-active' : ''}`}
          onClick={tutorState === 'listening' ? stopListening : startListening}
          disabled={tutorState === 'processing' || tutorState === 'speaking' || tutorState === 'loading-models'}
          style={{ '--level': audioLevel } as React.CSSProperties}
        >
          {tutorState === 'listening' ? '🔴' : '🎤'}
        </button>
        <input
          type="text"
          placeholder={quizMode ? "Answer the quiz question..." : "Ask a question or explain a concept..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isGenerating || tutorState === 'listening' || tutorState === 'speaking'}
        />
        {isGenerating ? (
          <button type="button" className="btn" onClick={handleCancel}>Stop</button>
        ) : (
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || tutorState === 'listening' || tutorState === 'speaking'}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}
