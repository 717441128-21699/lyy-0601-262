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

        const production = ResourceSystem.getDailyProduction();
        Object.entries(production).forEach(([type, amount]) => {
            if (amount > 0) GameState.addResourceProduced(type, Math.floor(amount));
        });
        ResourceSystem.produceDaily();

        state.residents.forEach(resident => {
            if (resident.status === 'healthy' && resident.assignedRoom && ResidentSystem.isJobRoomMatch(resident.job, BuildingSystem.findRoom(resident.assignedRoom)?.type)) {
                let baseContribution = 2;
                if (resident.job === 'farmer') baseContribution = 3;
                else if (resident.job === 'water_worker') baseContribution = 3;
                else if (resident.job === 'builder') baseContribution = 2;
                else if (resident.job === 'doctor') baseContribution = 4;
                else if (resident.job === 'guard') baseContribution = 2;
                else if (resident.job === 'scientist') baseContribution = 3;
                else if (resident.job === 'chef') baseContribution = 2;
                else if (resident.job === 'scavenger') baseContribution = 1;
                GameState.addResidentContribution(resident.id, 'production', baseContribution);
            }
            if (resident.status === 'healthy' && resident.job === 'doctor' && !resident.assignedRoom) {
                GameState.addResidentContribution(resident.id, 'production', 2);
            }
        });
        
        const consumption = ResourceSystem.getDailyConsumption();
        Object.entries(consumption).forEach(([type, amount]) => {
            if (amount > 0) GameState.addResourceConsumed(type, Math.floor(amount));
        });
        ResourceSystem.consumeDaily();
        
        ResourceSystem.updateMoraleDaily();

        state.residents.forEach(resident => {
            if (!resident.onMission) {
                ResidentSystem.updateResidentDaily(resident);
            }
        });

        ExplorationSystem.updateMissions();
        MedicalSystem.dailyUpdate();
        BuildingSystem.processRepairQueue();

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
        const state = GameState.getState();
        const stats = state.stats;
        
        const finalScore = state.day * 10 + state.residents.length * 5 + (stats.totalHealed || 0) * 3 + (stats.totalRoomsBuilt || 0) * 8;
        GameState.updateHighScore(ending.name, state.day, state.residents.length, finalScore, state.difficulty);
        
        let totalProduced = 0;
        let totalConsumed = 0;
        if (stats.totalProduced) {
            totalProduced = Object.values(stats.totalProduced).reduce((a, b) => a + b, 0);
        }
        if (stats.totalConsumed) {
            totalConsumed = Object.values(stats.totalConsumed).reduce((a, b) => a + b, 0);
        }

        let topContributor = null;
        let topContribution = 0;
        if (stats.residentContributions) {
            for (const [resId, contrib] of Object.entries(stats.residentContributions)) {
                const resident = state.residents.find(r => r.id === resId) || GameState.getState().residents.find(r => r.id === resId);
                if (!resident) {
                    const allResidents = state.residents;
                    continue;
                }
                const total = (contrib.repairs || 0) + (contrib.production || 0) + (contrib.explorations || 0);
                if (total > topContribution) {
                    topContribution = total;
                    topContributor = resident;
                }
            }
        }

        const bestGame = GameState.getBestGame();
        const isNewRecord = bestGame && bestGame.ending === ending.name && bestGame.days === state.day;

        let html = `
            <h2 style="text-align: center; margin-bottom: 20px;">${ending.name}</h2>
            ${isNewRecord ? '<p style="text-align: center; color: #fbbf24; margin-bottom: 15px;">🏆 新纪录！</p>' : ''}
            <p style="text-align: center; color: var(--text-secondary); line-height: 1.8;">${ending.desc}</p>
            <br>
            <div style="background: var(--bg-card); padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 15px; color: var(--primary);">📊 经营回顾</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <p>存活天数: <strong>${state.day}</strong> 天</p>
                    <p>最终人口: <strong>${state.residents.length}</strong> 人</p>
                    <p>累计接纳: <strong>${stats.totalJoined}</strong> 人</p>
                    <p>死亡人数: <strong>${stats.totalDeaths}</strong> 人</p>
                    <p>病亡人数: <strong>${stats.totalSickDeaths || 0}</strong> 人</p>
                    <p>治愈人数: <strong>${stats.totalHealed}</strong> 人</p>
                    <p>建造房间: <strong>${stats.totalRoomsBuilt}</strong> 个</p>
                    <p>探索次数: <strong>${stats.totalExplorations}</strong> 次</p>
                    <p style="grid-column: 1 / -1; text-align: center; color: var(--primary);">最终得分: <strong>${finalScore}</strong></p>
                </div>
            </div>
        `;

        if (stats.totalProduced || stats.totalConsumed) {
            html += `
                <div style="background: var(--bg-card); padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="margin-bottom: 15px; color: var(--primary);">📦 物资统计</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            `;
            if (stats.totalProduced) {
                html += `<div><strong>总产出:</strong><br>`;
                for (const [type, amount] of Object.entries(stats.totalProduced)) {
                    if (amount > 0) {
                        const names = { food: '食物', water: '水', materials: '材料', parts: '零件' };
                        html += `${names[type] || type}: ${Math.floor(amount)}<br>`;
                    }
                }
                html += `</div>`;
            }
            if (stats.totalConsumed) {
                html += `<div><strong>总消耗:</strong><br>`;
                for (const [type, amount] of Object.entries(stats.totalConsumed)) {
                    if (amount > 0) {
                        const names = { food: '食物', water: '水', medicine: '药品', materials: '材料', parts: '零件', bandage: '绷带' };
                        html += `${names[type] || type}: ${Math.floor(amount)}<br>`;
                    }
                }
                html += `</div>`;
            }
            if (stats.totalExplorationGains) {
                html += `<div style="grid-column: 1 / -1;"><strong>探索收获:</strong><br>`;
                let hasGains = false;
                for (const [type, amount] of Object.entries(stats.totalExplorationGains)) {
                    if (amount > 0) {
                        hasGains = true;
                        const names = { food: '食物', water: '水', medicine: '药品', materials: '材料', parts: '零件' };
                        html += `${names[type] || type}: ${Math.floor(amount)} `;
                    }
                }
                if (!hasGains) html += '无';
                html += `</div>`;
            }
            html += `</div></div>`;
        }

        if (topContributor) {
            html += `
                <div style="background: var(--bg-card); padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="margin-bottom: 10px; color: var(--primary);">⭐ 最有贡献居民</h4>
                    <p><strong>${topContributor.avatar} ${topContributor.name}</strong>（贡献值: ${Math.floor(topContribution)}）</p>
                    <p style="color: var(--text-secondary); font-size: 13px;">职业: ${ResidentSystem.getJob(topContributor.job)?.name || '未知'} | 特长: ${topContributor.traits.map(t => ResidentSystem.getTrait(t)?.name).filter(Boolean).join('、') || '无'}</p>
                </div>
            `;
        }

        const highScores = GameState.getHighScores();
        if (highScores.length > 0) {
            html += `
                <div style="background: var(--bg-card); padding: 20px; border-radius: 8px;">
                    <h4 style="margin-bottom: 15px; color: var(--primary);">🏆 历史最佳记录</h4>
            `;
            highScores.slice(0, 5).forEach((score, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                const diffMap = { easy: '简单', normal: '普通', hard: '困难', nightmare: '噩梦' };
                html += `<p>${medal} ${diffMap[score.difficulty] || score.difficulty} - ${score.ending}: <strong>${score.days}</strong> 天, ${score.population} 人, ${score.score}分</p>`;
            });
            html += `</div>`;
        }

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
        GameState.save();
        UI.renderAll();
    },

    setRation(level) {
        const state = GameState.getState();
        state.policies.ration = level;
        const names = { normal: '正常', reduced: '减配', starvation: '最低' };
        GameState.addLog(`食物配给调整为${names[level]}。`, 'info');
        UI.showToast(`配给制：${names[level]}`, 'info');
        GameState.save();
        UI.renderAll();
    },

    setForeignPolicy(policy) {
        const state = GameState.getState();
        state.policies.foreignPolicy = policy;
        const names = { friendly: '友好', neutral: '中立', hostile: '敌对' };
        GameState.addLog(`对外政策调整为${names[policy]}。`, 'info');
        UI.showToast(`对外政策：${names[policy]}`, 'info');
        GameState.save();
        UI.renderAll();
    }
};
