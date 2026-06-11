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

    addRepairTask(targetType, targetId, assignedWorkers = []) {
        const state = GameState.getState();
        
        if (state.repairQueue.find(t => t.targetType === targetType && t.targetId === targetId)) {
            UI.showToast('该目标已在维修队列中', 'info');
            return null;
        }

        let taskName = '';
        let maxHealth = 100;
        let currentHealth = 0;
        let materialsCost = 0;
        let partsCost = 0;

        if (targetType === 'room') {
            const room = this.findRoom(targetId);
            if (!room || room.health >= 100) return null;
            const roomData = GameData.rooms.find(r => r.id === room.type);
            taskName = roomData ? roomData.name : '房间';
            currentHealth = room.health;
            materialsCost = Math.ceil((maxHealth - currentHealth) / 10) * 2;
            partsCost = 0;
        } else if (targetType === 'power') {
            if (state.power.working) return null;
            taskName = '电力系统';
            currentHealth = 0;
            materialsCost = 15;
            partsCost = 5;
        } else if (targetType === 'gate') {
            if (state.gate.working && state.gate.health >= 100) return null;
            taskName = '门禁系统';
            currentHealth = state.gate.health;
            materialsCost = 10;
            partsCost = 3;
        } else {
            return null;
        }

        if (!GameState.hasResource('materials', materialsCost)) {
            UI.showToast(`材料不足！需要${materialsCost}材料`, 'error');
            return null;
        }
        if (partsCost > 0 && !GameState.hasResource('parts', partsCost)) {
            UI.showToast(`零件不足！需要${partsCost}零件`, 'error');
            return null;
        }

        const task = {
            id: 'repair_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            targetType: targetType,
            targetId: targetId,
            name: taskName,
            progress: 0,
            maxProgress: maxHealth - currentHealth,
            assignedWorkers: [...assignedWorkers],
            materialsSpent: materialsCost,
            partsSpent: partsCost,
            createdAt: state.day
        };

        GameState.removeResource('materials', materialsCost);
        GameState.addResourceConsumed('materials', materialsCost);
        if (partsCost > 0) {
            GameState.removeResource('parts', partsCost);
            GameState.addResourceConsumed('parts', partsCost);
        }
        state.repairQueue.push(task);

        let costStr = `${materialsCost}材料`;
        if (partsCost > 0) costStr += `、${partsCost}零件`;
        GameState.addLog(`已创建${taskName}的维修任务，消耗${costStr}。`, 'info');
        UI.showToast(`${taskName}维修任务已创建`, 'success');
        GameState.save();
        return task;
    },

    removeRepairTask(taskId) {
        const state = GameState.getState();
        const idx = state.repairQueue.findIndex(t => t.id === taskId);
        if (idx === -1) return { success: false, reason: '任务不存在，可能已完成或已取消' };
        
        const task = state.repairQueue[idx];
        const progressRatio = task.progress / task.maxProgress;
        const materialsReturned = Math.floor(task.materialsSpent * (1 - progressRatio) * 0.5);
        const partsReturned = Math.floor((task.partsSpent || 0) * (1 - progressRatio) * 0.5);
        
        const materialsUsed = task.materialsSpent - materialsReturned;
        const partsUsed = (task.partsSpent || 0) - partsReturned;
        
        state.repairQueue.splice(idx, 1);
        
        if (materialsReturned > 0) {
            GameState.addResource('materials', materialsReturned);
            GameState.addResourceConsumed('materials', -materialsReturned);
        }
        if (partsReturned > 0) {
            GameState.addResource('parts', partsReturned);
            GameState.addResourceConsumed('parts', -partsReturned);
        }

        let reasonNoReturn = [];
        if (progressRatio >= 0.9) {
            reasonNoReturn.push('任务即将完成（90%以上），大部分物资已消耗');
        } else if (progressRatio >= 0.5) {
            reasonNoReturn.push('任务过半，约一半物资已在施工中消耗，无法回收');
        }
        if (materialsUsed > 0 && materialsReturned === 0) {
            reasonNoReturn.push('材料数量过少，向下取整后无可返还');
        }
        if ((task.partsSpent || 0) > 0 && partsReturned === 0) {
            reasonNoReturn.push('零件数量过少，向下取整后无可返还');
        }
        if (reasonNoReturn.length === 0 && (materialsReturned > 0 || partsReturned > 0)) {
            reasonNoReturn.push('仅可回收未消耗部分的50%物资（其余施工中损耗）');
        }
        
        let logStr = `${task.name}的维修任务已取消。已投入: ${task.materialsSpent}材料${task.partsSpent ? `、${task.partsSpent}零件` : ''}。完成进度: ${Math.floor(progressRatio * 100)}%`;
        if (materialsReturned > 0 || partsReturned > 0) {
            let rs = '';
            if (materialsReturned > 0) rs += `${materialsReturned}材料`;
            if (partsReturned > 0) {
                if (rs) rs += '、';
                rs += `${partsReturned}零件`;
            }
            logStr += `。返还: ${rs}`;
        } else {
            logStr += '。无可返还物资';
        }
        GameState.addLog(logStr + `。`, 'info');
        
        GameState.save();
        return {
            success: true,
            taskName: task.name,
            progress: Math.floor(progressRatio * 100),
            materialsSpent: task.materialsSpent,
            partsSpent: task.partsSpent || 0,
            materialsReturned,
            partsReturned,
            materialsUsed,
            partsUsed,
            reasonNoReturn
        };
    },

    assignWorkerToRepair(taskId, residentId) {
        const state = GameState.getState();
        const task = state.repairQueue.find(t => t.id === taskId);
        const resident = state.residents.find(r => r.id === residentId);
        
        if (!task || !resident) return false;
        if (task.assignedWorkers.includes(residentId)) return false;
        if (resident.onMission || resident.status !== 'healthy') {
            UI.showToast('该居民无法工作', 'warning');
            return false;
        }

        task.assignedWorkers.push(residentId);
        GameState.addLog(`${resident.name} 被分配到${task.name}的维修任务。`, 'info');
        UI.showToast(`${resident.name} 已分配维修任务`, 'success');
        GameState.save();
        return true;
    },

    removeWorkerFromRepair(taskId, residentId) {
        const state = GameState.getState();
        const task = state.repairQueue.find(t => t.id === taskId);
        
        if (!task) return false;
        const idx = task.assignedWorkers.indexOf(residentId);
        if (idx === -1) return false;

        task.assignedWorkers.splice(idx, 1);
        GameState.save();
        return true;
    },

    processRepairQueue() {
        const state = GameState.getState();
        const completedTasks = [];

        for (let i = state.repairQueue.length - 1; i >= 0; i--) {
            const task = state.repairQueue[i];
            let dailyProgress = 0;

            task.assignedWorkers.forEach(resId => {
                const worker = state.residents.find(r => r.id === resId);
                if (worker && worker.status === 'healthy' && !worker.onMission) {
                    let workerProgress = 10 + worker.skills.build * 0.3;
                    if (worker.traits.includes('mechanic')) workerProgress *= 1.5;
                    if (worker.traits.includes('hardworking')) workerProgress *= 1.2;
                    if (worker.job === 'builder') workerProgress *= 1.3;
                    workerProgress *= ResidentSystem.getResidentEffectiveness(worker, 'build');
                    dailyProgress += workerProgress;
                    
                    if (!state.stats.residentContributions[worker.id]) {
                        state.stats.residentContributions[worker.id] = { repairs: 0, production: 0, explorations: 0 };
                    }
                    state.stats.residentContributions[worker.id].repairs += workerProgress;
                }
            });

            task.progress = Math.min(task.maxProgress, task.progress + dailyProgress);

            if (task.progress >= task.maxProgress) {
                this.completeRepair(task);
                completedTasks.push(task);
                state.repairQueue.splice(i, 1);
            }
        }

        if (completedTasks.length > 0) {
            GameState.save();
        }
        return completedTasks;
    },

    completeRepair(task) {
        const state = GameState.getState();

        if (task.targetType === 'room') {
            const room = this.findRoom(task.targetId);
            if (room) {
                room.health = 100;
                const roomData = GameData.rooms.find(r => r.id === room.type);
                GameState.addLog(`${roomData ? roomData.name : '房间'}维修完成！`, 'success');
                UI.showToast(`${roomData ? roomData.name : '房间'}已修好`, 'success');
            }
        } else if (task.targetType === 'power') {
            state.power.working = true;
            GameState.addLog('电力系统维修完成！', 'success');
            UI.showToast('电力系统已修复', 'success');
        } else if (task.targetType === 'gate') {
            state.gate.working = true;
            state.gate.health = 100;
            GameState.addLog('门禁系统维修完成！', 'success');
            UI.showToast('门禁系统已修复', 'success');
        }
    },

    getRepairQueue() {
        const state = GameState.getState();
        return state.repairQueue;
    },

    getAvailableRepairWorkers() {
        const state = GameState.getState();
        const busyWorkers = new Set();
        state.repairQueue.forEach(t => t.assignedWorkers.forEach(w => busyWorkers.add(w)));
        
        return state.residents.filter(r => 
            !busyWorkers.has(r.id) && 
            !r.onMission && 
            r.status === 'healthy' &&
            (r.job === 'builder' || r.job === 'idle')
        );
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
        GameState.save();
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
        GameState.save();
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
        const task = this.addRepairTask('power', 'power', []);
        return task !== null;
    },

    repairGate() {
        const task = this.addRepairTask('gate', 'gate', []);
        return task !== null;
    },

    getEstimatedDays(task) {
        const state = GameState.getState();
        if (task.assignedWorkers.length === 0) return '∞';
        
        let dailyProgress = 0;
        task.assignedWorkers.forEach(resId => {
            const worker = state.residents.find(r => r.id === resId);
            if (worker && worker.status === 'healthy' && !worker.onMission) {
                let workerProgress = 10 + worker.skills.build * 0.3;
                if (worker.traits.includes('mechanic')) workerProgress *= 1.5;
                if (worker.traits.includes('hardworking')) workerProgress *= 1.2;
                if (worker.job === 'builder') workerProgress *= 1.3;
                dailyProgress += workerProgress;
            }
        });
        
        if (dailyProgress <= 0) return '∞';
        const remainingProgress = task.maxProgress - task.progress;
        const days = Math.ceil(remainingProgress / dailyProgress);
        return days;
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
