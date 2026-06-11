const EventSystem = {
    triggerDailyEvents() {
        const state = GameState.getState();
        const diff = GameData.difficulties[state.difficulty];

        if (state.events.pending.length > 2) return;

        let eventChance = diff.eventChance;
        if (!state.gate.working) {
            eventChance += 0.2;
        }
        if (!state.power.working) {
            eventChance += 0.1;
        }

        if (Math.random() < eventChance) {
            let eventTypes = ['stranger', 'internal'];
            if (!state.gate.working && Math.random() < 0.6) {
                eventTypes = ['stranger'];
            }
            const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            this.triggerRandomEvent(type);
            if (!state.gate.working && type === 'stranger') {
                GameState.addLog('⚠ 门禁损坏导致陌生人更容易闯入！', 'warning');
            }
        }

        let disasterChance = diff.disasterChance;
        if (!state.power.working) {
            disasterChance += 0.05;
        }

        if (Math.random() < disasterChance) {
            this.triggerRandomEvent('disaster');
        }
    },

    triggerRandomEvent(type) {
        const events = GameData.events[type];
        if (!events || events.length === 0) return null;

        const event = { ...events[Math.floor(Math.random() * events.length)] };
        event.eventType = type;
        
        GameState.addEvent(event);
        UI.showToast(`新事件：${event.title}`, type === 'disaster' ? 'warning' : 'info');
        
        return event;
    },

    triggerSpecificEvent(eventId) {
        for (const type of Object.keys(GameData.events)) {
            const event = GameData.events[type].find(e => e.id === eventId);
            if (event) {
                const newEvent = { ...event };
                newEvent.eventType = type;
                GameState.addEvent(newEvent);
                return newEvent;
            }
        }
        return null;
    },

    canAffordChoice(effect) {
        const state = GameState.getState();
        
        const resourceTypes = ['food', 'water', 'medicine', 'materials', 'parts', 'bandage'];
        
        for (const type of resourceTypes) {
            if (effect[type] && effect[type] < 0) {
                const amount = -effect[type];
                if (!GameState.hasResource(type, amount)) {
                    return { canAfford: false, missingType: type, missingAmount: amount };
                }
            }
        }
        
        if (effect.addResidents) {
            const beds = ResourceSystem.getTotalBeds();
            const currentPopulation = state.residents.length;
            if (currentPopulation + effect.addResidents > beds) {
                return { canAfford: false, reason: '床位不足，无法接纳更多居民' };
            }
        }
        
        return { canAfford: true };
    },

    getResourceName(type) {
        const names = {
            food: '食物',
            water: '水',
            medicine: '药品',
            materials: '材料',
            parts: '零件',
            bandage: '绷带'
        };
        return names[type] || type;
    },

    resolveEvent(eventId, choiceIndex) {
        const state = GameState.getState();
        const event = state.events.pending.find(e => e.id === eventId);
        
        if (!event) return false;
        
        const choice = event.choices[choiceIndex];
        if (!choice) return false;

        const check = this.canAffordChoice(choice.effect);
        if (!check.canAfford) {
            if (check.missingType) {
                UI.showToast(`${this.getResourceName(check.missingType)}不足！需要${check.missingAmount}`, 'error');
            } else if (check.reason) {
                UI.showToast(check.reason, 'error');
            } else {
                UI.showToast('资源不足，无法执行此选择', 'error');
            }
            return false;
        }

        const resolvedChoice = GameState.resolveEvent(eventId, choiceIndex);
        if (!resolvedChoice) return false;

        this.applyChoiceEffect(resolvedChoice.effect);
        
        UI.showToast('事件已处理', 'success');
        GameState.save();
        return true;
    },

    applyChoiceEffect(effect) {
        const state = GameState.getState();

        if (effect.food) {
            if (effect.food > 0) {
                GameState.addResource('food', effect.food);
                GameState.addLog(`获得食物 ${effect.food}。`);
            } else {
                GameState.removeResource('food', -effect.food);
                GameState.addLog(`消耗食物 ${-effect.food}。`);
            }
        }
        if (effect.water) {
            if (effect.water > 0) {
                GameState.addResource('water', effect.water);
                GameState.addLog(`获得水 ${effect.water}。`);
            } else {
                GameState.removeResource('water', -effect.water);
                GameState.addLog(`消耗水 ${-effect.water}。`);
            }
        }
        if (effect.medicine) {
            if (effect.medicine > 0) {
                GameState.addResource('medicine', effect.medicine);
                GameState.addLog(`获得药品 ${effect.medicine}。`);
            } else {
                GameState.removeResource('medicine', -effect.medicine);
                GameState.addLog(`消耗药品 ${-effect.medicine}。`);
            }
        }
        if (effect.materials) {
            if (effect.materials > 0) {
                GameState.addResource('materials', effect.materials);
                GameState.addLog(`获得材料 ${effect.materials}。`);
            } else {
                GameState.removeResource('materials', -effect.materials);
                GameState.addLog(`消耗材料 ${-effect.materials}。`);
            }
        }
        if (effect.parts) {
            if (effect.parts > 0) {
                GameState.addResource('parts', effect.parts);
                GameState.addLog(`获得零件 ${effect.parts}。`);
            } else {
                GameState.removeResource('parts', -effect.parts);
                GameState.addLog(`消耗零件 ${-effect.parts}。`);
            }
        }

        if (effect.morale) {
            GameState.addMorale(effect.morale);
            if (effect.morale > 0) {
                GameState.addLog(`士气提升 ${effect.morale}。`);
            } else {
                GameState.addLog(`士气下降 ${-effect.morale}。`);
            }
        }

        if (effect.addResidents) {
            for (let i = 0; i < effect.addResidents; i++) {
                const newResident = ResidentSystem.generateRandomResident();
                GameState.addResident(newResident);
            }
            GameState.addLog(`接纳了 ${effect.addResidents} 名新居民。`);
        }

        if (effect.sickResidents) {
            const healthy = state.residents.filter(r => r.status === 'healthy' && !r.onMission);
            for (let i = 0; i < effect.sickResidents && i < healthy.length; i++) {
                const idx = Math.floor(Math.random() * healthy.length);
                const resident = healthy[idx];
                ResidentSystem.makeSick(resident);
                GameState.addLog(`${resident.name} 生病了！`);
                healthy.splice(idx, 1);
            }
        }

        if (effect.injuredResidents) {
            const healthy = state.residents.filter(r => !r.injured && !r.onMission);
            for (let i = 0; i < effect.injuredResidents && i < healthy.length; i++) {
                const idx = Math.floor(Math.random() * healthy.length);
                const resident = healthy[idx];
                ResidentSystem.injure(resident, 30);
                GameState.addLog(`${resident.name} 受伤了！`);
                healthy.splice(idx, 1);
            }
        }

        if (effect.damageRoom) {
            for (let i = 0; i < effect.damageRoom; i++) {
                BuildingSystem.damageRandomRoom(25);
            }
        }

        if (effect.damageGate) {
            BuildingSystem.damageGate(effect.damageGate);
        }

        if (effect.powerOutage) {
            state.power.working = false;
            GameState.addLog('电力系统瘫痪了！', 'danger');
        }
    },

    getPendingEvents() {
        const state = GameState.getState();
        return state.events.pending;
    },

    getEventHistory() {
        const state = GameState.getState();
        return state.events.history;
    },

    hasPendingEvents() {
        const state = GameState.getState();
        return state.events.pending.length > 0;
    },

    getUrgentEvents() {
        const state = GameState.getState();
        return state.events.pending.filter(e => e.urgent);
    }
};
