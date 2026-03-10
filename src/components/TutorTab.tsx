import { useState, useRef, useEffect, useCallback } from 'react';
import { ModelCategory, ModelManager, AudioCapture, AudioPlayback, SpeechActivity, VoicePipeline } from '@runanywhere/web';
import { VAD } from '@runanywhere/web-onnx';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { useModelLoader } from '../hooks/useModelLoader';
import { useConversationStore } from '../hooks/useConversationStore';
import { ModelBanner } from './ModelBanner';
import type { Message } from '../store/conversationStore';

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

  // Use global conversation store
  const {
    messages,
    lastTopic,
    addMessage,
    updateMessage,
    setLastTopic,
    getConversationHistory,
  } = useConversationStore();

  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [input, setInput] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuizTopic, setCurrentQuizTopic] = useState<string>('');

  const micRef = useRef<AudioCapture | null>(null);
  const vadUnsub = useRef<(() => void) | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Add user message to global store
    addMessage({ role: 'user', text: trimmed, timestamp: Date.now() });
    setIsGenerating(true);
    setTutorState('processing');

    try {
      // Detect special commands
      const lowerText = trimmed.toLowerCase();
      const isConfused = lowerText.includes("don't understand") || lowerText.includes("confused") || lowerText.includes("explain again");
      const isCheckUnderstanding = lowerText.includes("check understanding") || lowerText.includes("quiz me") || lowerText.includes("test me");
      
      // Build conversation context
      let systemPrompt = TUTOR_SYSTEM_PROMPT;
      
      if (isConfused && lastTopic) {
        systemPrompt += `\n\nThe student is confused about: ${lastTopic}. Re-explain this concept using a different approach - try a simpler explanation, a real-world analogy, or a step-by-step breakdown.`;
      } else if (isCheckUnderstanding) {
        systemPrompt += `\n\nCreate a short quiz question to check the student's understanding of the topic we've been discussing. Make it clear and concise.`;
        setQuizMode(true);
        setCurrentQuizTopic(lastTopic || trimmed);
      }

      // Get recent conversation history (last 6 messages for better performance)
      const recentHistory = getConversationHistory(6);
      
      // Build simplified prompt - just use the current question without full history for speed
      const contextualPrompt = trimmed;

      // Generate response with streaming - optimized parameters for faster response
      const { stream, result, cancel } = await TextGeneration.generateStream(contextualPrompt, {
        maxTokens: 150, // Reduced for faster responses
        temperature: 0.7,
        systemPrompt: systemPrompt,
      });
      cancelRef.current = cancel;

      // Add empty assistant message for streaming
      const assistantIdx = messages.length;
      addMessage({ role: 'assistant', text: '', timestamp: Date.now(), isQuiz: isCheckUnderstanding });

      let accumulated = '';
      for await (const token of stream) {
        accumulated += token;
        updateMessage(assistantIdx, { 
          role: 'assistant', 
          text: accumulated, 
          timestamp: Date.now(),
          isQuiz: isCheckUnderstanding,
        });
      }

      const finalResult = await result;
      const finalText = finalResult.text || accumulated;
      
      updateMessage(assistantIdx, { 
        role: 'assistant', 
        text: finalText, 
        timestamp: Date.now(),
        isQuiz: isCheckUnderstanding,
      });
      
      // Remember the topic for re-explanations
      if (!isCheckUnderstanding && !isConfused) {
        setLastTopic(trimmed);
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
      addMessage({ role: 'assistant', text: `Error: ${msg}`, timestamp: Date.now() });
      setError(msg);
      setTutorState('idle');
    } finally {
      cancelRef.current = null;
      setIsGenerating(false);
    }
  }, [messages.length, lastTopic, addMessage, updateMessage, setLastTopic, getConversationHistory]);

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

  // Suggested questions for welcome screen
  const suggestedQuestions = [
    {
      title: "Explain Machine Learning",
      desc: "Learn the basics of ML and how computers learn from data"
    },
    {
      title: "What is Recursion?",
      desc: "Understand recursive thinking with examples"
    },
    {
      title: "Quiz Me on Operating Systems",
      desc: "Test your knowledge of OS concepts"
    },
    {
      title: "How does the Internet work?",
      desc: "Learn about networks, protocols, and the web"
    }
  ];

  // Handle suggestion click
  const handleSuggestionClick = useCallback((question: string) => {
    setInput(question);
    setTimeout(() => {
      handleTextSubmit();
    }, 100);
  }, [handleTextSubmit]);

  // Which loaders are still loading?
  const pendingLoaders = [
    { label: 'VAD', loader: vadLoader },
    { label: 'STT', loader: sttLoader },
    { label: 'LLM', loader: llmLoader },
    { label: 'TTS', loader: ttsLoader },
  ].filter((l) => l.loader.state !== 'ready');

  const showWelcome = messages.length <= 1 && tutorState === 'idle';

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
        <div className="tutor-status-indicator" data-state={tutorState}></div>
        <span className="tutor-status-text">
          {tutorState === 'idle' && 'Ready to help!'}
          {tutorState === 'loading-models' && 'Loading AI models...'}
          {tutorState === 'listening' && 'Listening... speak your question'}
          {tutorState === 'processing' && 'AI is thinking...'}
          {tutorState === 'speaking' && 'Speaking response...'}
          {tutorState === 'awaiting-quiz-answer' && 'Answer the quiz question above'}
        </span>
      </div>

      {/* Welcome Screen or Messages */}
      {showWelcome ? (
        <div className="tutor-welcome">
          <div className="tutor-welcome-icon">🎓</div>
          <h2>Welcome to AI Tutor</h2>
          <p>Your personal AI learning assistant. Ask me anything or choose a topic below to get started!</p>
          
          <div className="tutor-suggestions">
            {suggestedQuestions.map((suggestion, idx) => (
              <div 
                key={idx} 
                className="tutor-suggestion-card"
                onClick={() => handleSuggestionClick(suggestion.title)}
              >
                <h4>{suggestion.title}</h4>
                <p>{suggestion.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="tutor-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`tutor-message tutor-message-${msg.role}`}>
              <div className="tutor-message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className={`tutor-message-bubble ${msg.isQuiz ? 'tutor-quiz-bubble' : ''}`}>
                {msg.text ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: msg.text
                      .replace(/\n/g, '<br/>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/`(.*?)`/g, '<code>$1</code>')
                  }} />
                ) : (
                  <span style={{ opacity: 0.5 }}>...</span>
                )}
                {msg.isQuiz && <div className="tutor-quiz-badge">📝 Quiz Question</div>}
              </div>
            </div>
          ))}
          {isGenerating && tutorState === 'processing' && (
            <div className="tutor-message tutor-message-assistant">
              <div className="tutor-message-avatar">🤖</div>
              <div className="tutor-message-bubble tutor-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Quick actions */}
      <div className="tutor-quick-actions">
        <button className="tutor-quick-btn" onClick={() => handleQuickAction('example')} disabled={isGenerating || showWelcome}>
          <span className="tutor-quick-btn-icon">📝</span> Example
        </button>
        <button className="tutor-quick-btn" onClick={() => handleQuickAction('simpler')} disabled={isGenerating || showWelcome}>
          <span className="tutor-quick-btn-icon">💡</span> Simpler
        </button>
        <button className="tutor-quick-btn" onClick={() => handleQuickAction('confused')} disabled={isGenerating || showWelcome}>
          <span className="tutor-quick-btn-icon">🤷</span> Confused
        </button>
        <button className="tutor-quick-btn" onClick={() => handleQuickAction('quiz')} disabled={isGenerating || showWelcome}>
          <span className="tutor-quick-btn-icon">✅</span> Quiz Me
        </button>
      </div>

      {/* Input area */}
      <div className="tutor-input-container">
        <div className="tutor-input-wrapper">
          <button
            type="button"
            className={`tutor-mic-button ${tutorState === 'listening' ? 'tutor-mic-active' : ''}`}
            onClick={tutorState === 'listening' ? stopListening : startListening}
            disabled={tutorState === 'processing' || tutorState === 'speaking' || tutorState === 'loading-models'}
            title={tutorState === 'listening' ? 'Stop listening' : 'Start voice input'}
          >
            {tutorState === 'listening' ? '⏹️' : '🎤'}
          </button>
          <textarea
            className="tutor-input"
            placeholder={quizMode ? "Answer the quiz question..." : "Ask a question or explain a concept..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
            disabled={isGenerating || tutorState === 'listening' || tutorState === 'speaking'}
            rows={1}
          />
          {isGenerating ? (
            <button type="button" className="tutor-stop-button" onClick={handleCancel} title="Stop generation">
              ⏹️
            </button>
          ) : (
            <button 
              type="submit" 
              className="tutor-send-button" 
              onClick={handleTextSubmit}
              disabled={!input.trim() || tutorState === 'listening' || tutorState === 'speaking'}
              title="Send message"
            >
              ➤
            </button>
          )}
        </div>
      </div>

      {/* Audio level indicator */}
      {tutorState === 'listening' && (
        <div className="tutor-audio-level">
          <div className="tutor-audio-level-bar"></div>
          <div className="tutor-audio-level-bar"></div>
          <div className="tutor-audio-level-bar"></div>
          <div className="tutor-audio-level-bar"></div>
          <div className="tutor-audio-level-bar"></div>
          <span style={{ marginLeft: '8px' }}>Listening...</span>
        </div>
      )}
    </div>
  );
}
