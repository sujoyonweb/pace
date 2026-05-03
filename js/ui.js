import { State } from './state.js';

export const UI = {
    elements: {
        grid: document.getElementById('questionGrid'),
        gTimer: document.getElementById('globalTimer'),
        cQuest: document.getElementById('currentQ')
    },

    renderGrid(onJump) {
        this.elements.grid.innerHTML = '';
        State.qs.forEach(q => {
            const btn = document.createElement('button');
            btn.className = `q-pill ${q.status} ${q.id === State.currentQ ? 'active' : ''}`;
            btn.innerText = q.id;
            btn.onclick = () => onJump(q.id);
            this.elements.grid.appendChild(btn);
        });
        this.scrollToActive();
    },

    scrollToActive() {
        const activeNode = this.elements.grid.querySelector('.active');
        if (activeNode) {
            activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    // NEW: Accepts the pre-calculated string from app.js instead of doing the math itself
    updateTimers(formattedTimeStr) {
        this.elements.gTimer.innerText = formattedTimeStr;
        this.elements.cQuest.innerText = State.currentQ;
    }
};