// Utility to play notification sounds

export const playKitchenBell = () => {
    try {
        // Crear un contexto de audio
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Crear oscilador para el sonido de campana
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configurar frecuencia de campana (tono agudo)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

        // Configurar volumen con fade out
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        // Reproducir
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // Segunda campana (eco)
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();

            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);

            oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);

            gainNode2.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.4);
        }, 150);

    } catch (error) {
        console.error('Error playing sound:', error);
    }
};

export const playSuccessSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.error('Error playing sound:', error);
    }
};
