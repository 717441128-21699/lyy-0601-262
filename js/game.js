const Game = {
    init(difficulty = 'normal') {
        GameState.init(difficulty);
        UI.init();
        GameState.updateEventBadge();
    },

    load() {
        if (GameState.load()) {
            UI.init();
            GameState.updateEventBadge();
            UI.renderAll();
            return true;
        }
        return false;
    },

    advanceDay() {
        const state = GameState.getState();
        if (state.gameOver) {
            UI.showToast('游戏已结束', 'warning');
            return;
        }

        const pending = EventSystem.getPendingEvents();
        const urgent = pending.filter(e => e.urgent);
        
        if (urgent.length > 0) {
            UI.showToast('请先处理紧急事件！', 'warning');
            UI.switchView('events');
            return;
        }

        state.day++;
        state.timeOfDay = 'morning';

        ResourceSystem.produceDaily();
        ResourceSystem.consumeDaily();
        ResourceSystem.updateMoraleDaily();

        state.residents.forEach(resident => {
            if (!resident.onMission) {
                ResidentSystem.updateResidentDaily(resident);
            }
        });

        ExplorationSystem.updateMissions();
        MedicalSystem.dailyUpdate();

        this.updateFacilities();
        EventSystem.triggerDailyEvents();

        GameState.checkAchievements();

        const ending = GameState.checkEndings();
        if (ending) {
            this.showEnding(ending);
        }

        GameState.addLog(`第${state.day}天开始。`, 'info');
        
        UI.renderAll();
        GameState.save();
    },

    updateFacilities() {
        const state = GameState.getState();
        
        if (state.power.working && Math.random() < 0.05) {
            state.power.working = false;
            GameState.addLog('电力系统出现故障！', 'warning');
            UI.showToast('电力系统故障', 'warning');
        }

        if (state.gate.working && Math.random() < 0.03) {
            state.gate.health = Math.max(0, state.gate.health - 10);
            if (state.gate.health <= 0) {
                state.gate.working = false;
                GameState.addLog('门禁系统损坏了！', 'warning');
            }
        }

        state.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                if (room.health < 100 && room.health > 0) {
                    if (Math.random() < 0.02) {
                        room.health = Math.max(0, room.health - 5);
                    }
                }
            });
        });
    },

    showEnding(ending) {
        let html = `
            <h2 style="text-align: center; margin-bottom: 20px;">${ending.name}</h2>
            <p style="text-align: center; color: var(--text-secondary); line-height: 1.8;">${ending.desc}</p>
            <br>
            <div style="background: var(--bg-card); padding: 15px; border-radius: 8px;">
                <p>存活天数: <strong>${GameState.getState().day}</strong> 天</p>
                <p>最终人口: <strong>${GameState.getState().residents.length}</strong> 人</p>
                <p>累计接纳: <strong>${GameState.getState().stats.totalJoined}</strong> 人</p>
                <p>死亡人数: <strong>${GameState.getState().stats.totalDeaths}</strong> 人</p>
            </div>
        `;

        const footer = `
            <button class="btn btn-primary" onclick="Game.restart()">重新开始</button>
        `;

        UI.showModal('游戏结束', html, footer);
    },

    restart(difficulty = null) {
        const diff = difficulty || GameState.getState().difficulty;
        GameState.reset();
        this.init(diff);
        UI.switchView('overview');
        UI.showToast('新的冒险开始了！', 'success');
    },

    toggleCurfew() {
        const state = GameState.getState();
        state.policies.curfew = !state.policies.curfew;
        GameState.addLog(`宵禁政策${state.policies.curfew ? '已开启' : '已关闭'}。`, 'info');
        UI.showToast(`宵禁${state.policies.curfew ? '开启' : '关闭'}`, 'info');
        UI.renderAll();
    },

    setRation(level) {
        const state = GameState.getState();
        state.policies.ration = level;
        const names = { normal: '正常', reduced: '减配', starvation: '最低' };
        GameState.addLog(`食物配给调整为${names[level]}。`, 'info');
        UI.showToast(`配给制：${names[level]}`, 'info');
        UI.renderAll();
    },

    setForeignPolicy(policy) {
        const state = GameState.getState();
        state.policies.foreignPolicy = policy;
        const names = { friendly: '友好', neutral: '中立', hostile: '敌对' };
        GameState.addLog(`对外政策调整为${names[policy]}。`, 'info');
        UI.showToast(`对外政策：${names[policy]}`, 'info');
        UI.renderAll();
    }
};
