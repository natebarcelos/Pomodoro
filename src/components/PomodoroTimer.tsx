import { useState, useEffect, useRef } from 'react';

interface Timer {
  id: string;
  name: string;
  duration: number; // in seconds
}

interface EditingTimer {
  id: string;
  name: string;
  duration: number;
}

export default function PomodoroTimer() {
  const [timers, setTimers] = useState<Timer[]>([
    { id: '1', name: 'Work', duration: 25 * 60 }
  ]);
  const [activeTimerId, setActiveTimerId] = useState<string>('1');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTimer, setEditingTimer] = useState<EditingTimer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    const activeTimer = timers.find(t => t.id === activeTimerId);
    if (isActive && activeTimer) {
      document.title = `${activeTimer.name} - ${formatTime(timeLeft)}`;
    } else {
      document.title = 'Pomodoro Timer';
    }

    return () => {
      document.title = 'Pomodoro Timer';
    };
  }, [isActive, timeLeft, activeTimerId, timers]);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Add listeners for user interaction
    const interactions = ['click', 'touchstart', 'keydown'];
    interactions.forEach(event => document.addEventListener(event, initAudio, { once: true }));

    return () => {
      interactions.forEach(event => document.removeEventListener(event, initAudio));
    };
  }, []);

  const playNotificationSound = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume context if it's suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Create a more complex sound (two tones for better notification)
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);

      // First tone
      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(1108.73, ctx.currentTime); // C#6 note

      // Volume envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

      oscillator1.start(ctx.currentTime);
      oscillator2.start(ctx.currentTime);
      oscillator1.stop(ctx.currentTime + 0.5);
      oscillator2.stop(ctx.currentTime + 0.5);

      // Fallback to system notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Timer Complete!', {
          body: 'Your mission timer has finished.',
          icon: '/favicon.ico'
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const handleTimerComplete = () => {
    playNotificationSound();
    setIsActive(false);
    setCompletedPomodoros((prev) => prev + 1);
    resetTimer();
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    const currentTimer = timers.find(t => t.id === activeTimerId);
    if (currentTimer) {
      setTimeLeft(currentTimer.duration);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const addNewTimer = () => {
    const newTimer: Timer = {
      id: Date.now().toString(),
      name: 'New Timer',
      duration: 25 * 60
    };
    setTimers([...timers, newTimer]);
  };

  const startEditing = (timer: Timer) => {
    setEditingTimer({
      id: timer.id,
      name: timer.name,
      duration: timer.duration
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (editingTimer) {
      setTimers(timers.map(timer => 
        timer.id === editingTimer.id ? 
        { ...timer, name: editingTimer.name, duration: editingTimer.duration } : 
        timer
      ));
      if (activeTimerId === editingTimer.id) {
        setTimeLeft(editingTimer.duration);
      }
    }
    setIsEditing(false);
    setEditingTimer(null);
  };

  const handleDurationChange = (minutes: string) => {
    if (editingTimer) {
      const duration = parseInt(minutes) * 60;
      if (!isNaN(duration) && duration > 0) {
        setEditingTimer({ ...editingTimer, duration });
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 md:p-8">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-light tracking-wider text-center mb-12 uppercase">Mission Timer</h1>
        
        {isEditing && editingTimer ? (
          <div className="mb-8 space-y-6 bg-black/50 backdrop-blur-sm p-6 rounded-lg border border-gray-800">
            <div>
              <label className="block text-sm font-medium mb-2 uppercase tracking-wider">Timer Name</label>
              <input
                type="text"
                value={editingTimer.name}
                onChange={(e) => setEditingTimer({ ...editingTimer, name: e.target.value })}
                className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-white/25 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 uppercase tracking-wider">Duration (minutes)</label>
              <input
                type="number"
                value={Math.floor(editingTimer.duration / 60)}
                onChange={(e) => handleDurationChange(e.target.value)}
                min="1"
                className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-white/25 text-white"
              />
            </div>
            <button
              className="w-full px-6 py-3 bg-white text-black rounded-md hover:bg-opacity-90 transition-all duration-300 uppercase tracking-wider"
              onClick={saveEdit}
            >
              Confirm
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {timers.map((timer) => (
                <div key={timer.id} className="flex items-center">
                  <button
                    className={`px-5 py-2.5 rounded-md border ${
                      activeTimerId === timer.id 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent border-gray-700 hover:border-white'
                    } transition-all duration-300`}
                    onClick={() => {
                      setActiveTimerId(timer.id);
                      setTimeLeft(timer.duration);
                      setIsActive(false);
                    }}
                  >
                    {timer.name}
                  </button>
                  <button
                    className="ml-2 p-2.5 bg-transparent border border-gray-700 rounded-md hover:border-white transition-all duration-300"
                    onClick={() => startEditing(timer)}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            </div>

            <button
              className="w-full px-5 py-3 mb-12 bg-transparent border border-gray-700 rounded-md hover:border-white transition-all duration-300 uppercase tracking-wider"
              onClick={addNewTimer}
            >
              Add New Timer
            </button>

            <div className="text-7xl font-light text-center mb-12 font-mono tracking-wider">
              {formatTime(timeLeft)}
            </div>

            <div className="flex justify-center space-x-4 mb-8">
              <button
                className={`flex-1 px-6 py-4 rounded-md transition-all duration-300 uppercase tracking-wider ${
                  isActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-white text-black hover:bg-opacity-90'
                }`}
                onClick={toggleTimer}
              >
                {isActive ? 'Abort' : 'Launch'}
              </button>
              <button
                className="flex-1 px-6 py-4 bg-transparent border border-gray-700 rounded-md hover:border-white transition-all duration-300 uppercase tracking-wider"
                onClick={resetTimer}
              >
                Reset
              </button>
            </div>

            <div className="text-center">
              <p className="text-gray-500 uppercase tracking-wider text-sm">Completed Missions: {completedPomodoros}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 