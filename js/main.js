document.addEventListener('DOMContentLoaded', function() {
    if (!Game.load()) {
        Game.init('normal');
    }
    
    console.log('末日避难楼 - 游戏已启动');
});
