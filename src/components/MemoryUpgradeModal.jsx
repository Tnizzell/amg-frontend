import { useState } from 'react';
import axios from 'axios';
import supabase from '../supabaseClient';

export default function MemoryUpgradeModal({ onClose }) {
  const [selected, setSelected] = useState(null);

  const tiers = [
    {
      id: 'basic',
      title: 'Basic Memory',
      desc: 'Store up to 100 messages. Ideal for casual connection.',
      price: '$4.99'
    },
    {
      id: 'deep',
      title: 'Deep Memory',
      desc: 'Store 1,000 messages. Great for evolving relationships.',
      price: '$19.99'
    },
    {
      id: 'unlimited',
      title: 'Unlimited Memory',
      desc: 'Never forget a moment. Max bond depth unlocked.',
      price: '$99.99'
    }
  ];

  const handleUpgrade = async () => {
    if (!selected) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await axios.post('https://amg2-production.up.railway.app/stripe/memory-upgrade', {
        email: user.email,
        tier: selected
      });

      window.location.href = res.data.url;
    } catch (err) {
      console.error('Memory upgrade error:', err);
      alert('Failed to start memory upgrade checkout.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-3xl">
        <h2 className="text-white text-2xl font-bold mb-4 text-center">Memory Full</h2>
        <p className="text-gray-400 text-center mb-6">
          You’ve saved 25 messages. To keep our story alive, choose a memory plan:
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex-1 bg-zinc-800 p-4 rounded-lg cursor-pointer border ${
                selected === tier.id ? 'border-pink-500' : 'border-zinc-700'
              } hover:border-pink-400 transition`}
              onClick={() => setSelected(tier.id)}
            >
              <h3 className="text-white text-lg font-semibold mb-2">{tier.title}</h3>
              <p className="text-gray-400 text-sm mb-3">{tier.desc}</p>
              <p className="text-pink-400 font-bold text-xl">{tier.price}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm underline"
          >
            Not now
          </button>
          <button
            onClick={handleUpgrade}
            disabled={!selected}
            className={`px-6 py-2 rounded-lg text-white transition font-semibold ${
              selected ? 'bg-pink-600 hover:bg-pink-700' : 'bg-zinc-700 cursor-not-allowed'
            }`}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
