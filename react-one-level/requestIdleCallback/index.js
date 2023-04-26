var handle = requestIdleCallback((deadline) => {
    console.log(`当前帧剩余时间: ${deadline.timeRemaining()}`);
    if (deadline.timeRemaining() > 1 || deadline.didTimeout) {
        console.log('走到这里，说明时间有余，我们就可以在这里写自己的代码逻辑')
    }
    // 走到这里，说明时间不够了，就让出控制权给主线程，下次空闲时继续调用
    requestIdleCallback(work);
})

console.log(handle)

function work() {
    console.log('我是主流程权重，都得走开')
}
