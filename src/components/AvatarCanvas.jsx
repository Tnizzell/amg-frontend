import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';


function Avatar({ url, mood }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, mixer } = useAnimations(animations, group);
  const current = useRef(null);


  useEffect(() => {
    if (!actions) return;

    const play = (name) => {
      if (actions[name]) {
        if (current.current && actions[current.current]) {
          actions[current.current].fadeOut(0.3);
        }
        actions[name].reset().fadeIn(0.3).play();
        current.current = name;
      }
    };

    switch (mood) {
      case 'flirty':
        play('Flirty');
        break;
      case 'talk':
        play('Talk');
        break;
      default:
        play('Idle');
        break;
    }
  }, [mood, actions]);

  useFrame((_, delta) => mixer && mixer.update(delta));

  return <primitive ref={group} object={scene} scale={1.3} />;
}

export default function AvatarCanvas({ userId, mood }) {
  const [modelUrl, setModelUrl] = useState(null);
  const [envUrl, setEnvUrl] = useState(null);
  const [envPreviewOnly, setEnvPreviewOnly] = useState(false);

  useEffect(() => {
    const fetchModel = async () => {
      console.log('📦 Fetching model for user:', userId); // ✅ Log first
    
      const res = await fetch('https://amg2-production.up.railway.app/model/model-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
      });
    
      const data = await res.json();
      setModelUrl(data.url);
    };
    

    if (userId) fetchModel();
  }, [userId]);

  useEffect(() => {
    const fetchEnvironment = async () => {
      console.log("📦 Fetching environment for user:", userId);
      const res = await fetch('https://amg2-production.up.railway.app/environment/user-env', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-env-name': 'cityscape', // 👈 replace with dynamic later if needed
        },
      });
  
      const data = await res.json();
      setEnvUrl(data.url);
      setEnvPreviewOnly(data.previewOnly);
    };
  
    if (userId) fetchEnvironment();
  }, [userId]);
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 1.5, 3] }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[0, 5, 5]} intensity={0.6} />
        <OrbitControls enableZoom={false} />
        <Suspense fallback={null}>
          {modelUrl && <Avatar url={modelUrl} mood={mood} />}
        </Suspense>
      </Canvas>

      {envPreviewOnly && (
  <div style={{
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '1rem',
    borderRadius: '1rem',
    zIndex: 10,
  }}>
    <p style={{ marginBottom: '0.5rem' }}>This is a preview environment.</p>
    <a
      href="https://buy.stripe.com/prod_S73Lp56HjjZ4kS" // 🔁 replace this
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-block',
        backgroundColor: 'white',
        color: 'black',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        fontWeight: 'bold',
        textDecoration: 'none',
      }}
    >
      Unlock Scene
    </a>
  </div>
)}

    </div>
  );
  
}
