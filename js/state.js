import { Storage } from './storage.js';

export const State = {
    config: { name: 'Mock Test', time: 60, qs: 100 },
    qs: [],
    currentQ: 1,
    
    // Real-time timestamp tracking
    globalEndTime: 0,
    currentQStartTime: 0,
    isActive: false,

    init(name, mins, count) {
        this.config.name = name;
        this.config.time = mins;
        this.config.qs = count;
        
        // Use real timestamps
        const now = Date.now();
        this.globalEndTime = now + (mins * 60 * 1000);
        this.currentQStartTime = now;
        
        this.currentQ = 1;
        this.isActive = true;
        
        this.qs = Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            status: 'unvisited',
            time: 0 // Stored in milliseconds
        }));

        this.saveActiveSession();
    },

    saveActiveSession() {
        if (this.isActive) {
            Storage.set('active_session', {
                config: this.config,
                qs: this.qs,
                currentQ: this.currentQ,
                globalEndTime: this.globalEndTime,
                currentQStartTime: this.currentQStartTime
            });
        }
    },

    loadActiveSession() {
        const data = Storage.get('active_session');
        if (!data) return 'none'; // No active session found

        if (data.globalEndTime > Date.now()) {
            this.config = data.config;
            this.qs = data.qs;
            this.currentQ = data.currentQ;
            this.globalEndTime = data.globalEndTime;
            this.currentQStartTime = Date.now(); 
            this.isActive = true;
            return 'active'; // Session is still running
        }
        
        // Time expired while the app was closed! Do not clear it yet.
        return 'expired'; 
    },

    clearActiveSession() {
        this.isActive = false;
        Storage.set('active_session', null);
    },

    // Calculate time spent using real timestamps with a cap
    commitTimeForCurrentQuestion() {
        let now = Date.now();
        
        // --- NEW: THE TIME BLEED PATCH ---
        // If the current time is past the exam's official end time, 
        // cap the calculation at the end time so we don't record "dead time".
        if (now > this.globalEndTime) {
            now = this.globalEndTime;
        }

        // Prevent negative time anomalies if the OS clocks shift
        const elapsedMs = Math.max(0, now - this.currentQStartTime);
        
        this.qs[this.currentQ - 1].time += elapsedMs;
        
        // Reset the start time for the next action to the actual current time
        this.currentQStartTime = Date.now(); 
        this.saveActiveSession();
    }
};