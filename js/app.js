import { Storage } from './storage.js';
import { State } from './state.js';
import { UI } from './ui.js';

const App = {
    timerFrame: null,
    viewingSessionId: null, 

    ui: {
        // Sticky Header Close Buttons
        btnTopCloseHistory: document.getElementById('btnTopCloseHistory'),
        btnTopCloseAnalytics: document.getElementById('btnTopCloseAnalytics'),

        // History UI
        btnViewAllSessions: document.getElementById('btnViewAllSessions'),
        viewAllSessions: document.getElementById('viewAllSessions'),
        fullSessionsList: document.getElementById('fullSessionsList'),

        // Views
        viewHome: document.getElementById('viewHome'),
        viewSession: document.getElementById('viewSession'),
        viewAnalytics: document.getElementById('viewAnalytics'),
        
        // Home
        inpName: document.getElementById('inpName'),
        inpTime: document.getElementById('inpTime'),
        inpQs: document.getElementById('inpQs'),
        btnStart: document.getElementById('btnStartSession'),
        pastSessionsList: document.getElementById('pastSessionsList'),

        // Session
        btnSaveNext: document.getElementById('btnSaveNext'),
        btnSkip: document.getElementById('btnSkip'),
        btnReview: document.getElementById('btnReview'),
        btnPrev: document.getElementById('btnPrev'),
        btnSaveSession: document.getElementById('btnSaveSession'),
        
        // Modals
        modalSubmit: document.getElementById('modalSubmit'),
        btnModalCancel: document.getElementById('btnModalCancel'),
        btnModalConfirm: document.getElementById('btnModalConfirm'),
        
        // NEW: Sync Modal UI
        btnOpenSync: document.getElementById('btnOpenSync'),
        modalSync: document.getElementById('modalSync'),
        btnExportData: document.getElementById('btnExportData'),
        inpImportData: document.getElementById('inpImportData'),
        btnSyncCancel: document.getElementById('btnSyncCancel'),

        // NEW: Reset Modal UI
        btnOpenReset: document.getElementById('btnOpenReset'),
        modalReset: document.getElementById('modalReset'),
        btnResetCancel: document.getElementById('btnResetCancel'),
        btnResetConfirm: document.getElementById('btnResetConfirm'),

        // Analytics UI
        analyticsTitle: document.getElementById('analyticsTitle'),
        statTotalTime: document.getElementById('statTotalTime'),
        statAttempted: document.getElementById('statAttempted'),
        statAvgSpeed: document.getElementById('statAvgSpeed'),
        analyticsList: document.getElementById('analyticsList'),
        
        // Grading UI
        inpMarks: document.getElementById('inpMarks'),
        inpNegative: document.getElementById('inpNegative'),
        inpCorrect: document.getElementById('inpCorrect'),
        inpWrong: document.getElementById('inpWrong'),
        statSkippedCalc: document.getElementById('statSkippedCalc'),
        statAccuracy: document.getElementById('statAccuracy'),
        displayScore: document.getElementById('displayScore')
    },

    init() {
        this.bindEvents();
        this.loadFormState();
        
        const sessionStatus = State.loadActiveSession();
        
        if (sessionStatus === 'active') {
            this.switchView('session');
            UI.renderGrid((id) => this.jump(id));
            this.startTimerLoop();
        } else if (sessionStatus === 'expired') {
            // NEW: Automatically save tests that ran out of time in the background
            this.recoverAndSubmitExpiredSession();
        } else {
            this.renderPastSessions();
            this.switchView('home');
        }
    },

    // --- RECOVERY LOGIC (SILENT) ---
    recoverAndSubmitExpiredSession() {
        // 1. Grab the frozen data before clearing it
        const expiredData = Storage.get('active_session');
        State.clearActiveSession(); 

        // 2. Build the history record
        const sessionRecord = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            config: expiredData.config,
            qs: expiredData.qs,
            grading: null 
        };

        // 3. Save it safely
        const history = Storage.get('past_sessions') || [];
        history.unshift(sessionRecord);
        if (history.length > 50) history.pop(); 
        Storage.set('past_sessions', history);

        // 4. Silently update the UI and route to the home screen
        this.renderPastSessions();
        this.switchView('home');
    },

    switchView(viewName) {
        this.ui.viewHome.classList.remove('active');
        this.ui.viewHome.classList.add('hidden');
        this.ui.viewSession.classList.remove('active');
        this.ui.viewSession.classList.add('hidden');
        this.ui.viewAnalytics.classList.remove('active');
        this.ui.viewAnalytics.classList.add('hidden');
        this.ui.viewAllSessions.classList.remove('active');
        this.ui.viewAllSessions.classList.add('hidden');

        if (viewName === 'home') {
            this.ui.viewHome.classList.add('active');
            this.ui.viewHome.classList.remove('hidden');
        }
        if (viewName === 'session') {
            this.ui.viewSession.classList.add('active');
            this.ui.viewSession.classList.remove('hidden');
        }
        if (viewName === 'analytics') {
            this.ui.viewAnalytics.classList.add('active');
            this.ui.viewAnalytics.classList.remove('hidden');
        }
        if (viewName === 'all_sessions') {
            this.ui.viewAllSessions.classList.add('active');
            this.ui.viewAllSessions.classList.remove('hidden');
        }
    },

    loadFormState() {
        const pref = Storage.get('preferences') || {};
        this.ui.inpName.value = pref.name || "Mock Test 1";
        this.ui.inpTime.value = pref.time || "60";
        this.ui.inpQs.value = pref.qs || "100";
        this.ui.inpMarks.value = pref.marks || "2";
        this.ui.inpNegative.value = pref.negative || "-0.5";
    },

    saveFormState() {
        Storage.set('preferences', {
            name: this.ui.inpName.value,
            time: this.ui.inpTime.value,
            qs: this.ui.inpQs.value,
            marks: this.ui.inpMarks.value,
            negative: this.ui.inpNegative.value
        });
    },

    bindEvents() {
        [this.ui.inpName, this.ui.inpTime, this.ui.inpQs, this.ui.inpMarks, this.ui.inpNegative].forEach(inp => {
            inp.addEventListener('input', () => this.saveFormState());
        });

        [this.ui.inpMarks, this.ui.inpNegative, this.ui.inpCorrect, this.ui.inpWrong].forEach(inp => {
            inp.addEventListener('input', () => this.calculateGrade());
        });

        this.ui.btnStart.addEventListener('click', () => this.startNewSession());
        this.ui.btnViewAllSessions.addEventListener('click', () => this.renderAllSessions());
        
        this.ui.btnTopCloseHistory.addEventListener('click', () => this.switchView('home'));
        this.ui.btnTopCloseAnalytics.addEventListener('click', () => {
            this.renderPastSessions(); 
            this.switchView('home');
        });
        
        this.ui.btnSaveNext.addEventListener('click', () => this.next('answered'));
        this.ui.btnSkip.addEventListener('click', () => this.next('skipped'));
        this.ui.btnReview.addEventListener('click', () => this.next('review'));
        this.ui.btnPrev.addEventListener('click', () => this.prev());

        this.ui.btnSaveSession.addEventListener('click', () => this.ui.modalSubmit.classList.remove('hidden'));
        this.ui.btnModalCancel.addEventListener('click', () => this.ui.modalSubmit.classList.add('hidden'));
        this.ui.btnModalConfirm.addEventListener('click', () => {
            this.ui.modalSubmit.classList.add('hidden');
            this.submitSession();
        });

        // --- NEW: SYNC DATA EVENTS ---
        this.ui.btnOpenSync.addEventListener('click', () => this.ui.modalSync.classList.remove('hidden'));
        this.ui.btnSyncCancel.addEventListener('click', () => this.ui.modalSync.classList.add('hidden'));
        
        this.ui.btnExportData.addEventListener('click', () => this.exportData());
        this.ui.inpImportData.addEventListener('change', (e) => this.importData(e));

        // --- NEW: RESET APP EVENTS ---
        this.ui.btnOpenReset.addEventListener('click', () => this.ui.modalReset.classList.remove('hidden'));
        this.ui.btnResetCancel.addEventListener('click', () => this.ui.modalReset.classList.add('hidden'));
        this.ui.btnResetConfirm.addEventListener('click', () => this.resetApp());
    },

    // --- NEW: DATA MANAGEMENT LOGIC ---
    exportData() {
        const data = {
            past_sessions: Storage.get('past_sessions'),
            preferences: Storage.get('preferences'),
            active_session: Storage.get('active_session')
        };
        
        // Create a downloadable JSON file
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pace_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.ui.modalSync.classList.add('hidden');
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Restore data directly into Storage
                if (data.past_sessions !== undefined) Storage.set('past_sessions', data.past_sessions);
                if (data.preferences !== undefined) Storage.set('preferences', data.preferences);
                if (data.active_session !== undefined) Storage.set('active_session', data.active_session);
                
                alert('Backup imported successfully!');
                window.location.reload(); // Reload to show restored data
            } catch (err) {
                alert('Error: Invalid backup file.');
            }
        };
        reader.readAsText(file);
    },

    resetApp() {
        // Find and delete only the keys associated with this app to be safe
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(Storage.PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Hard refresh to clear the slate
        window.location.reload();
    },

    // --- TEST TAKING ENGINE ---
    startNewSession() {
        if (!this.ui.inpName.value.trim()) return alert("Enter a Session Name!");
        this.saveFormState();
        
        const name = this.ui.inpName.value;
        const mins = parseInt(this.ui.inpTime.value) || 60;
        const qs = parseInt(this.ui.inpQs.value) || 100;
        
        State.init(name, mins, qs);
        this.switchView('session');
        UI.renderGrid((id) => this.jump(id));
        this.startTimerLoop();
    },

    startTimerLoop() {
        cancelAnimationFrame(this.timerFrame);
        
        const tick = () => {
            const remainingMs = State.globalEndTime - Date.now();
            
            if (remainingMs <= 0) {
                this.submitSession(); 
                return;
            }
            
            UI.updateTimers(this.formatTime(Math.ceil(remainingMs / 1000), true));
            this.timerFrame = requestAnimationFrame(tick);
        };
        this.timerFrame = requestAnimationFrame(tick);
    },

    formatTime(totalSeconds, showHours = false) {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return showHours && h > 0 ? `${h} : ${m} : ${s}` : `${m}:${s}`;
    },

    jump(newId) {
        State.commitTimeForCurrentQuestion();
        State.currentQ = newId;
        UI.renderGrid((id) => this.jump(id));
    },

    next(status) {
        State.qs[State.currentQ - 1].status = status;
        if (State.currentQ < State.qs.length) {
            this.jump(State.currentQ + 1);
        } else {
            State.commitTimeForCurrentQuestion();
            UI.renderGrid((id) => this.jump(id));
        }
    },

    prev() {
        if (State.currentQ > 1) this.jump(State.currentQ - 1);
    },

    submitSession() {
        // 1. Always stop the timer and clear the recovery memory first
        cancelAnimationFrame(this.timerFrame);
        State.commitTimeForCurrentQuestion();
        State.clearActiveSession();

        // --- NEW: SMART DISCARD LOGIC ---
        // Calculate total time spent (using a fallback to 0 just in case)
        const totalTimeSpentMs = State.qs.reduce((acc, q) => acc + (q.time || 0), 0);
        
        // Count how many questions they actually tried to answer
        const attemptedQs = State.qs.filter(q => q.status === 'answered').length;

        // The Filter: Less than 60 seconds AND 0 answers? It's an accidental start.
        if (totalTimeSpentMs < 60000 && attemptedQs === 0) {
            console.log("Accidental session detected. Discarding without saving.");
            this.renderPastSessions(); 
            this.switchView('home');
            return; // 🛑 EXIT EARLY: Do not execute the save logic below
        }
        // --------------------------------

        // 2. If it passes the filter, build the record and save it
        const sessionRecord = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            config: State.config,
            qs: State.qs,
            grading: null 
        };

        const history = Storage.get('past_sessions') || [];
        history.unshift(sessionRecord);
        
        // Keep the history capped at 50 to prevent local storage bloat
        if (history.length > 50) history.pop(); 
        
        Storage.set('past_sessions', history);

        // 3. Update UI and return home
        this.renderPastSessions();
        this.switchView('home');
    },

    // --- HOME PAGE HISTORY ---
    renderPastSessions() {
        const history = Storage.get('past_sessions') || [];
        this.ui.pastSessionsList.innerHTML = '';

        if (history.length === 0) {
            this.ui.pastSessionsList.innerHTML = '<div class="session-item" style="justify-content:center; color:var(--text-muted)">No tests completed yet.</div>';
            this.ui.btnViewAllSessions.classList.add('hidden');
            return;
        }

        const recentHistory = history.slice(0, 10);
        recentHistory.forEach(session => {
            this.ui.pastSessionsList.appendChild(this.createSessionCard(session));
        });

        if (history.length > 0) {
            this.ui.btnViewAllSessions.classList.remove('hidden');
        } else {
            this.ui.btnViewAllSessions.classList.add('hidden');
        }
    },

    renderAllSessions() {
        const history = Storage.get('past_sessions') || [];
        this.ui.fullSessionsList.innerHTML = '';

        history.forEach(session => {
            this.ui.fullSessionsList.appendChild(this.createSessionCard(session));
        });

        this.switchView('all_sessions');
    },

    createSessionCard(session) {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        const scoreDisplay = session.grading && session.grading.score !== undefined 
            ? `${session.grading.score} pts` 
            : '<span style="font-size:0.8rem; font-weight:400;">Needs Grading</span>';

        div.innerHTML = `
            <div class="session-item-left">
                <span class="session-item-title">${session.config.name}</span>
                <span class="session-item-date">${session.date} • ${session.config.qs} Qs</span>
            </div>
            <div class="session-item-score">${scoreDisplay}</div>
        `;
        div.onclick = () => this.openAnalytics(session.id);
        return div;
    },

    // --- ANALYTICS & GRADING ---
    openAnalytics(sessionId) {
        const history = Storage.get('past_sessions') || [];
        const session = history.find(s => s.id === sessionId);
        if (!session) return;

        this.viewingSessionId = sessionId; 
        this.ui.analyticsTitle.innerText = session.config.name;

        const attemptedQs = session.qs.filter(q => q.status === 'answered').length;
        const totalTimeMs = session.qs.reduce((acc, q) => acc + q.time, 0);
        const avgSpeedSeconds = attemptedQs > 0 
            ? Math.floor((session.qs.filter(q => q.status === 'answered').reduce((acc, q) => acc + q.time, 0) / attemptedQs) / 1000)
            : 0;

        this.ui.statTotalTime.innerText = this.formatTime(Math.floor(totalTimeMs / 1000));
        this.ui.statAttempted.innerText = `${attemptedQs}/${session.config.qs}`;
        this.ui.statAvgSpeed.innerText = `${avgSpeedSeconds}s / Q`;

        if (session.grading) {
            this.ui.inpMarks.value = session.grading.marks;
            this.ui.inpNegative.value = session.grading.negative;
            this.ui.inpCorrect.value = session.grading.correct;
            this.ui.inpWrong.value = session.grading.wrong;
        } else {
            this.ui.inpCorrect.value = '';
            this.ui.inpWrong.value = '';
            this.loadFormState(); 
        }

        this.calculateGrade(session.config.qs); 

        this.ui.analyticsList.innerHTML = '';
        session.qs.forEach(q => {
            if (q.status === 'unvisited' && q.time < 1000) return; 
            const row = document.createElement('div');
            row.className = 'stat-row';
            const timeInSec = Math.floor(q.time / 1000);
            const timeStr = this.formatTime(timeInSec);
            const timeColor = timeInSec > 60 ? 'color: #E63946' : 'color: var(--text-muted)';
            
            row.innerHTML = `
                <span style="font-weight: 500; width: 40px;">Q${q.id}</span>
                <span class="status-text-${q.status}" style="flex:1; text-align:center;">${q.status}</span>
                <span style="${timeColor}; font-family: var(--font-mono);">${timeStr}</span>
            `;
            this.ui.analyticsList.appendChild(row);
        });

        this.switchView('analytics');
    },

    calculateGrade(passedTotalQs = null) {
        if (!this.viewingSessionId) return;

        const history = Storage.get('past_sessions') || [];
        const sessionIndex = history.findIndex(s => s.id === this.viewingSessionId);
        if (sessionIndex === -1) return;
        
        const totalQs = passedTotalQs || history[sessionIndex].config.qs;

        const correct = parseInt(this.ui.inpCorrect.value) || 0;
        const wrong = parseInt(this.ui.inpWrong.value) || 0;
        const markPerQ = parseFloat(this.ui.inpMarks.value) || 0;
        const negativeMark = Math.abs(parseFloat(this.ui.inpNegative.value) || 0);

        const skippedCalc = totalQs - (correct + wrong);
        const attemptCalc = correct + wrong;
        const accuracyCalc = attemptCalc > 0 ? Math.round((correct / attemptCalc) * 100) : 0;
        const totalScore = (correct * markPerQ) - (wrong * negativeMark);

        this.ui.statSkippedCalc.innerText = Math.max(0, skippedCalc);
        this.ui.statAccuracy.innerText = `${accuracyCalc}%`;
        this.ui.displayScore.innerText = totalScore.toFixed(2);

        history[sessionIndex].grading = {
            marks: markPerQ,
            negative: negativeMark,
            correct: correct,
            wrong: wrong,
            score: totalScore.toFixed(2)
        };
        Storage.set('past_sessions', history);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());