export function useAudioFeedback() {
  const playSuccess = () => {
    // Som de notificação (agradável, curto)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); 
      
      // "Pom" - Nota Si (B5) disparando logo em seguida
      osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.08); 

      // Configuração do Volume (Ataque rápido e decaimento suave)
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      // Pico do volume no "Plim"
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02); 
      // Mantém o volume alto para o "Pom" e depois esvazia
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      // Inicialização e parada dos osciladores
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const playComplete = () => {
    // Som de conclusão (ascendente)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // Dó
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // Mi
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // Sol
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const vibrate = (pattern = 50) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  return { playSuccess, playComplete, vibrate };
}