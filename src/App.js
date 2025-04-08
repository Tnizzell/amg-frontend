// React frontend for AMG AI Girlfriend App (connected to live backend)
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import supabase from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';



export default function App() {

  const [chatLog, setChatLog] = useState([]);
  const chatRef = useRef(null);

  const [audioFile, setAudioFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [gfReply, setGfReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isWorkSafe, setIsWorkSafe] = useState(false);
  const [nsfwBlocked, setNsfwBlocked] = useState(false);
  const [mood, setMood] = useState('normal');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [session, setSession] = useState(null);
  const [showPremiumNotice, setShowPremiumNotice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const audioChunksRef = useRef([]);
  const [textPrompt, setTextPrompt] = useState('');


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    });
  }, []);

  const checkPremiumStatus = async (email) => {
    const { data } = await supabase
      .from('users')
      .select('ispremium')
      .eq('email', email)
      .single();
  
    setIsPremium(!!data?.isPremium);
  };

  useEffect(() => {
    if (email) {
      localStorage.setItem('userEmail', email);
      checkPremiumStatus(email);
    }
  }, [email]);

  const scrollToBottom = () => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  };
  
  const loadChatHistory = async (email) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: true });
    if (data) {
      setChatLog(data);
      setTimeout(scrollToBottom, 100); // 👈 smooth scroll after loading
    }
  };
  
  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userEmail');
    setEmail('');
    setIsPremium(false);
    setSession(null);
  };

  const userAvatar = session?.user?.user_metadata?.avatar_url;

<div className="flex flex-col items-center sm:items-stretch">


  {chatLog.map((msg, i) => (
    <div
      key={i}
      className={`mb-2 p-2 rounded text-sm ${
        msg.role === 'user' ? 'bg-pink-800 text-right' : 'bg-gray-700 text-left'
      }`}
    >
      {msg.message}
    </div>
  ))}
</div>


  const handleAudioChange = (e) => {
    setAudioFile(e.target.files[0]);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    console.log("handleUpload triggered. File:", file); // 👈 ADD THIS
    setLoading(true);
    setNsfwBlocked(false);
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const whisperRes = await axios.post('https://amg2-production.up.railway.app/transcribe', formData);
      setTranscription(whisperRes.data.text);
  
      const replyRes = await axios.post('https://amg2-production.up.railway.app/reply', {
        prompt: whisperRes.data.text,
        premium: isPremium,
        worksafe: isWorkSafe,
        mood: mood
      });
  
      if (replyRes.data.nsfw && (!isPremium || isWorkSafe)) {
        setNsfwBlocked(true);
        setGfReply(isWorkSafe
          ? 'Work-safe mode is ON. Content hidden 👔'
          : 'Unlock Premium to see what she *really* wants to say... 💋');
      } else {
        setGfReply(replyRes.data.reply);
        playTTS(replyRes.data.reply);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
const handleUploadFromText = async (text) => {
  if (!text) return;
  setLoading(true);
  setNsfwBlocked(false);

  try {
    const replyRes = await axios.post('https://amg2-production.up.railway.app/reply', {
      prompt: text,
      premium: isPremium,
      worksafe: isWorkSafe,
      mood: mood
    });

    if (replyRes.data.nsfw && (!isPremium || isWorkSafe)) {
      setNsfwBlocked(true);
      setGfReply(isWorkSafe
        ? 'Work-safe mode is ON. Content hidden 👔'
        : 'Unlock Premium to see what she *really* wants to say... 💋');
    } else {
      setGfReply(replyRes.data.reply);
      playTTS(replyRes.data.reply);
    }
  } catch (err) {
    console.error('Text prompt error:', err);
  } finally {
    setLoading(false);
  }
};

const handleTextSubmit = async () => {
  if (!textPrompt.trim()) return;

  setLoading(true);
  setNsfwBlocked(false);

  try {
    const replyRes = await axios.post('https://amg2-production.up.railway.app/reply', {
      prompt: textPrompt,
      premium: isPremium,
      worksafe: isWorkSafe,
      mood: mood
    });

    if (replyRes.data.nsfw && (!isPremium || isWorkSafe)) {
      setNsfwBlocked(true);
      setGfReply(isWorkSafe
        ? 'Work-safe mode is ON. Content hidden 👔'
        : 'Unlock Premium to see what she *really* wants to say... 💋');
    } else {
      setGfReply(replyRes.data.reply);
      playTTS(replyRes.data.reply);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
    setTextPrompt('');
  }
};

  const playTTS = async (text) => {
    try {
      const res = await axios.post(
        'https://amg2-production.up.railway.app/tts',
        { text },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      new Audio(url).play();
    } catch (err) {
      console.error('TTS error', err);
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });

    
      // LOG WHAT MATTERS
      console.log('Blob Type:', audioBlob.type);
      console.log('Blob Size:', audioBlob.size);
      console.log('File Type:', file.type);
      console.log('File Name:', file.name);
    
      setAudioFile(file);
      await handleUpload(file);
    };
    
    

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      console.log("Recording stopped"); // 👈 ADD THIS
    }
  };

  const handleSubscribe = async () => {
    const user = supabase.auth.getUser
      ? (await supabase.auth.getUser()).data.user
      : supabase.auth.user(); // fallback depending on SDK version
  
    if (!user) {
      console.error('User not logged in');
      return;
    }
  
    try {
      const res = await axios.post('https://amg2-production.up.railway.app/subscribe', {
        email: user.email,
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error('Subscribe error:', err);
    }
  };

  const handlePremiumClick = () => {
    if (!isPremium) {
      setShowPremiumNotice(true);
      setTimeout(() => setShowPremiumNotice(false), 3000);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-xl mb-4">Login to AMG</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={['google']}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">AMG AI Girlfriend</h1>

      <div
  ref={chatRef}
  className="bg-gray-900 rounded-lg p-3 h-80 overflow-y-scroll w-full max-w-md mb-4"
>
  {chatLog.map((msg, i) => (
    <div
      key={i}
      className={`mb-2 p-2 rounded text-sm ${
        msg.role === 'user' ? 'bg-pink-800 text-right' : 'bg-gray-700 text-left'
      }`}
    >
      {msg.message}
    </div>
  ))}
  
</div>
<input
  type="text"
  placeholder="Type your message..."
  value={textPrompt}
  onChange={(e) => setTextPrompt(e.target.value)}
  className="w-full p-2 border rounded-md mt-4 text-black"
/>

<button
  onClick={handleTextSubmit}
  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl mt-2"
>
  Send Text to GF
</button>


      {isPremium && (
        <div className="bg-yellow-500 text-black font-bold text-xs px-3 py-1 rounded-full mb-2">
          Premium User ⭐️
        </div>
      )}

      {showPremiumNotice && (
        <div className="bg-red-600 text-white px-4 py-2 rounded mb-4">
          🔒 This feature is for Premium users only.
        </div>
      )}

      <button onClick={logout} className="text-sm text-red-400 underline mb-4">Log out</button>

      <div className="flex gap-4 mb-4">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-xl ${recording ? 'bg-red-600' : 'bg-green-600'} hover:opacity-90`}
        >
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>

        <input
          type="file"
          accept="audio/*"
          onChange={handleAudioChange}
          className="text-sm"
        />

        <button
          onClick={() => handleUpload(audioFile)}
          className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-xl"
          disabled={loading || !isPremium}
        >
          {loading ? 'Processing...' : 'Send to GF'}
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPremium}
            onChange={(e) => setIsPremium(e.target.checked)}
          />
          Premium Mode ($4.99)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isWorkSafe}
            onChange={(e) => setIsWorkSafe(e.target.checked)}
          />
          Work-Safe Mode
        </label>
        <label className="flex items-center gap-2">
          Mood:
          <select
            value={mood}
            onChange={(e) => {
              const selected = e.target.value;
              if ((selected === 'yandere' || selected === 'tsundere') && !isPremium) {
                handlePremiumClick();
                return;
              }
              setMood(selected);
            }}
            className="bg-gray-800 px-2 py-1 rounded"
          >
            <option value="normal">Normal</option>
            <option value="yandere">Yandere 💢 🔒</option>
            <option value="clingy">Clingy 🥺</option>
            <option value="tsundere">Tsundere 🙄 🔒</option>
            <option value="cute">Cute 😘</option>
          </select>
        </label>
        <button
          className="text-sm underline text-blue-400 mt-2"
          onClick={handleSubscribe}
        >
          Upgrade to Premium
        </button>
      </div>

      {transcription && (
        <div className="bg-gray-800 p-4 rounded-xl w-full max-w-md mb-4">
          <h2 className="font-bold text-lg mb-2">You said:</h2>
          <p>{transcription}</p>
        </div>
      )}

      {gfReply && (
        <div className={`p-4 rounded-xl w-full max-w-md ${nsfwBlocked ? 'bg-yellow-800' : 'bg-pink-900'}`}>
          <h2 className="font-bold text-lg mb-2">GF says:</h2>
          <p>{gfReply}</p>
        </div>
      )}
    </div>
  );
}

