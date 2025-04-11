// React frontend for AMG AI Girlfriend App (connected to live backend)
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import supabase from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import AvatarCanvas from './components/AvatarCanvas';
import LeftDrawer from './components/LeftDrawer'; // adjust path if needed



export default function App() {
  const [userEmail, setUserEmail] = useState(null);

  const [chatLog, setChatLog] = useState([]);
  const chatRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  const [nickname, setNickname] = useState('');
  const [favoriteMood, setFavoriteMood] = useState('');

  const [showDrawer, setShowDrawer] = useState(false);

  const [audioFile, setAudioFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [gfReply, setGfReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isWorkSafe, setIsWorkSafe] = useState(false);
  const [nsfwBlocked, setNsfwBlocked] = useState(false);
  const [mood, setMood] = useState('normal');
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [session, setSession] = useState(null);
  const [showPremiumNotice, setShowPremiumNotice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const audioChunksRef = useRef([]);
  const [textPrompt, setTextPrompt] = useState('');
  const [environmentUrl, setEnvironmentUrl] = useState(null);
  const [envPreviewOnly, setEnvPreviewOnly] = useState(false);



  useEffect(() => {
    const fetchMemory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data, error } = await supabase
        .from('users')
        .select('nickname, favorite_mood')
        .eq('id', user.id)
        .single();
  
      if (data) {
        setNickname(data.nickname || '');
        setFavoriteMood(data.favorite_mood || '');
      }
    };
  
    fetchMemory();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (user) {
        setUserEmail(user.email);
      }
    };
  
    getUser();
  }, []);
  
  useEffect(() => {
    const getSessionAndWatch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user?.email) {
        setEmail(session.user.email);
        setUserId(session.user.id); // ✅ added
      }
  
      supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (newSession?.user?.email) {
          setEmail(newSession.user.email);
          setUserId(newSession.user.id); // ✅ added
        }
      });
    };
  
    getSessionAndWatch();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchEnvironment(userId, 'cityscape'); // or any env you want to load
    }
  }, [userId]);
  
  
  const fetchEnvironment = async (userId, envName = 'cityscape') => {
    try {
      const res = await fetch('https://amg2-production.up.railway.app/environment/user-env', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-env-name': envName
        }
      });
  
      const data = await res.json();
      setEnvironmentUrl(data.url);
      setEnvPreviewOnly(data.previewOnly);
    } catch (err) {
      console.error('Failed to fetch environment:', err);
    }
  };
  
  const checkPremiumStatus = async (email) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const { data, error } = await supabase
      .from('users')
      .select('ispremium, stripe_subscription_id')
      .eq('id', user.id)
      .single();
  
    if (error) {
      console.error('Supabase fetch error:', error.message);
      return;
    }
  
    // ✅ Auto-correct if they have a subscription but isPremium is false
    if (data?.stripe_subscription_id && !data?.ispremium) {
      await supabase
        .from('users')
        .update({ ispremium: true })
        .eq('id', user.id);
      console.log('✅ Auto-corrected ispremium to true');
      setIsPremium(true);
    } else {
      setIsPremium(!!data?.ispremium);
    }
  
    setUserEmail(user.email);
  };
  
  useEffect(() => {
    if (email) {
      localStorage.setItem('userEmail', email);
      checkPremiumStatus(email);
      loadChatHistory(); // ✅ Pull chat history
    }
  }, [email]);
  

  const scrollToBottom = () => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  };
  
  const loadChatHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const { data, error } = await supabase
      .from('messages')
      .select('message, reply, created_at')
      .eq('email', user.email)
      .order('created_at', { ascending: true });
  
    if (error) {
      console.error('Failed to load chat history:', error.message);
      return;
    }
  
    const formattedChat = data.flatMap(entry => ([
      { role: 'user', message: entry.message },
      { role: 'gf', message: entry.reply }
    ]));
  
    setChatLog(formattedChat);
  
    setTimeout(() => {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
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
      const aiReply = replyRes.data.reply;
      setGfReply(aiReply);
      playTTS(aiReply);

      // ✅ Save chat to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('messages').insert([
          {
            email: user.email,
            message: textPrompt,
            reply: aiReply,
          },
        ]);
      }
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
  const handleCancel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    try {
      const res = await axios.post('https://amg2-production.up.railway.app/portal', {
        email: user.email,
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert('Could not open Stripe portal');
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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
  
        {/* 🔵 Left Banner */}
        <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-gradient-to-b from-purple-900 via-black to-purple-900 opacity-40 z-0" />
  
        {/* 🔴 Right Banner */}
        <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-b from-pink-800 via-black to-pink-800 opacity-40 z-0" />
  
        {/* Center Login Content */}
        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Login to AMG</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={['google']}
          />
        </div>
      </div>
    );
  }
  

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">AMG AI Girlfriend</h1>
      
{envPreviewOnly && (
  <div style={{
    position: 'absolute',
    bottom: '60px',
    right: '20px',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    zIndex: 30
  }}>
    <p>This scene is a preview.</p>
    <button
      onClick={() => window.location.href = 'https://buy.stripe.com/your-product-id'} // update this
      style={{
        marginTop: '10px',
        background: '#ff4081',
        border: 'none',
        padding: '10px 16px',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer'
      }}
    >
      Purchase Scene
    </button>
  </div>
)}

{userEmail && (
  <div style={{
    position: 'absolute',
    top: '10px',
    left: '10px',
    color: 'white',
    fontSize: '0.9rem',
    opacity: 0.7
  }}>
    {userEmail}
  </div>
)}

<div
  style={{
    position: 'absolute',
    top: '10px',
    right: '10px',
    cursor: 'pointer',
    fontSize: '1.2rem',
    color: 'white',
  }}
  onClick={() => setShowSettings(true)}
>
  ⚙️
</div>
{showSettings && (
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <h2 style={{ color: 'white' }}>Settings</h2>

    <button
      style={{
        padding: '10px 20px',
        backgroundColor: 'red',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        marginTop: '20px',
        cursor: 'pointer'
      }}
      onClick={handleCancel}
    >
      Cancel Subscription
    </button>

    <h3 style={{ color: 'white', marginTop: '30px' }}>🧠 Manage Memories</h3>
    <div style={{ marginTop: '10px', color: 'white', textAlign: 'center' }}>
      <label>
        Nickname:{" "}
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          style={{
            padding: '5px',
            borderRadius: '5px',
            color: 'white',
            backgroundColor: '#333', // or any dark shade that fits
            border: '1px solid white',
          }}
        />
      </label>
      <br />
      <label>
        Favorite Mood:{" "}
        <select
          value={favoriteMood}
          onChange={(e) => setFavoriteMood(e.target.value)}
          style={{
            padding: '5px',
            borderRadius: '5px',
            marginTop: '10px',
            color: 'white',
            backgroundColor: '#333',
            border: '1px solid white',
          }}
        >
          <option value="normal">Normal</option>
          <option value="clingy">Clingy</option>
          <option value="tsundere">Tsundere</option>
          <option value="yandere">Yandere</option>
          <option value="cute">Cute</option>
        </select>
      </label>
      <br />
      <button
        onClick={async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          await supabase
            .from('users')
            .update({ nickname, favorite_mood: favoriteMood })
            .eq('id', user.id);

          alert("Saved memory updates.");
        }}
        style={{ marginTop: '15px', background: 'teal', color: 'white', padding: '8px', borderRadius: '6px' }}
      >
        Save Memory
      </button>
    </div>

    <button
      onClick={() => setShowSettings(false)}
      style={{
        marginTop: '20px',
        background: 'transparent',
        border: 'none',
        color: 'white',
        fontSize: '1rem',
        textDecoration: 'underline',
        cursor: 'pointer',
      }}
    >
      Close
    </button>
  </div>
)}

<div className="w-full max-w-md mb-4 rounded-lg overflow-hidden">
  {isPremium && userId && (
    <div style={{ height: '300px', width: '100%', background: '#111' }}>
      <AvatarCanvas userId={userId} mood={mood} />
    </div>
  )}
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
          {/* Chat Drawer */}
        <LeftDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)}>
          {/* You can replace this with real history */}
          <p>Chat history goes here...</p>
        </LeftDrawer>

        {/* Floating Toggle Button */}
        <button
          onClick={() => setShowDrawer(true)}
          style={{
            position: 'fixed',
            top: '40px',
            left: '20px',
            zIndex: 30,
            padding: '12px',
            borderRadius: '50%',
            backgroundColor: '#444',
            color: '#fff',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
          }}
        >
  💬
      </button>
      
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
            <option value="yandere">Yandere 💢 </option>
            <option value="clingy">Clingy 🥺</option>
            <option value="tsundere">Tsundere 🙄 </option>
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

