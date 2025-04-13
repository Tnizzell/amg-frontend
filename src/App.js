// React frontend for AMG AI Girlfriend App (connected to live backend)
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import supabase from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import AvatarCanvas from './components/AvatarCanvas';
import LeftDrawer from './components/LeftDrawer';

export default function App() {
  const [userEmail, setUserEmail] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const chatRef = useRef(null);
  const [nickname, setNickname] = useState('');
  const [favoriteMood, setFavoriteMood] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');
  const [session, setSession] = useState(null);
  const [userId, setUserId] = useState(null);
  const [mood, setMood] = useState('normal');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumNotice, setShowPremiumNotice] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [relationshipLevel, setRelationshipLevel] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false); // if using LeftDrawer

  useEffect(() => {
    const fetchMemory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
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
    const getSessionAndWatch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setUserId(session.user.id);
        loadChatHistory(session.user.id);
      }
      supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (newSession?.user?.email) {
          setUserEmail(newSession.user.email);
          setUserId(newSession.user.id);
          loadChatHistory(newSession.user.id);
        }
      });
    };
    getSessionAndWatch();
  }, []);

  useEffect(() => {
    if (userId) {
      //fetchEnvironment(userId, 'cityscape');
      checkPremiumStatus(userId);
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

  const checkPremiumStatus = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('ispremium')
      .eq('id', userId)
      .single();
    if (data?.ispremium) setIsPremium(true);
  };

  const loadChatHistory = async (userId) => {
    const { data } = await supabase
      .from('messages')
      .select('role, message')
      .eq('user_id', userId);
    if (data) setChatLog(data);
  };

  const saveMessage = async (role, message) => {
    await supabase.from('messages').insert({ user_id: userId, role, message });
  };

  const handleTextSubmit = async () => {
    if (!textPrompt.trim()) return;
  
    const newUserMsg = { role: 'user', message: textPrompt };
    setChatLog((prev) => [...prev, newUserMsg]);
    setIsTyping(true);
  
    // Save user's message
    await supabase.from('messages').insert({
      user_id: userId,
      role: 'user',
      message: textPrompt
    });
  
    // Fetch last 10 messages for memory context
    const { data: history } = await supabase
      .from('messages')
      .select('role, message')
      .eq('user_id', userId)
      .order('inserted_at', { ascending: false })
      .limit(10);
  
    const formattedHistory = history.reverse().map(m =>
      `${m.role === 'user' ? 'You' : 'Her'}: ${m.message}`
    ).join('\n');
  
    // Trust score logic
    const calculateTrust = (msg, level) => {
      return level + (msg.length > 50 ? 1.25 : 0.25);
    };
  
    const trustScore = calculateTrust(textPrompt, relationshipLevel);
  
    try {
      // Send full memory + mood info to backend
      const res = await axios.post('https://amg2-production.up.railway.app/reply', {
        prompt: textPrompt,
        nickname,
        favorite_mood,
        relationship_level: relationshipLevel,
        trust_score: trustScore,
        memory_context: formattedHistory
      });
  
      const reply = res.data.reply;
  
      const replyMsg = { role: 'gf', message: reply };
      setChatLog((prev) => [...prev, replyMsg]);
  
      // Save AI reply
      await supabase.from('messages').insert({
        user_id: userId,
        role: 'gf',
        message: reply
      });
  
      // Update memory and relationship
      const newLevel = relationshipLevel + 1;
      setRelationshipLevel(newLevel);
  
      await supabase.from('users')
        .update({
          relationship_level: newLevel,
          last_reply: textPrompt,
          trust_score: trustScore
        })
        .eq('id', userId);
  
      // Speak it out loud
      speakWithElevenLabs(reply);
  
    } catch (err) {
      console.error('Reply error:', err);
    }
  
    setIsTyping(false);
    setTextPrompt('');
  };
  

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    synth.speak(utter);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // UI continues below...

  // UI continues below...

  // Tailwind UI continues below...

    
  // The rest of your logic and rendering continues here.
  // ...

// React frontend for AMG AI Girlfriend App (connected to live backend)
// ...imports and logic remain unchanged

  // RENDER
  return !session ? (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Login to AMG</h1>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        theme="dark"
        providers={['google']}
      />
      <p className="text-xs text-gray-500 mt-4">No account? Just sign in — we’ll remember you.</p>
    </div>
  ) : (
    <div className="min-h-screen bg-black text-white flex flex-col p-4 overflow-x-hidden">
      {/* CHAT AREA */}
      <div className="flex flex-col gap-2 w-full max-w-xl mx-auto mb-8 overflow-y-auto pb-24" ref={chatRef}>
        {chatLog.map((msg, i) => (
          <div
            key={i}
            className={`text-sm px-4 py-2 rounded-xl max-w-[80%] break-words transition-all duration-200 ${
              msg.role === 'user'
                ? 'self-end bg-pink-700 text-white animate-fadeInUp'
                : 'self-start bg-gray-700 text-white animate-fadeInUp'
            }`}
          >
            {msg.message}
          </div>
        ))}
      <button
        onClick={() => setShowDrawer(true)}
        className="fixed top-4 left-4 z-50 bg-zinc-800 text-white px-3 py-2 rounded-lg shadow hover:bg-zinc-700"
      >
        ☰ Menu
      </button>

        {/* LEFT DRAWER MENU */}
{showDrawer && (
  <div className="fixed top-0 left-0 w-80 h-full bg-zinc-900 text-white z-50 shadow-xl p-6 overflow-y-auto">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-lg font-bold">Menu</h2>
      <button
        onClick={() => setShowDrawer(false)}
        className="text-gray-400 hover:text-white text-xl"
      >
        ✕
      </button>
    </div>

    <div className="space-y-5">

      {/* Manage Memories */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-1">🧠 Manage Memories</h3>
        <button
          onClick={() => {
            setShowDrawer(false);
            setShowSettings(true);
          }}
          className="bg-zinc-700 px-4 py-2 rounded-md w-full text-left hover:bg-zinc-600"
        >
          Edit Nickname & Mood
        </button>
      </div>

      {/* Change Mood */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-1">🎭 Change Mood</h3>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="bg-zinc-800 border border-gray-600 rounded-md px-3 py-2 w-full text-white"
        >
          <option value="normal">Normal</option>
          <option value="clingy">Clingy</option>
          <option value="tsundere">Tsundere</option>
          <option value="yandere">Yandere</option>
          <option value="cute">Cute</option>
        </select>
      </div>

      {/* Environment */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-1">🌐 Change Environment</h3>
        <select
          onChange={(e) => fetchEnvironment(userId, e.target.value)}
          className="bg-zinc-800 border border-gray-600 rounded-md px-3 py-2 w-full text-white"
        >
          <option value="cityscape">Cityscape</option>
          <option value="lounge">Lounge</option>
          <option value="bedroom">Bedroom</option>
          <option value="void">Void</option>
        </select>
      </div>

      {/* Relationship Level */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-1">❤️ Relationship Level</h3>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-600 transition-all duration-300"
            style={{ width: `${Math.min(relationshipLevel * 5, 100)}%` }}
          />
        </div>
        <p className="text-xs mt-1 text-gray-400">{relationshipLevel} / 100</p>
      </div>

      {/* Voice Settings (future use) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-1">🔊 Voice Settings</h3>
        <button
          onClick={() => alert("Coming soon — voice previews & ElevenLabs selector")}
          className="bg-zinc-700 px-4 py-2 rounded-md w-full text-left hover:bg-zinc-600"
        >
          Coming Soon
        </button>
      </div>

      {/* Premium Access */}
      {isPremium && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-1">⭐ Premium Status</h3>
          <p className="text-xs text-green-400 mb-2">You are a Premium user</p>
          <button
            onClick={handleCancel}
            className="bg-red-700 px-4 py-2 rounded-md w-full hover:bg-red-800"
          >
            Cancel Subscription
          </button>
        </div>
      )}

      {/* Logout */}
      <div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white underline mt-6"
        >
          Logout
        </button>
      </div>

    </div>
  </div>
)}


        <p className="text-xs text-gray-400 text-right">Logged in as {userEmail}</p>


        {isTyping && (
          <div className="self-start bg-gray-600 text-white px-4 py-2 text-sm rounded-xl max-w-[60%] animate-pulse">
            Typing...
          </div>
        )}
      </div>
  
      {/* INPUT BAR (Sticky) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-700 px-4 py-3 z-40">
        <div className="w-full max-w-xl mx-auto flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Type your message..."
            value={textPrompt}
            onChange={(e) => setTextPrompt(e.target.value)}
            className="flex-grow w-full sm:w-auto p-3 rounded-lg text-black placeholder-gray-400"
          />
          <button
            onClick={handleTextSubmit}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Send
          </button>
        </div>
      </div>
  
      {showPremiumNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow z-50">
          This feature is for premium users only.
        </div>
      )}
  
      {/* SCROLL TO BOTTOM BUTTON */}
      <button
        onClick={() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })}
        className="fixed bottom-20 right-4 z-40 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 text-sm rounded-full shadow"
      >
        ↓ Jump to Bottom
      </button>
  
      {/* RELATIONSHIP METER */}
      <div className="w-full max-w-xl mx-auto mt-4">
        <div className="text-xs mb-1">❤️ Relationship Level</div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-600 transition-all duration-300"
            style={{ width: `${Math.min(relationshipLevel * 5, 100)}%` }}
          />
        </div>
      </div>
      
      {relationshipLevel >= 25 ? (
      <div className="w-full h-[300px] bg-zinc-900 rounded-lg overflow-hidden">
        <AvatarCanvas userId={userId} mood={mood} />
      </div>
    ) : (
      <div className="w-full h-[300px] bg-zinc-900 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-black/60 z-10 flex flex-col items-center justify-center">
          <span className="text-white text-2xl font-bold mb-1">🔒</span>
          <p className="text-gray-300 text-sm text-center">
            Model locked. Keep building your relationship to unlock.
          </p>
        </div>
        {/* Tease silhouette or static image behind blur (optional) */}
        <img
          src="/images/locked-avatar-silhouette.png"
          alt="Locked Avatar"
          className="object-cover w-full h-full opacity-30 grayscale"
        />
      </div>
    )}

  
      {/* PREMIUM BADGE */}
      {isPremium && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow z-50">
          ⭐ Premium User
        </div>
      )}
  
      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center px-4 transition-transform duration-300 scale-95 animate-fadeIn">
          <h2 className="text-white text-xl font-bold mb-4">Settings</h2>
  
          <button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg mb-6"
          >
            Cancel Subscription
          </button>
  
          <h3 className="text-white text-lg font-semibold mb-2">🧠 Manage Memories</h3>
          <div className="text-center text-white space-y-4">
            <div>
              <label className="block text-sm mb-1">Nickname:</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-white rounded-md text-white w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Favorite Mood:</label>
              <select
                value={favoriteMood}
                onChange={(e) => setFavoriteMood(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-white rounded-md text-white w-full"
              >
                <option value="normal">Normal</option>
                <option value="clingy">Clingy</option>
                <option value="tsundere">Tsundere</option>
                <option value="yandere">Yandere</option>
                <option value="cute">Cute</option>
              </select>
            </div>
            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase
                  .from('users')
                  .update({ nickname, favorite_mood: favoriteMood })
                  .eq('id', user.id);
                alert('Saved memory updates.');
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg"
            >
              Save Memory
            </button>
          </div>
  
          <button onClick={() => setShowSettings(false)} className="mt-6 text-white underline text-sm">
            Close
          </button>
        </div>
      )}
    </div>
  );
}