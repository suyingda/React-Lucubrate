// const NoPriority = 0;
// const ImmediatePriority = 1;
// const UserBlockingPriority = 2;
// const NormalPriority = 3;
// const LowPriority = 4;
// const IdlePriority = 5;
const priority2Name = [
    // "noop",
    "ImmediatePriority",
    "UserBlockingPriority",
    "NormalPriority",
    "LowPriority",
    // "IdlePriority"
];

// 划分 5ms 一个时间切片
const yieldInterval = 5;
let deadline = 0;

const channel = new MessageChannel();
let port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

// 定时回调主机
let scheduledHostCallback = null;

const getCurrentTIme = () => new Date().getTime();

// 在截止日期前完成工作
function performWorkUntilDeadline() {
    if (scheduledHostCallback) {
        // 当前宏任务事件开始执行
        let currentTime = getCurrentTIme;
        // 计算当前宏任务事件结束时间
        deadline = currentTime + yieldInterval;
        const hasMoreWork = scheduledHostCallback(currentTime);
        if (!hasMoreWork) {
            scheduledHostCallback = null;
        } else {
            // 如果还有工作，则触发下一个宏任务事件
            port.postMessage(null);
        }
    }
}

// 请求主机回调 首次执行
function requestHostCallback(callback) {
    scheduledHostCallback = callback;
    port.postMessage(null);
}


let taskQueue = [];
let isHostCallbackScheduled = false;

function scheduleCallback(callback) {
    var newTask = {
        callback: callback,
    };
    taskQueue.push(newTask);
    if (!isHostCallbackScheduled) {
        isHostCallbackScheduled = true;
        requestHostCallback(flushWork);
    }
    return newTask;
}


let currentTask = null;

function flushWork(initialTime) {
    return workLoop(initialTime);
}


// 从任务队列中（小顶堆）拿出
function workLoop(initialTime) {
    currentTask = taskQueue[0];

    while (currentTask) {
        if (new Date().getTime() >= deadline) {
            console.log('我要退出来啊')
            // 每执行一个任务，都需要判断当前的performWorkUntilDeadline执行时间是否超过了截止时间
            break;
        }
        var callback = currentTask.callback;
        callback();

        taskQueue.shift();
        currentTask = taskQueue[0];
    }
    if (currentTask) {
        // 如果taskQueue中还有剩余工作，则返回true
        return true;
    } else {
        return false;
    }
}
