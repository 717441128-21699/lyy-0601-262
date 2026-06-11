const EventSystem = {
    triggerDailyEvents() {
        const state = GameState.getState();
        const diff = GameData.difficulties[state.difficulty];

        if (state.events.pending.length > 2) return;

        if (Math.random() < diff.eventChance) {
            const eventTypes = ['stranger', 'internal'];
            const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            this.triggerRandomEvent(type);
        }

        if (Math.random() < diff.disasterChance) {
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

    resolveEvent(eventId, choiceIndex) {
        const choice = GameState.resolveEvent(eventId, choiceIndex);
        if (!choice) return;

        this.applyChoiceEffect(choice);
    },

    applyChoiceEffect(choice) {
        const effect = choice.effect;
        const state = GameState.getState();

        if (effect.food) {
            if (effect.food > 0) {
                GameState.addResource('food', effect.food);
            } else {
                GameState.removeResource('food', -effect.food);
            }
        }
        if (effect.water) {
            if (effect.water > 0) {
                GameState.addResource('water', effect.water);
            } else {
                GameState.removeResource('water', -effect.water);
            }
        }
        if (effect.medicine) {
            if (effect.medicine > 0) {
                GameState.addResource('medicine', effect.medicine);
            } else {
                GameState.removeResource('medicine', -effect.medicine);
            }
        }
        if (effect.materials) {
            if (effect.materials > 0) {
                GameState.addResource('materials', effect.materials);
            } else {
                GameState.removeResource('materials', -effect.materials);
            }
        }
        if (effect.parts) {
            if (effect.parts > 0) {
                GameState.addResource('parts', effect.parts);
            } else {
                GameState.removeResource('parts', -effect.parts);
            }
        }

        if (effect.morale) {
            GameState.addMorale(effect.morale);
        }

        if (effect.addResidents) {
            for (let i = 0; i < effect.addResidents; i++) {
                const newResident = ResidentSystem.generateRandomResident();
                GameState.addResident(newResident);
            }
        }

        if (effect.sickResidents) {
            const healthy = state.residents.filter(r => r.status === 'healthy' && !r.onMission);
            for (let i = 0; i < effect.sickResidents && i < healthy.length; i++) {
                const idx = Math.floor(Math.random() * healthy.length);
                const resident = healthy[idx];
                ResidentSystem.makeSick(resident);
                healthy.splice(idx, 1);
            }
        }

        if (effect.injuredResidents) {
            const healthy = state.residents.filter(r => !r.injured && !r.onMission);
            for (let i = 0; i < effect.injuredResidents && i < healthy.length; i++) {
                const idx = Math.floor(Math.random() * healthy.length);
                const resident = healthy[idx];
                ResidentSystem.injure(resident, 30);
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
