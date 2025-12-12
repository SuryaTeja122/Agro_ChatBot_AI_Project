import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import EmojiPicker from 'emoji-picker-react';


function Chat() {
  const chatEndRef = useRef(null);
  const [input, setInput] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);
  const [lastImage, setLastImage] = useState(null);
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(null);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [targetLang, setTargetLang] = useState('hi'); // Default to Hindi
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);
  const [spokenWordIndex, setSpokenWordIndex] = useState(null);




  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices(); // No need to store anything
    };    
  
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);
  
  
  

// 🌐 Translate using your local proxy to avoid CORS
// ✅ FRONTEND translation using Google's unofficial API
const translateText = async (text, targetLang = 'hi') => {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );

    const data = await response.json();
    const translatedText = data[0]?.map(segment => segment[0]).join(' ');
    return translatedText || '❌ Translation failed';
  } catch (error) {
    console.error('Translation error:', error);
    return '❌ Translation failed: ' + error.message;
  }
};

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleThemeToggle = () => {
    setDarkMode(prev => !prev);
  };  

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setCurrentResultIndex(null);
      return;
    }
  
    const results = [];
    messages.forEach((msg, msgIndex) => {
      const lines = msg.text.split(/\n|(?=\d+\.\s)/g);
      lines.forEach((line, lineIndex) => {
        if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({ msgIndex, lineIndex });
        }
      });
    });
  
    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : null);
  }, [searchQuery, messages]);

  // Navigate to the next search result
  const navigateToNextResult = () => {
    if (searchResults.length === 0) return; // No results to navigate to

    setCurrentResultIndex((prev) => prev === null ? 0 : (prev + 1) % searchResults.length);
  };

  // Navigate to the previous search result
  const navigateToPreviousResult = () => {
    if (searchResults.length === 0) return; // No results to navigate to

    setCurrentResultIndex((prev) => prev === null ? 0 : (prev - 1 + searchResults.length) % searchResults.length);
};



  const currentMatchRef = useRef(null);

  useEffect(() => {
    if (currentMatchRef.current) {
      currentMatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentResultIndex]);

  

  // handle file input or drop
  const handleImageUpload = (e) => {
  const files = Array.from(e.target.files || e.dataTransfer.files);
  const validImages = files.filter(file => file.type.startsWith('image/'));

  const previews = validImages.map(file => ({
    file,
    url: URL.createObjectURL(file),
  }));

  setImages(prev => [...prev, ...validImages]);
  setImagePreviews(prev => [...prev, ...previews]);
  inputRef.current?.focus();
};

const handleVoiceInput = () => {
  // Check if browser supports speech recognition
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Speech recognition is not supported in this browser.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'en-US'; // language setting
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    setIsListening(true); // show "listening" feedback
  };

  recognition.onend = () => {
    setIsListening(false); // hide "listening" feedback
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setInput(prev => prev + transcript); // add recognized speech to input
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  
    if (event.error === 'not-allowed') {
      alert(
        "🎤 Microphone access is blocked.\n\n" +
        "Please allow microphone access in your browser:\n" +
        "1. Click the 🔒 lock icon in the address bar\n" +
        "2. Find 'Microphone' and set it to 'Allow'\n" +
        "3. Refresh the page and try again."
      );
    } else {
      alert('Speech recognition error: ' + event.error);
    }
  };  

  recognition.start();
};

  const sendMessage = async () => {
    if (!input.trim() && images.length === 0) {
      alert('Please enter a message or upload an image.');
      return;
    }

    const userMessage = {
      from: 'user',
      text: input || '[Image only]',
      image: imagePreviews.length > 0 ? imagePreviews.map(img => img.url) : [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const formData = new FormData();

// Construct the conversation history to send to the backend
const chatHistory = messages
  .filter(m => m.from === 'user' || m.from === 'bot')
  .map(m => ({
    role: m.from === 'user' ? 'user' : 'assistant',
    content: m.text
  }));

chatHistory.push({ role: 'user', content: input });

formData.append('chatHistory', JSON.stringify(chatHistory));

// Send full chat history as JSON


    const referringToPreviousImage = /that image|the image|above image|previous image|that tree/i.test(input);

if (images.length > 0) {
  images.forEach((img) => {
    formData.append('images', img);
  });
  setLastImage(images[images.length - 1]); // ✅ Store the last uploaded image
} else if (referringToPreviousImage && lastImage) {
  formData.append('images', lastImage); // ✅ Resend previous image
}
// ✅ CLEAR images and previews from UI
  setImages([]);
  setImagePreviews([]);

    setShowEmojiPicker(false);
    setIsLoading(true);
    setMessages((prev) => [...prev, userMessage]);
    if (input.trim()) {
      
    }    
    setInput('');
    setImages([]);
    setImagePreviews([]);

    document.getElementById('file-upload').value = null;

    try {
      const BASE_URL =
        window.location.hostname === 'localhost'
          ? 'http://localhost:5000'
          : 'http://192.168.1.2:5000';

          
          const response = await axios.post(`${BASE_URL}/api/chat`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });          


      const botReply = {
        from: 'bot',
        text: response.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (error) {
      console.error('Error communicating with the server:', error);
      setMessages((prev) => [...prev, { from: 'bot', text: 'Error: Unable to get a response.' }]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.loggedIn) {
      navigate('/login');
    } else {
      setIsLoggedIn(true);
    }
  }, [navigate]);  

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedEmojiButton = emojiButtonRef.current?.contains(event.target);
      const clickedPicker = emojiPickerRef.current?.contains(event.target);
  
      if (!clickedEmojiButton && !clickedPicker) {
        setShowEmojiPicker(false);
      }
    };
  
    // Use capture phase to catch all clicks before children stop propagation
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);
  
  
  

  // Theme updater when darkMode changes
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      if (darkMode) {
        chatContainer.classList.add('dark');
        chatContainer.classList.remove('light');
      } else {
        chatContainer.classList.add('light');
        chatContainer.classList.remove('dark');
      }
    }
  }, [darkMode]);

  const searchRef = useRef();

    useEffect(() => {
      if (searchRef.current) {
        searchRef.current.style.height = 'auto';
        searchRef.current.style.height = searchRef.current.scrollHeight + 'px';
      }
    }, [searchQuery]);



  const handleLogout = () => {
    const loggedUser = JSON.parse(localStorage.getItem('user'));
    const allUsers = JSON.parse(localStorage.getItem('users')) || [];

    const updatedUsers = allUsers.map(user =>
      user.email === loggedUser?.email ? { ...user, loggedIn: false } : user
    );

    localStorage.setItem('users', JSON.stringify(updatedUsers));
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <>
  
    <div className={`chat-wrapper ${darkMode ? 'dark' : ''}`}>
      <div className={`chat-container ${darkMode ? 'dark' : ''}`}>

        <div className="chat-header">
          <h2>Agriculture Chatbot</h2>
        </div>

        <div className="theme-toggle-container">
          <label className="theme-label">
            Theme: {darkMode ? 'Dark' : 'Light'}
            <input
              type="checkbox"
              checked={darkMode}
              onChange={handleThemeToggle}
            />
            <span className="slider"></span>
          </label>
        </div>
        <div className="search-icon-wrapper">
  <span className="search-icon" onClick={() => setShowSearchPopup(true)}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q127 0 226.5 70T851-629q7 17 .5 34T828-572q-16 5-30.5-3T777-599q-24-60-69-106t-108-71v16q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h40q17 0 28.5 11.5T400-440v80h-40L168-552q-3 18-5.5 36t-2.5 36q0 122 80.5 213T443-162q16 2 26.5 13.5T480-120q0 17-11.5 28.5T441-82Q288-97 184-210T80-480Zm736 352L716-228q-21 12-45 20t-51 8q-75 0-127.5-52.5T440-380q0-75 52.5-127.5T620-560q75 0 127.5 52.5T800-380q0 27-8 51t-20 45l100 100q11 11 11 28t-11 28q-11 11-28 11t-28-11ZM620-280q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Z"/></svg></span>
</div>

{showSearchPopup && (
  <div className="search-bar-container">
    <textarea
      ref={searchRef}
      className="search-bar-input"
      placeholder="Search messages..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          setSearchQuery(prev => prev.trim());
        }
      }}
      rows={1}
    />
    <div className="search-bar-buttons">
      <span className="search-count">
        {searchResults.length > 0 && currentResultIndex !== null
          ? `Match ${currentResultIndex + 1} of ${searchResults.length}`
          : ''}
      </span>
      <button onClick={navigateToPreviousResult} title="Previous">↑</button>
      <button onClick={navigateToNextResult} title="Next">↓</button>
      
      <button onClick={() => {
  setShowSearchPopup(false);
  setSearchQuery('');
}} title="Close">✖</button>

    </div>
  </div>
)}
        {isLoggedIn && (
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        )}

        {isListening && (
          <div className="listening-indicator">
            🎤 Listening...
          </div>
        )}


        <div className="chat-box">
          {messages.length > 0 ? (
            messages.map((msg, i) => {
              const isMatch = searchQuery && msg.text?.toLowerCase().includes(searchQuery.toLowerCase());
              return (
                <div
                  key={i}
                  id={`message-${i}`}
                  className={`message ${msg.from}`}
                  ref={isMatch ? chatEndRef : null}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '8px',
                    marginBottom: '12px'
                  }}
                >

                  {msg.from === 'user' ? (
                    <>
                      <div className="message-content">
                      {speakingMessageIndex === i ? (
                        <p style={{ lineHeight: '1.6' }}>
                          {(msg.translated || msg.text).split(' ').map((word, index) => (
                            <span
                              key={index}
                              style={{
                                backgroundColor:
                                  index === spokenWordIndex ? '#ffe58f' : 'transparent',
                                padding: '0 2px',
                                borderRadius: '4px',
                                marginRight: '2px',
                              }}
                            >
                              {word}{' '}
                            </span>
                          ))}
                        </p>
                      ) : (
                        msg.text.split(/\n|(?=\d+\.\s)/g).map((line, lineIndex) => {
                          const isMatch = currentResultIndex !== null &&
                            searchResults[currentResultIndex]?.msgIndex === i &&
                            searchResults[currentResultIndex]?.lineIndex === lineIndex;

                          return (
                            <div
                              key={lineIndex}
                              ref={isMatch ? currentMatchRef : null}
                              style={{
                                backgroundColor: isMatch ? '#fff176' : 'transparent',
                                padding: '2px 4px',
                                borderRadius: '4px',
                              }}
                              dangerouslySetInnerHTML={{
                                __html: searchQuery
                                  ? line.replace(
                                      new RegExp(`(${searchQuery})`, 'gi'),
                                      '<mark>$1</mark>'
                                    )
                                  : line,
                              }}
                            />
                          );
                        })
                      )}
                        {msg.image && Array.isArray(msg.image) ? (
                          msg.image.map((imgSrc, i) => (
                            <img
                              key={i}
                              src={imgSrc}
                              alt={`Upload ${i}`}
                              style={{ maxWidth: '150px', marginTop: '5px', borderRadius: '5px' }}
                            />
                          ))
                        ) : (
                          <img
                            src={msg.image}
                            alt="User upload"
                            style={{ maxWidth: '150px', marginTop: '5px', borderRadius: '5px' }}
                          />
                        )}
                        <div className="timestamp">{msg.timestamp}</div>
                      </div>
                      <div className="avatar">
                        <img
                          src={require('../assets/person_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.png')}
                          alt="user avatar"
                          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="avatar">
                        <img
                          src={require('../assets/smart_toy_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.png')}
                          alt="bot avatar"
                          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                        />
                      </div>
                      <div className="message-content">
                      {speakingMessageIndex === i ? (
                        <p style={{ lineHeight: '1.6' }}>
                          {msg.text.split(' ').map((word, index) => (
                            <span
                              key={index}
                              style={{
                                backgroundColor: index === spokenWordIndex ? '#ffe58f' : 'transparent',
                                borderRadius: '4px',
                                padding: '0 2px',
                                marginRight: '2px',
                                transition: 'background-color 0.2s ease'
                              }}
                            >
                              {word}{' '}
                            </span>
                          ))}
                        </p>
                      ) : (
                        msg.text.split(/\n|(?=\d+\.\s)/g).map((line, lineIndex) => {
                          const isMatch = currentResultIndex !== null &&
                            searchResults[currentResultIndex]?.msgIndex === i &&
                            searchResults[currentResultIndex]?.lineIndex === lineIndex;
                        
                          return (
                            <div
                              key={lineIndex}
                              ref={isMatch ? currentMatchRef : null}
                              style={{
                                backgroundColor: isMatch ? '#fff176' : 'transparent',
                                padding: '2px 4px',
                                borderRadius: '4px',
                              }}
                              dangerouslySetInnerHTML={{
                                __html: searchQuery
                                  ? line.replace(new RegExp(`(${searchQuery})`, 'gi'), '<mark>$1</mark>')
                                  : line,
                              }}
                            />
                          );
                        })
                        
                      )}

                      
                        
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button
                          onClick={async () => {
                            const synth = window.speechSynthesis;
                          
                            // ✅ Stop if already speaking
                            if (synth.speaking) {
                              synth.cancel();
                              setIsSpeaking(false);
                              return;
                            }
                          
                            const loadVoices = () => {
                              return new Promise((resolve) => {
                                const voices = synth.getVoices();
                                if (voices.length > 0) return resolve(voices);
                                synth.onvoiceschanged = () => resolve(synth.getVoices());
                              });
                            };
                          
                            const voices = await loadVoices();
                          
                            const langMap = {
                              hi: 'hi-IN',
                              bn: 'bn-IN',
                              gu: 'gu-IN',
                              ta: 'ta-IN',
                              te: 'te-IN',
                              kn: 'kn-IN',
                              mr: 'mr-IN',
                              ur: 'ur-IN',
                              pa: 'pa-IN',
                              en: 'en-US'
                            };
                          
                            const selectedLang = msg.lang || targetLang || 'en';
                            const langCode = langMap[selectedLang] || 'en-US';
                          
                            let textToSpeak = msg.text;
                            if (!textToSpeak) {
                              const translated = await translateText(msg.text, selectedLang);
                              textToSpeak = translated;
                              setMessages((prevMessages) =>
                                prevMessages.map((m, index) =>
                                  index === i ? { ...m, translated, lang: selectedLang } : m
                                )
                              );
                            }
                          
                            const utterance = new SpeechSynthesisUtterance(textToSpeak);


                            // ✅ NEW onboundary: accurate word match
                            utterance.onboundary = (event) => {
                              if (event.name === 'word' && typeof event.charIndex === 'number') {
                                const text = msg.text; // Always highlight English
                                const charIndex = event.charIndex;
                            
                                const wordRegex = /\b[\w']+\b/g;
                                let match;
                                let wordIndex = 0;
                                let foundIndex = -1;
                            
                                while ((match = wordRegex.exec(text)) !== null) {
                                  const start = match.index;
                                  const end = match.index + match[0].length;
                                  if (charIndex >= start && charIndex < end) {
                                    foundIndex = wordIndex;
                                    break;
                                  }
                                  wordIndex++;
                                }
                            
                                setSpokenWordIndex(foundIndex);
                              }
                            };
                            
                            setSpokenWordIndex(null);
                            setSpeakingMessageIndex(i);
                            

                            utterance.onend = () => {
                              setIsSpeaking(false);
                              setSpeakingMessageIndex(null);
                              setSpokenWordIndex(null);
                            };

                            utterance.onerror = () => {
                              setIsSpeaking(false);
                              setSpeakingMessageIndex(null);
                              setSpokenWordIndex(null);
                            };
                          
                            let voice = voices.find(v =>
                              v.lang === langCode || v.lang.startsWith(langCode.split('-')[0])
                            );
                          
                            if (voice) {
                              utterance.lang = langCode;
                              utterance.voice = voice;
                            } else {
                              // 🟡 No voice found — fallback
                              setToastMessage(`⚠️ Voice for "${selectedLang.toUpperCase()}" not available. Using English instead.`);
                              setTimeout(() => setToastMessage(''), 4000);
                          
                              const fallbackVoice = voices.find(v => v.lang === 'en-US');
                              utterance.lang = 'en-US';
                              if (fallbackVoice) utterance.voice = fallbackVoice;
                          
                              const englishTranslated = await translateText(msg.text, 'en');
                              utterance.text = englishTranslated;
                            }
                          
                            utterance.onstart = () => setIsSpeaking(true);
                          
                            synth.cancel();
                            synth.speak(utterance);
                          }}                                               
                          title={isSpeaking ? "Stop Speaking" : "Listen"}
                          style={{
                            background: 'none',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: '#007bff',
                          }}
                        >
                          {isSpeaking ? '🔈 Stop' : '🔊 Listen'}
                        </button>

                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={async () => {
                                const translated = await translateText(msg.text, targetLang);
                                setMessages((prevMessages) =>
                                  prevMessages.map((m, index) =>
                                    index === i ? { ...m, translated } : m
                                  )
                                );
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setShowLangDropdown((prev) => !prev);
                              }}
                              title="Translate (Right-click to select language)"
                              style={{
                                background: 'none',
                                border: '1px solid #007bff',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                color: '#007bff',
                                position: 'relative'
                              }}
                            >
                              🌐 Translate
                            </button>

                            {showLangDropdown && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '36px',
                                  left: '0',
                                  backgroundColor: '#fff',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  zIndex: 1000
                                }}
                              >
                                <select
                                  value={targetLang}
                                  onChange={(e) => {
                                    setTargetLang(e.target.value);
                                    setShowLangDropdown(false);
                                  }}
                                  style={{ padding: '4px', border: 'none', width: '100%' }}
                                >
                                  <option value="hi">Hindi</option>
                                  <option value="bn">Bengali</option>
                                  <option value="gu">Gujarati</option>
                                  <option value="ta">Tamil</option>
                                  <option value="te">Telugu</option>
                                  <option value="kn">Kannada</option>
                                  <option value="mr">Marathi</option>
                                  <option value="ur">Urdu</option>
                                  <option value="pa">Punjabi</option>
                                  <option value="en">English</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {msg.translated && (
                          <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#555' }}>
                            🈯 {msg.translated}
                          </div>
                        )}

                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Bot upload"
                            style={{ maxWidth: '150px', marginTop: '5px', borderRadius: '5px' }}
                          />
                        )}
                        <div className="timestamp">{msg.timestamp}</div>
                      </div>
                    </>
                  )}
                  <div ref={chatEndRef} />
                </div>
              );
            })
          ) : (
            <div className="no-results">
              {searchQuery ? 'No messages found.' : 'No messages yet.'}
            </div>
          )}

          {isLoading && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>


      <div
        className={`input-area dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = Array.from(e.dataTransfer.files);
          const validImages = files.filter(file => file.type.startsWith('image/'));
        
          const previews = validImages.map(file => ({
            file,
            url: URL.createObjectURL(file),
          }));
        
          setImages(prev => [...prev, ...validImages]);
          setImagePreviews(prev => [...prev, ...previews]);
        }}        
        style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}
      >
        <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          ref={emojiButtonRef}
          type="button"
          className="emoji-btn"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Emoji Picker"
        >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M480-260q53 0 100.5-23t76.5-67q11-17 3-33.5T634-400q-8 0-14.5 3.5T609-386q-23 31-57 48.5T480-320q-38 0-72-17.5T351-386q-5-7-11.5-10.5T325-400q-18 0-26 16t3 32q29 45 76.5 68.5T480-260Zm140-260q25 0 42.5-17.5T680-580q0-25-17.5-42.5T620-640q-25 0-42.5 17.5T560-580q0 25 17.5 42.5T620-520Zm-280 0q25 0 42.5-17.5T400-580q0-25-17.5-42.5T340-640q-25 0-42.5 17.5T280-580q0 25 17.5 42.5T340-520ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z"/></svg>
          </button>

          <input
            id="file-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload" className="attach-icon" title="Attach Image"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M720-330q0 104-73 177T470-80q-104 0-177-73t-73-177v-370q0-75 52.5-127.5T400-880q75 0 127.5 52.5T580-700v350q0 46-32 78t-78 32q-46 0-78-32t-32-78v-330q0-17 11.5-28.5T400-720q17 0 28.5 11.5T440-680v330q0 13 8.5 21.5T470-320q13 0 21.5-8.5T500-350v-350q-1-42-29.5-71T400-800q-42 0-71 29t-29 71v370q-1 71 49 120.5T470-160q70 0 119-49.5T640-330v-350q0-17 11.5-28.5T680-720q17 0 28.5 11.5T720-680v350Z"/></svg></label>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="chat-textarea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent newline if just Enter
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            rows={1}
            style={{
              resize: 'none',
              overflow: 'hidden',
              width: '100%',
              maxHeight: '150px',
              lineHeight: '1.4em'
            }}
          />

          <button
            onClick={handleVoiceInput}
            className="mic-btn"
            title="Speak"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            🎤
          </button>


          <button onClick={sendMessage} disabled={isLoading} className="send-btn" title="Send"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M792-443 176-183q-20 8-38-3.5T120-220v-520q0-22 18-33.5t38-3.5l616 260q25 11 25 37t-25 37ZM200-280l474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/></svg></button>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="emoji-picker-container">
              <EmojiPicker onEmojiClick={handleEmojiClick}
              theme={darkMode ? 'dark' : 'light'} />
            </div>
          )}
        </div>

        {imagePreviews.length > 0 && (
  <div className="inline-preview-wrapper">
    {imagePreviews.map((preview, index) => (
      <div className="inline-image-preview" key={index}>
        <img src={preview.url} alt={`Preview ${index}`} />
        <button
          className="remove-preview"
          onClick={() => {
            const newPreviews = imagePreviews.filter((_, i) => i !== index);
            const newImages = images.filter((_, i) => i !== index);
            setImagePreviews(newPreviews);
            setImages(newImages);
          }}
          title="Remove Image"
        >
          ❌
        </button>
      </div>
    ))}
  </div>
)}
      </div>
      {toastMessage && (
  <div style={{
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#333',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    zIndex: 9999,
    fontSize: '14px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'opacity 0.3s ease-in-out'
  }}>
    {toastMessage}
  </div>
)}

      </div>
      </div>
    </>
  );
}

export default Chat;
