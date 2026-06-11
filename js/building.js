const BuildingSystem = {
    canBuild(roomType, floorNumber) {
        const state = GameState.getState();
        const roomData = GameData.rooms.find(r => r.id === roomType);
        if (!roomData) return { canBuild: false, reason: '未知房间类型' };

        const floor = state.floors.find(f => f.number === floorNumber);
        if (!floor) return { canBuild: false, reason: '楼层不存在' };

        if (floor.rooms.length >= floor.maxRooms) {
            return { canBuild: false, reason: '该楼层已满' };
        }

        for (const [resource, amount] of Object.entries(roomData.cost)) {
            if (!GameState.hasResource(resource, amount)) {
                return { canBuild: false, reason: `${this.getResourceName(resource)}不足` };
            }
        }

        return { canBuild: true, reason: '' };
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

    buildRoom(roomType, floorNumber) {
        const state = GameState.getState();
        const check = this.canBuild(roomType, floorNumber);
        
        if (!check.canBuild) {
            UI.showToast(check.reason, 'error');
            return false;
        }

        const roomData = GameData.rooms.find(r => r.id === roomType);
        const floor = state.floors.find(f => f.number === floorNumber);

        for (const [resource, amount] of Object.entries(roomData.cost)) {
            GameState.removeResource(resource, amount);
        }

        const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        floor.rooms.push({
            id: roomId,
            type: roomType,
            health: 100,
            assignedWorkers: [],
            level: 1
        });

        state.stats.totalRoomsBuilt++;
        GameState.addLog(`建造了${roomData.name}。`, 'success');
        UI.showToast(`建造成功：${roomData.name}`, 'success');
        
        GameState.checkAchievements();
        return true;
    },

    repairRoom(roomId) {
        const state = GameState.getState();
        const room = this.findRoom(roomId);
        
        if (!room) return false;
        if (room.health >= 100) {
            UI.showToast('房间已经完好', 'info');
            return false;
        }

        const repairCost = Math.ceil((100 - room.health) / 10) * 2;
        
        if (!GameState.hasResource('materials', repairCost)) {
            UI.showToast('材料不足', 'error');
            return false;
        }

        GameState.removeResource('materials', repairCost);
        room.health = 100;
        
        const roomData = GameData.rooms.find(r => r.id === room.type);
        GameState.addLog(`修复了${roomData.name}。`, 'success');
        UI.showToast('修复完成', 'success');
        return true;
    },

    damageRoom(roomId, damage = 20) {
        const room = this.findRoom(roomId);
        if (!room) return false;
        
        room.health = Math.max(0, room.health - damage);
        
        const roomData = GameData.rooms.find(r => r.id === room.type);
        if (room.health <= 0) {
            GameState.addLog(`${roomData.name} 被摧毁了！`, 'danger');
        } else if (room.health < 30) {
            GameState.addLog(`${roomData.name} 严重受损！`, 'warning');
        }
        
        return true;
    },

    damageRandomRoom(damage = 20) {
        const state = GameState.getState();
        const allRooms = [];
        
        state.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                allRooms.push({ floor, room });
            });
        });
        
        if (allRooms.length === 0) return false;
        
        const target = allRooms[Math.floor(Math.random() * allRooms.length)];
        this.damageRoom(target.room.id, damage);
        return true;
    },

    findRoom(roomId) {
        const state = GameState.getState();
        for (const floor of state.floors) {
            const room = floor.rooms.find(r => r.id === roomId);
            if (room) return room;
        }
        return null;
    },

    findRoomFloor(roomId) {
        const state = GameState.getState();
        for (const floor of state.floors) {
            if (floor.rooms.find(r => r.id === roomId)) {
                return floor;
            }
        }
        return null;
    },

    repairPower() {
        const state = GameState.getState();
        
        if (state.power.working) {
            UI.showToast('电力系统正常', 'info');
            return false;
        }

        if (!GameState.hasResource('materials', 15) || !GameState.hasResource('parts', 5)) {
            UI.showToast('材料或零件不足', 'error');
            return false;
        }

        GameState.removeResource('materials', 15);
        GameState.removeResource('parts', 5);
        
        const mechanics = GameState.getState().residents.filter(r => r.traits.includes('mechanic')).length;
        const repairBonus = mechanics > 0 ? 0.5 : 0;
        
        state.power.working = true;
        GameState.addLog('电力系统已修复。', 'success');
        UI.showToast('电力系统修复完成', 'success');
        return true;
    },

    repairGate() {
        const state = GameState.getState();
        
        if (state.gate.working && state.gate.health >= 100) {
            UI.showToast('门禁系统正常', 'info');
            return false;
        }

        if (!GameState.hasResource('materials', 10) || !GameState.hasResource('parts', 3)) {
            UI.showToast('材料或零件不足', 'error');
            return false;
        }

        GameState.removeResource('materials', 10);
        GameState.removeResource('parts', 3);
        
        state.gate.working = true;
        state.gate.health = 100;
        GameState.addLog('门禁系统已修复。', 'success');
        UI.showToast('门禁系统修复完成', 'success');
        return true;
    },

    damageGate(damage = 20) {
        const state = GameState.getState();
        state.gate.health = Math.max(0, state.gate.health - damage);
        
        if (state.gate.health <= 0) {
            state.gate.working = false;
            GameState.addLog('门禁系统彻底损坏！', 'danger');
        } else if (state.gate.health < 30) {
            GameState.addLog('门禁系统严重受损！', 'warning');
        }
    },

    addFloor() {
        const state = GameState.getState();
        const cost = 50 + state.floors.length * 20;
        
        if (!GameState.hasResource('materials', cost)) {
            UI.showToast('材料不足', 'error');
            return false;
        }

        GameState.removeResource('materials', cost);
        
        const newFloorNum = state.floors.length + 1;
        state.floors.push({
            number: newFloorNum,
            name: GameState.getFloorName(newFloorNum),
            rooms: [],
            maxRooms: 3
        });

        GameState.addLog(`扩建了${GameState.getFloorName(newFloorNum)}。`, 'success');
        UI.showToast('楼层扩建完成', 'success');
        return true;
    },

    getAvailableFloors() {
        const state = GameState.getState();
        return state.floors.filter(f => f.rooms.length < f.maxRooms);
    },

    getBuildableRooms() {
        return GameData.rooms;
    }
};
