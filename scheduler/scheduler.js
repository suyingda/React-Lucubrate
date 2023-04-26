~(function(window){
    const enableSchedulerDebugging = false;
    const enableIsInputPending = false;
    const enableProfiling = false;
    const enableIsInputPendingContinuous = false;
    const frameYieldMs = 5;
    const continuousYieldMs = 50;
    const maxYieldMs = 300;

    /** -------------------------------------------
     * import {push, pop, peek} from '../SchedulerMinHeap';
     * ------------------------------------------- */
    function push(heap, node) {
        const index = heap.length;
        heap.push(node);
        siftUp(heap, node, index);
    }

    function peek(heap) {
        return heap.length === 0 ? null : heap[0];
    }

    function pop(heap) {
        if (heap.length === 0) {
            return null;
        }
        const first = heap[0];
        const last = heap.pop();
        if (last !== first) {
            heap[0] = last;
            siftDown(heap, last, 0);
        }
        return first;
    }

    function siftUp(heap, node, i) {
        let index = i;
        while (index > 0) {
            const parentIndex = (index - 1) >>> 1;
            const parent = heap[parentIndex];
            if (compare(parent, node) > 0) {
                // The parent is larger. Swap positions.
                heap[parentIndex] = node;
                heap[index] = parent;
                index = parentIndex;
            } else {
                // The parent is smaller. Exit.
                return;
            }
        }
    }

    function siftDown(heap, node, i) {
        let index = i;
        const length = heap.length;
        const halfLength = length >>> 1;
        while (index < halfLength) {
            const leftIndex = (index + 1) * 2 - 1;
            const left = heap[leftIndex];
            const rightIndex = leftIndex + 1;
            const right = heap[rightIndex];

            // If the left or right node is smaller, swap with the smaller of those.
            if (compare(left, node) < 0) {
                if (rightIndex < length && compare(right, left) < 0) {
                    heap[index] = right;
                    heap[rightIndex] = node;
                    index = rightIndex;
                } else {
                    heap[index] = left;
                    heap[leftIndex] = node;
                    index = leftIndex;
                }
            } else if (rightIndex < length && compare(right, node) < 0) {
                heap[index] = right;
                heap[rightIndex] = node;
                index = rightIndex;
            } else {
                // Neither child is smaller. Exit.
                return;
            }
        }
    }

    function compare(a, b) {
        // Compare sort index first, then task id.
        const diff = a.sortIndex - b.sortIndex;
        return diff !== 0 ? diff : a.id - b.id;
    }

    /** -------------------------------------------
     * end
     * ------------------------------------------- */
    /** -------------------------------------------
     * start
     * ------------------------------------------- */
// TODO: Use symbols?
    const NoPriority = 0;
    const ImmediatePriority = 1;
    const UserBlockingPriority = 2;
    const NormalPriority = 3;
    const LowPriority = 4;
    const IdlePriority = 5;

    /** -------------------------------------------
     * end
     * ------------------------------------------- */
    /** -------------------------------------------
     * start
     * ------------------------------------------- */

    let runIdCounter = 0;
    let mainThreadIdCounter = 0;

// Bytes per element is 4
    const INITIAL_EVENT_LOG_SIZE = 131072;
    const MAX_EVENT_LOG_SIZE = 524288; // Equivalent to 2 megabytes

    let eventLogSize = 0;
    let eventLogBuffer = null;
    let eventLog = null;
    let eventLogIndex = 0;

    const TaskStartEvent = 1;
    const TaskCompleteEvent = 2;
    const TaskErrorEvent = 3;
    const TaskCancelEvent = 4;
    const TaskRunEvent = 5;
    const TaskYieldEvent = 6;
    const SchedulerSuspendEvent = 7;
    const SchedulerResumeEvent = 8;

    function logEvent(entries) {
        if (eventLog !== null) {
            const offset = eventLogIndex;
            eventLogIndex += entries.length;
            if (eventLogIndex + 1 > eventLogSize) {
                eventLogSize *= 2;
                if (eventLogSize > MAX_EVENT_LOG_SIZE) {
                    // Using console['error'] to evade Babel and ESLint
                    console['error'](
                        "Scheduler Profiling: Event log exceeded maximum size. Don't " +
                        'forget to call `stopLoggingProfilingEvents()`.',
                    );
                    stopLoggingProfilingEvents();
                    return;
                }
                const newEventLog = new Int32Array(eventLogSize * 4);
                // $FlowFixMe[incompatible-call] found when upgrading Flow
                newEventLog.set(eventLog);
                eventLogBuffer = newEventLog.buffer;
                eventLog = newEventLog;
            }
            eventLog.set(entries, offset);
        }
    }

    function startLoggingProfilingEvents() {
        eventLogSize = INITIAL_EVENT_LOG_SIZE;
        eventLogBuffer = new ArrayBuffer(eventLogSize * 4);
        eventLog = new Int32Array(eventLogBuffer);
        eventLogIndex = 0;
    }

    function stopLoggingProfilingEvents() {
        const buffer = eventLogBuffer;
        eventLogSize = 0;
        eventLogBuffer = null;
        eventLog = null;
        eventLogIndex = 0;
        return buffer;
    }

    function markTaskStart(task, ms,) {
        if (enableProfiling) {
            if (eventLog !== null) {
                // performance.now returns a float, representing milliseconds. When the
                // event is logged, it's coerced to an int. Convert to microseconds to
                // maintain extra degrees of precision.
                logEvent([TaskStartEvent, ms * 1000, task.id, task.priorityLevel]);
            }
        }
    }

    function markTaskCompleted(task, ms,) {
        if (enableProfiling) {
            if (eventLog !== null) {
                logEvent([TaskCompleteEvent, ms * 1000, task.id]);
            }
        }
    }

    function markTaskCanceled(task, ms) {
        if (enableProfiling) {
            if (eventLog !== null) {
                logEvent([TaskCancelEvent, ms * 1000, task.id]);
            }
        }
    }

    function markTaskErrored(task, ms) {
        if (enableProfiling) {
            if (eventLog !== null) {
                logEvent([TaskErrorEvent, ms * 1000, task.id]);
            }
        }
    }

    function markTaskRun(task, ms,) {
        if (enableProfiling) {
            runIdCounter++;

            if (eventLog !== null) {
                logEvent([TaskRunEvent, ms * 1000, task.id, runIdCounter]);
            }
        }
    }

    function markTaskYield(task, ms) {
        if (enableProfiling) {
            if (eventLog !== null) {
                logEvent([TaskYieldEvent, ms * 1000, task.id, runIdCounter]);
            }
        }
    }

    function markSchedulerSuspended(ms) {
        if (enableProfiling) {
            mainThreadIdCounter++;

            if (eventLog !== null) {
                logEvent([SchedulerSuspendEvent, ms * 1000, mainThreadIdCounter]);
            }
        }
    }

    function markSchedulerUnsuspended(ms) {
        if (enableProfiling) {
            if (eventLog !== null) {
                logEvent([SchedulerResumeEvent, ms * 1000, mainThreadIdCounter]);
            }
        }
    }

    /** -------------------------------------------
     * end
     * ------------------------------------------- */

    let getCurrentTime;
    const hasPerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';

    if (hasPerformanceNow) {
        const localPerformance = performance;
        getCurrentTime = () => localPerformance.now();
    } else {
        const localDate = Date;
        const initialTime = localDate.now();
        getCurrentTime = () => localDate.now() - initialTime;
    }

    var maxSigned31BitInt = 1073741823;

// Times out immediately
    var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
    var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
    var NORMAL_PRIORITY_TIMEOUT = 5000;
    var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
    var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

// Tasks are stored on a min heap
    var taskQueue = [];
    var timerQueue = [];

// Incrementing id counter. Used to maintain insertion order.
    var taskIdCounter = 1;

// Pausing the scheduler is useful for debugging.
    var isSchedulerPaused = false;

    var currentTask = null;
    var currentPriorityLevel = NormalPriority;

// This is set while performing work, to prevent re-entrance.
    var isPerformingWork = false;

    var isHostCallbackScheduled = false;
    var isHostTimeoutScheduled = false;

// Capture local references to native APIs, in case a polyfill overrides them.
    const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
    const localClearTimeout =
        typeof clearTimeout === 'function' ? clearTimeout : null;
    const localSetImmediate =
        typeof setImmediate !== 'undefined' ? setImmediate : null; // IE and Node.js + jsdom

    const isInputPending =
        typeof navigator !== 'undefined' &&
        // $FlowFixMe[prop-missing]
        navigator.scheduling !== undefined &&
        // $FlowFixMe[incompatible-type]
        navigator.scheduling.isInputPending !== undefined
            ? navigator.scheduling.isInputPending.bind(navigator.scheduling)
            : null;

    const continuousOptions = {includeContinuous: enableIsInputPendingContinuous};

    function advanceTimers(currentTime) {
        // Check for tasks that are no longer delayed and add them to the queue.
        let timer = peek(timerQueue);
        while (timer !== null) {
            if (timer.callback === null) {
                // Timer was cancelled.
                pop(timerQueue);
            } else if (timer.startTime <= currentTime) {
                // Timer fired. Transfer to the task queue.
                pop(timerQueue);
                timer.sortIndex = timer.expirationTime;
                push(taskQueue, timer);
                if (enableProfiling) {
                    markTaskStart(timer, currentTime);
                    timer.isQueued = true;
                }
            } else {
                // Remaining timers are pending.
                return;
            }
            timer = peek(timerQueue);
        }
    }

    function handleTimeout(currentTime) {
        isHostTimeoutScheduled = false;
        advanceTimers(currentTime);

        if (!isHostCallbackScheduled) {
            if (peek(taskQueue) !== null) {
                isHostCallbackScheduled = true;
                requestHostCallback(flushWork);
            } else {
                const firstTimer = peek(timerQueue);
                if (firstTimer !== null) {
                    requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
                }
            }
        }
    }

    function flushWork(hasTimeRemaining, initialTime) {
        if (enableProfiling) {
            markSchedulerUnsuspended(initialTime);
        }

        // We'll need a host callback the next time work is scheduled.
        isHostCallbackScheduled = false;
        if (isHostTimeoutScheduled) {
            // We scheduled a timeout but it's no longer needed. Cancel it.
            isHostTimeoutScheduled = false;
            cancelHostTimeout();
        }

        isPerformingWork = true;
        const previousPriorityLevel = currentPriorityLevel;
        try {
            if (enableProfiling) {
                try {
                    return workLoop(hasTimeRemaining, initialTime);
                } catch (error) {
                    if (currentTask !== null) {
                        const currentTime = getCurrentTime();
                        // $FlowFixMe[incompatible-call] found when upgrading Flow
                        markTaskErrored(currentTask, currentTime);
                        // $FlowFixMe[incompatible-use] found when upgrading Flow
                        currentTask.isQueued = false;
                    }
                    throw error;
                }
            } else {
                // No catch in prod code path.
                return workLoop(hasTimeRemaining, initialTime);
            }
        } finally {
            currentTask = null;
            currentPriorityLevel = previousPriorityLevel;
            isPerformingWork = false;
            if (enableProfiling) {
                const currentTime = getCurrentTime();
                markSchedulerSuspended(currentTime);
            }
        }
    }

    function workLoop(hasTimeRemaining, initialTime) {
        let currentTime = initialTime;
        advanceTimers(currentTime);
        currentTask = peek(taskQueue);
        while (
            currentTask !== null &&
            !(enableSchedulerDebugging && isSchedulerPaused)  // 当前恒定为 true
            ) {
            if (
                currentTask.expirationTime > currentTime &&  // 有效时间（运行） 已经超出了（大于当前时间）, 已经是长任务
                (!hasTimeRemaining || shouldYieldToHost())
                // hasTimeRemaining（还有剩余时间？）hasTimeRemaining(恒定为true) shouldYieldToHost（任务执行时间在 5ms 切片内，不用让步 false）
            ) {
                // This currentTask hasn't expired, and we've reached the deadline.
                // 这个currentTask还没有过期，我们已经到了截止日期。
                // 跳出主线程，进入到宏任务 MessageCallback调度，可重新发起
                break;
            }
            // 如果上面判断用户要执行的任务已经超时（说明需要立即执行）
            // next performance

            // $FlowFixMe[incompatible-use] found when upgrading Flow
            const callback = currentTask.callback;
            if (typeof callback === 'function') {
                // $FlowFixMe[incompatible-use] found when upgrading Flow
                currentTask.callback = null;
                // $FlowFixMe[incompatible-use] found when upgrading Flow
                currentPriorityLevel = currentTask.priorityLevel;
                // $FlowFixMe[incompatible-use] found when upgrading Flow
                const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
                if (enableProfiling) {
                    // $FlowFixMe[incompatible-call] found when upgrading Flow
                    markTaskRun(currentTask, currentTime);
                }
                const continuationCallback = callback(didUserCallbackTimeout);
                currentTime = getCurrentTime();
                if (typeof continuationCallback === 'function') {
                    // If a continuation is returned, immediately yield to the main thread
                    // regardless of how much time is left in the current time slice.
                    // $FlowFixMe[incompatible-use] found when upgrading Flow
                    currentTask.callback = continuationCallback;
                    if (enableProfiling) {
                        // $FlowFixMe[incompatible-call] found when upgrading Flow
                        markTaskYield(currentTask, currentTime);
                    }
                    advanceTimers(currentTime);
                    return true;
                } else {
                    if (enableProfiling) {
                        // $FlowFixMe[incompatible-call] found when upgrading Flow
                        markTaskCompleted(currentTask, currentTime);
                        // $FlowFixMe[incompatible-use] found when upgrading Flow
                        currentTask.isQueued = false;
                    }
                    if (currentTask === peek(taskQueue)) {
                        pop(taskQueue);
                    }
                    advanceTimers(currentTime);
                }
            } else {
                pop(taskQueue);
            }
            currentTask = peek(taskQueue);
        }
        // Return whether there's additional work
        if (currentTask !== null) {
            return true;
        } else {
            const firstTimer = peek(timerQueue);
            if (firstTimer !== null) {
                requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
            }
            return false;
        }
    }

    function unstable_runWithPriority(
        priorityLevel,
        eventHandler,
    ) {
        switch (priorityLevel) {
            case ImmediatePriority:
            case UserBlockingPriority:
            case NormalPriority:
            case LowPriority:
            case IdlePriority:
                break;
            default:
                priorityLevel = NormalPriority;
        }

        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = priorityLevel;

        try {
            return eventHandler();
        } finally {
            currentPriorityLevel = previousPriorityLevel;
        }
    }

    function unstable_next(eventHandler) {
        var priorityLevel;
        switch (currentPriorityLevel) {
            case ImmediatePriority:
            case UserBlockingPriority:
            case NormalPriority:
                // Shift down to normal priority
                priorityLevel = NormalPriority;
                break;
            default:
                // Anything lower than normal priority should remain at the current level.
                priorityLevel = currentPriorityLevel;
                break;
        }

        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = priorityLevel;

        try {
            return eventHandler();
        } finally {
            currentPriorityLevel = previousPriorityLevel;
        }
    }

    function unstable_wrapCallback(callback) {
        var parentPriorityLevel = currentPriorityLevel;
        // $FlowFixMe[incompatible-return]
        // $FlowFixMe[missing-this-annot]
        return function () {
            // This is a fork of runWithPriority, inlined for performance.
            var previousPriorityLevel = currentPriorityLevel;
            currentPriorityLevel = parentPriorityLevel;

            try {
                return callback.apply(this, arguments);
            } finally {
                currentPriorityLevel = previousPriorityLevel;
            }
        };
    }

    function unstable_scheduleCallback(
        priorityLevel,
        callback,
        options
    ) {
        debugger;
        var currentTime = getCurrentTime();

        var startTime;
        if (typeof options === 'object' && options !== null) {
            var delay = options.delay;
            if (typeof delay === 'number' && delay > 0) {
                startTime = currentTime + delay;
            } else {
                startTime = currentTime;
            }
        } else {
            startTime = currentTime;
        }

        var timeout;
        switch (priorityLevel) {
            case ImmediatePriority:
                timeout = IMMEDIATE_PRIORITY_TIMEOUT;
                break;
            case UserBlockingPriority:
                timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
                break;
            case IdlePriority:
                timeout = IDLE_PRIORITY_TIMEOUT;
                break;
            case LowPriority:
                timeout = LOW_PRIORITY_TIMEOUT;
                break;
            case NormalPriority:
            default:
                timeout = NORMAL_PRIORITY_TIMEOUT;
                break;
        }

        var expirationTime = startTime + timeout;

        var newTask = {
            id: taskIdCounter++,
            callback,
            priorityLevel,
            startTime,
            expirationTime,
            sortIndex: -1,
        };
        if (enableProfiling) {
            newTask.isQueued = false;
        }

        if (startTime > currentTime) {
            // This is a delayed task.
            newTask.sortIndex = startTime;
            push(timerQueue, newTask);
            if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
                // All tasks are delayed, and this is the task with the earliest delay.
                if (isHostTimeoutScheduled) {
                    // Cancel an existing timeout.
                    cancelHostTimeout();
                } else {
                    isHostTimeoutScheduled = true;
                }
                // Schedule a timeout.
                requestHostTimeout(handleTimeout, startTime - currentTime);
            }
        } else {
            newTask.sortIndex = expirationTime;
            push(taskQueue, newTask);
            if (enableProfiling) {
                markTaskStart(newTask, currentTime);
                newTask.isQueued = true;
            }
            // Schedule a host callback, if needed. If we're already performing work,
            // wait until the next time we yield.
            // isHostCallbackScheduled （启动了当前主程序状态）
            // isPerformingWork （判断当前主程序是否在运行，同时运行完成可以解开锁）
            if (!isHostCallbackScheduled && !isPerformingWork) {
                isHostCallbackScheduled = true;
                requestHostCallback(flushWork);
            }
        }

        return newTask;
    }

    function unstable_pauseExecution() {
        isSchedulerPaused = true;
    }

    function unstable_continueExecution() {
        isSchedulerPaused = false;
        if (!isHostCallbackScheduled && !isPerformingWork) {
            isHostCallbackScheduled = true;
            requestHostCallback(flushWork);
        }
    }

    function unstable_getFirstCallbackNode() {
        return peek(taskQueue);
    }

    function unstable_cancelCallback(task) {
        if (enableProfiling) {
            if (task.isQueued) {
                const currentTime = getCurrentTime();
                markTaskCanceled(task, currentTime);
                task.isQueued = false;
            }
        }

        // Null out the callback to indicate the task has been canceled. (Can't
        // remove from the queue because you can't remove arbitrary nodes from an
        // array based heap, only the first one.)
        task.callback = null;
    }

    function unstable_getCurrentPriorityLevel() {
        return currentPriorityLevel;
    }

    let isMessageLoopRunning = false;
    let scheduledHostCallback = null;
    let taskTimeoutID = -1;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
    let frameInterval = frameYieldMs;
    const continuousInputInterval = continuousYieldMs;
    const maxInterval = maxYieldMs;
    let startTime = -1;

    let needsPaint = false;

    function shouldYieldToHost() {
        const timeElapsed = getCurrentTime() - startTime; // 运行时间
        if (timeElapsed < frameInterval) {
            // The main thread has only been blocked for a really short amount of time;
            // smaller than a single frame. Don't yield yet.
            return false;
        }

        // The main thread has been blocked for a non-negligible amount of time. We
        // may want to yield control of the main thread, so the browser can perform
        // high priority tasks. The main ones are painting and user input. If there's
        // a pending paint or a pending input, then we should yield. But if there's
        // neither, then we can yield less often while remaining responsive. We'll
        // eventually yield regardless, since there could be a pending paint that
        // wasn't accompanied by a call to `requestPaint`, or other main thread tasks
        // like network events.
        if (enableIsInputPending) {
            if (needsPaint) {
                // There's a pending paint (signaled by `requestPaint`). Yield now.
                return true;
            }
            if (timeElapsed < continuousInputInterval) {
                // We haven't blocked the thread for that long. Only yield if there's a
                // pending discrete input (e.g. click). It's OK if there's pending
                // continuous input (e.g. mouseover).
                if (isInputPending !== null) {
                    return isInputPending();
                }
            } else if (timeElapsed < maxInterval) {
                // Yield if there's either a pending discrete or continuous input.
                if (isInputPending !== null) {
                    return isInputPending(continuousOptions);
                }
            } else {
                // We've blocked the thread for a long time. Even if there's no pending
                // input, there may be some other scheduled work that we don't know about,
                // like a network event. Yield now.
                return true;
            }
        }

        // `isInputPending` isn't available. Yield now.
        return true;
    }

    function requestPaint() {
        if (
            enableIsInputPending &&
            navigator !== undefined &&
            // $FlowFixMe[prop-missing]
            navigator.scheduling !== undefined &&
            // $FlowFixMe[incompatible-type]
            navigator.scheduling.isInputPending !== undefined
        ) {
            needsPaint = true;
        }

        // Since we yield every frame regardless, `requestPaint` has no effect.
    }

    function forceFrameRate(fps) {
        if (fps < 0 || fps > 125) {
            // Using console['error'] to evade Babel and ESLint
            console['error'](
                'forceFrameRate takes a positive int between 0 and 125, ' +
                'forcing frame rates higher than 125 fps is not supported',
            );
            return;
        }
        if (fps > 0) {
            frameInterval = Math.floor(1000 / fps);
        } else {
            // reset the framerate
            frameInterval = frameYieldMs;
        }
    }

    const performWorkUntilDeadline = () => {
        if (scheduledHostCallback !== null) {
            const currentTime = getCurrentTime();
            // Keep track of the start time so we can measure how long the main thread
            // has been blocked.
            startTime = currentTime;
            const hasTimeRemaining = true;

            // If a scheduler task throws, exit the current browser task so the
            // error can be observed.
            //
            // Intentionally not using a try-catch, since that makes some debugging
            // techniques harder. Instead, if `scheduledHostCallback` errors, then
            // `hasMoreWork` will remain true, and we'll continue the work loop.
            let hasMoreWork = true;
            try {
                // $FlowFixMe[not-a-function] found when upgrading Flow
                hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
            } finally {
                if (hasMoreWork) {
                    // If there's more work, schedule the next message event at the end
                    // of the preceding one.
                    schedulePerformWorkUntilDeadline();
                } else {
                    isMessageLoopRunning = false;
                    scheduledHostCallback = null;
                }
            }
        } else {
            isMessageLoopRunning = false;
        }
        // Yielding to the browser will give it a chance to paint, so we can
        // reset this.
        needsPaint = false;
    };

    let schedulePerformWorkUntilDeadline;
    if (typeof localSetImmediate === 'function') {
        // Node.js and old IE.
        // There's a few reasons for why we prefer setImmediate.
        //
        // Unlike MessageChannel, it doesn't prevent a Node.js process from exiting.
        // (Even though this is a DOM fork of the Scheduler, you could get here
        // with a mix of Node.js 15+, which has a MessageChannel, and jsdom.)
        // https://github.com/facebook/react/issues/20756
        //
        // But also, it runs earlier which is the semantic we want.
        // If other browsers ever implement it, it's better to use it.
        // Although both of these would be inferior to native scheduling.
        schedulePerformWorkUntilDeadline = () => {
            localSetImmediate(performWorkUntilDeadline);
        };
    } else if (typeof MessageChannel !== 'undefined') {
        // DOM and Worker environments.
        // We prefer MessageChannel because of the 4ms setTimeout clamping.
        const channel = new MessageChannel();
        const port = channel.port2;
        channel.port1.onmessage = performWorkUntilDeadline;
        schedulePerformWorkUntilDeadline = () => {
            port.postMessage(null);
        };
    } else {
        // We should only fallback here in non-browser environments.
        schedulePerformWorkUntilDeadline = () => {
            // $FlowFixMe[not-a-function] nullable value
            localSetTimeout(performWorkUntilDeadline, 0);
        };
    }

    function requestHostCallback(callback) {
        scheduledHostCallback = callback;
        // isMessageLoopRunning 当前宏任务触发回调进行中
        if (!isMessageLoopRunning) {
            isMessageLoopRunning = true;
            schedulePerformWorkUntilDeadline();
        }
    }

    function requestHostTimeout(callback, ms,) {
        // $FlowFixMe[not-a-function] nullable value
        taskTimeoutID = localSetTimeout(() => {
            callback(getCurrentTime());
        }, ms);
    }

    function cancelHostTimeout() {
        // $FlowFixMe[not-a-function] nullable value
        localClearTimeout(taskTimeoutID);
        taskTimeoutID = -1;
    }

    window.scheduler = {
        ImmediatePriority,
        UserBlockingPriority,
        NormalPriority,
        IdlePriority,
        LowPriority,
        unstable_runWithPriority,
        unstable_next,
        unstable_scheduleCallback,
        unstable_cancelCallback,
        unstable_wrapCallback,
        unstable_getCurrentPriorityLevel,
        shouldYieldToHost,
        requestPaint,
        unstable_continueExecution,
        unstable_pauseExecution,
        unstable_getFirstCallbackNode,
        getCurrentTime,
        forceFrameRate,
    };

    window.unstable_Profiling = enableProfiling
        ? {
            startLoggingProfilingEvents,
            stopLoggingProfilingEvents,
        }
        : null;

})(window)
