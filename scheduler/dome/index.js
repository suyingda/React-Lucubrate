// {
//     ImmediatePriority as unstable_ImmediatePriority,
//     UserBlockingPriority as unstable_UserBlockingPriority,
//     NormalPriority as unstable_NormalPriority,
//     IdlePriority as unstable_IdlePriority,
//     LowPriority as unstable_LowPriority,
//     unstable_runWithPriority,
//     unstable_next,
//     unstable_scheduleCallback,
//     unstable_cancelCallback,
//     unstable_wrapCallback,
//     unstable_getCurrentPriorityLevel,
//     shouldYieldToHost as unstable_shouldYield,
//     requestPaint as unstable_requestPaint,
//     unstable_continueExecution,
//     unstable_pauseExecution,
//     unstable_getFirstCallbackNode,
//     getCurrentTime as unstable_now,
//     forceFrameRate as unstable_forceFrameRate,
// };


const IdlePriority = window.scheduler.IdlePriority
const ImmediatePriority = window.scheduler.ImmediatePriority
const LowPriority = window.scheduler.LowPriority
const NormalPriority = window.scheduler.NormalPriority
const UserBlockingPriority = window.scheduler.UserBlockingPriority
const getFirstCallbackNode = window.scheduler.unstable_getFirstCallbackNode
const scheduleCallback = window.scheduler.unstable_scheduleCallback
const shouldYield = window.scheduler.shouldYieldToHost
const cancelCallback = window.scheduler.unstable_cancelCallback


const CallbackNode = window.scheduler.CallbackNode

const priority2UseList = [
    ImmediatePriority,
    UserBlockingPriority,
    NormalPriority,
    LowPriority
];

const priority2Name = [
    "noop",
    "ImmediatePriority",
    "UserBlockingPriority",
    "NormalPriority",
    "LowPriority",
    "IdlePriority"
];

const root = document.querySelector("#root");
const contentBox = document.querySelector("#content");

const workList = [];
let prevPriority = IdlePriority;
let curCallback;

// 初始化优先级对应按钮
priority2UseList.forEach((priority) => {
    console.log(priority2UseList,priority)
    const btn = document.createElement("button");
    root.appendChild(btn);
    btn.innerText = priority2Name[priority];

    btn.onclick = () => {
        // 插入工作
        workList.push({
            priority,
            count: 100
        });
        schedule();
    };
});

/**
 * 调度的逻辑
 */
function schedule() {
    // 当前可能存在正在调度的回调
    const cbNode = getFirstCallbackNode();
    // 取出最高优先级的工作
    const curWork = workList.sort((w1, w2) => {
        return w1.priority - w2.priority;
    })[0];

    if (!curWork) {
        // 没有工作需要执行，退出调度
        curCallback = null;
        cbNode && cancelCallback(cbNode);
        return;
    }

    const {priority: curPriority} = curWork;

    if (curPriority === prevPriority) {
        // 有工作在进行，比较该工作与正在进行的工作的优先级
        // 如果优先级相同，则不需要调度新的，退出调度
        return;
    }

    // 准备调度当前最高优先级的工作
    // 调度之前，如果有工作在进行，则中断他
    cbNode && cancelCallback(cbNode);

    // 调度当前最高优先级的工作
    curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

// 执行具体的工作
function perform(work, didTimeout) {
    // 是否需要同步执行，满足1.工作是同步优先级 2.当前调度的任务过期了，需要同步执行
    console.log(shouldYield())
    const needSync = work.priority === ImmediatePriority || didTimeout;
    while ((needSync || !shouldYield()) && work.count) {
        work.count--;
        // 执行具体的工作
        insertItem(work.priority + "");
    }
    prevPriority = work.priority;

    if (!work.count) {
        // 完成的work，从workList中删除
        const workIndex = workList.indexOf(work);
        workList.splice(workIndex, 1);
        // 重置优先级
        prevPriority = IdlePriority;
    }

    const prevCallback = curCallback;
    // 调度完后，如果callback变化，代表这是新的work
    schedule();
    const newCallback = curCallback;

    if (newCallback && prevCallback === newCallback) {
        // callback没变，代表是同一个work，只不过时间切片时间用尽（5ms）
        // 返回的函数会被Scheduler继续调用
        return perform.bind(null, work);
    }
}

const insertItem = (content) => {
    const ele = document.createElement("span");
    ele.innerText = `${content}`;
    ele.className = `pri-${content}`;
    doSomeBuzyWork(10000000);
    contentBox.appendChild(ele);
};

const doSomeBuzyWork = (len) => {
    let result = 0;
    while (len--) {
        result += len;
    }
};
