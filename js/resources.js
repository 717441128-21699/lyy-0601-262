const ResourceSystem = {
    getDailyConsumption() {
        const state = GameState.getState();
        const diff = GameData.difficulties[state.difficulty];
        const population = state.residents.filter(r => !r.onMission).length;
        
        let foodMultiplier = 1;
        let waterMultiplier = 1;
        
        if (state.policies.ration === 'reduced') {
            foodMultiplier = 0.7;
            waterMultiplier = 0.7;
        } else if (state.policies.ration === 'starvation') {
            foodMultiplier = 0.4;
            waterMultiplier = 0.4;
        }
        
        return {
            food: Math.ceil(population * foodMultiplier * diff.consumptionMultiplier),
            water: Math.ceil(population * waterMultiplier * diff.consumptionMultiplier)
        };
    },

    getDailyProduction() {
        const state = GameState.getState();
        const diff = GameData.difficulties[state.difficulty];
        const production = {
            food: 0,
            water: 0,
            materials: 0,
            parts: 0,
            power: 0
        };

        if (!state.power.working) {
            return production;
        }

        state.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                const roomData = GameData.rooms.find(r => r.id === room.type);
                if (!roomData || !roomData.production) return;
                if (room.health < 30) return;

                const allWorkers = state.residents.filter(r => r.assignedRoom === room.id && r.status === 'healthy');
                const workers = allWorkers.filter(w => ResidentSystem.isJobRoomMatch(w.job, room.type));
                const mismatchedWorkers = allWorkers.length - workers.length;
                
                if (mismatchedWorkers > 0) {
                    console.warn(`${roomData.name}有${mismatchedWorkers}名职业不匹配的工人，不会产生有效产出`);
                }
                
                const workerCount = workers.length;
                
                if (workerCount === 0 && roomData.workers && roomData.workers > 0) return;

                const efficiency = room.health / 100;
                const workerEfficiency = roomData.workers ? 
                    Math.min(1, workerCount / roomData.workers) : 1;

                for (const [resource, amount] of Object.entries(roomData.production)) {
                    let total = amount * efficiency * workerEfficiency * diff.productionMultiplier;
                    
                    workers.forEach(worker => {
                        const skill = resource === 'food' ? 'farming' : 
                                     resource === 'water' ? 'scavenge' : 
                                     resource === 'materials' ? 'build' : 'build';
                        total *= (0.7 + worker.skills[skill] / 100 * 0.6);
                        if (worker.traits.includes('hardworking')) total *= 1.15;
                        if (worker.traits.includes('gardener') && resource === 'food') total *= 1.4;
                    });

                    production[resource] += total;
                }
            });
        });

        const chefs = state.residents.filter(r => r.job === 'chef' && r.status === 'healthy');
        if (chefs.length > 0) {
            const canteens = this.countRoomsByType('canteen');
            if (canteens > 0) {
                production.food *= 1.1;
            }
        }

        return production;
    },

    countRoomsByType(type) {
        const state = GameState.getState();
        let count = 0;
        state.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                if (room.type === type && room.health > 20) count++;
            });
        });
        return count;
    },

    getTotalBeds() {
        const state = GameState.getState();
        let beds = 0;
        state.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                const roomData = GameData.rooms.find(r => r.id === room.type);
                if (roomData && roomData.capacity && room.health > 20) {
                    beds += roomData.capacity;
                }
            });
        });
        return beds;
    },

    getMedicalBeds() {
        return this.countRoomsByType('medical_room') * 2;
    },

    getQuarantineBeds() {
        return this.countRoomsByType('quarantine') * 2;
    },

    getDefenseValue() {
        const state = GameState.getState();
        let defense = 0;
        
        if (state.gate.working) {
            defense += state.gate.health / 5;
        }

        state.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                const roomData = GameData.rooms.find(r => r.id === room.type);
                if (roomData && roomData.defense && room.health > 30) {
                    defense += roomData.defense;
                    const guards = state.residents.filter(r => r.assignedRoom === room.id && r.job === 'guard');
                    defense += guards.length * 5;
                }
            });
        });

        const totalGuards = state.residents.filter(r => r.job === 'guard' && r.status === 'healthy').length;
        defense += totalGuards * 8;

        return defense;
    },

    getDaysLeft() {
        const state = GameState.getState();
        const consumption = this.getDailyConsumption();
        const production = this.getDailyProduction();
        
        const netFood = production.food - consumption.food;
        const netWater = production.water - consumption.water;
        
        let daysFood = Infinity;
        let daysWater = Infinity;
        
        if (netFood < 0) {
            daysFood = Math.floor(state.resources.food / (-netFood));
        }
        if (netWater < 0) {
            daysWater = Math.floor(state.resources.water / (-netWater));
        }
        
        return Math.min(daysFood, daysWater);
    },

    consumeDaily() {
        const state = GameState.getState();
        const consumption = this.getDailyConsumption();
        
        const foodEnough = state.resources.food >= consumption.food;
        const waterEnough = state.resources.water >= consumption.water;
        
        GameState.removeResource('food', consumption.food);
        GameState.removeResource('water', consumption.water);

        state.residents.forEach(resident => {
            if (resident.onMission) return;
            
            if (foodEnough) {
                resident.hunger = Math.min(100, resident.hunger + 30);
            }
            if (waterEnough) {
                resident.thirst = Math.min(100, resident.thirst + 30);
            }
        });

        if (!foodEnough) {
            GameState.addLog('食物不足！居民们在挨饿。', 'warning');
            GameState.addMorale(-5);
        }
        if (!waterEnough) {
            GameState.addLog('水源不足！居民们很渴。', 'warning');
            GameState.addMorale(-8);
        }
    },

    produceDaily() {
        const production = this.getDailyProduction();
        
        for (const [resource, amount] of Object.entries(production)) {
            if (amount > 0) {
                GameState.addResource(resource, Math.floor(amount));
            }
        }
    },

    updateMoraleDaily() {
        const state = GameState.getState();
        let moraleChange = 0;

        const sickCount = state.residents.filter(r => r.status === 'sick').length;
        const injuredCount = state.residents.filter(r => r.injured).length;
        
        moraleChange -= sickCount * 2;
        moraleChange -= injuredCount * 1.5;

        if (state.resources.food < 20) moraleChange -= 5;
        if (state.resources.water < 20) moraleChange -= 7;

        const recRooms = this.countRoomsByType('recreation');
        moraleChange += recRooms * 2;

        const canteens = this.countRoomsByType('canteen');
        if (canteens > 0) moraleChange += 1;

        if (state.policies.curfew) {
            moraleChange -= 3;
        }

        const leaders = state.residents.filter(r => r.traits.includes('leadership'));
        if (leaders.length > 0) {
            moraleChange += leaders.length * 1.5;
        }

        if (!state.power.working) {
            moraleChange -= 5;
        }
        if (!state.gate.working) {
            moraleChange -= 3;
        }

        GameState.addMorale(moraleChange);
    }
};
