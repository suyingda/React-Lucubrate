function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child => {
                    return typeof child === "object" ? child : createTextElement(child)
                }
            ),
        },
    }
}

function createTextElement(text) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue: text,
            children: [],
        },
    }
}

// fiber 结构转化成 DOM
function createDom(fiber) {
    const dom = fiber.type == "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type)
    updateDom(dom, {}, fiber.props)
    return dom
}

// 判断事件变量
const isEvent = key => key.startsWith("on")
// 判断当前元素节点的属性
const isProperty = key => key !== "children" && !isEvent(key)
// 判断是否是新节点
const isNew = (prev, next) => key => prev[key] !== next[key]
// 判断消失节点
const isGone = (prev, next) => key => !(key in next)

// 更新 DOM 节点
function updateDom(dom, prevProps, nextProps) {
    //Remove old or changed event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            dom.removeEventListener(
                eventType,
                prevProps[name]
            )
        })

    // Remove old properties
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ""
        })

    // Set new or changed properties
    Object.keys(nextProps || {})
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name]
        })

    // Add event listeners
    Object.keys(nextProps || {})
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2)
            const eventHandler = nextProps[name];
            dom.addEventListener(eventType, eventHandler)
        })
}

function commitRoot() {
    // 提前移除了，🤔️？为什么已经有 effectTag: delete , 下方 commitWork 执行也会删除
    deletions.forEach(commitWork)
    // 当前 wipRoot 结构是已经过 reconcile (携带 effectTag， hook状态值{state,queue})
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
}

function commitWork(fiber) {
    if (!fiber) {
        return
    }
    // 拿出父节点， 方便操作dom.appendChild
    let domParentFiber = fiber.parent
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent
    }
    const domParent = domParentFiber.dom

    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        updateDom(
            fiber.dom,
            fiber.alternate.props,
            fiber.props
        )
    } else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent)
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
    // 直接删除 DOM 节点
    if (fiber.dom) {
        domParent.removeChild(fiber.dom)
    } else {
        // 当前节点DOM 不存在？ 🤔️？ 这个情况如何复现
        debugger;
        commitDeletion(fiber.child, domParent)
    }
}

// 在制品
let wipRoot = null
// 下一个fiber节点
let nextUnitOfWork = null
// 当前根节点
let currentRoot = null
// 记录删除节点
let deletions = null

function render(element, container) {
    // 制作根节点 fiber
    wipRoot = {
        // 当前节点
        dom: container,
        props: {
            children: [element],
        },
        // alternate （备用）
        alternate: currentRoot,
    }
    // 删除标记
    deletions = []
    // 第一次给到根节点作为下一单元执行体
    nextUnitOfWork = wipRoot
}

// 在这里可以被打断/恢复执行
function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
        // 返回一个 fiber.child / fiber.sibling fiber数据结构
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() < 1
        console.log('pending')
    }
    // console.log('浏览器空闲时间是否足够？', !shouldYield)
    if (!nextUnitOfWork && wipRoot) {
        console.log('飞升-已无法阻止')
        commitRoot()
    }

    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

// 下一个执行单元
// 当前函数 DFS recursion 遍历 fiber 树结构
function performUnitOfWork(fiber) {
    // fiber数据结构 type 属性会是一个函数（函数组件）
    const isFunctionComponent = fiber.type instanceof Function;
    if (isFunctionComponent) {
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }
    // 当前 fiber 存在 child 直接返回子元素进行深层递归构建 fiber 数据结构
    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            // 同上， 当前节点兄弟节点存在直接返回
            return nextFiber.sibling
        }
        // 同上， 子节点查询到底， 反弹回去往上找 sibling(叔叔)节点
        nextFiber = nextFiber.parent
    }
}

// 在制品
let wipFiber = null
let hookIndex = null

// 函数组件更新
function updateFunctionComponent(fiber) {
    // 借助 wipFiber 隔空控制当前 fiber 对象
    // 添加 hooks
    // 拿到 alternate.hooks （旧） 进行比较
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = []
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children)
}

function useState(initial) {
    const oldHook =
        wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex]
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    }

    const actions = oldHook ? oldHook.queue : []
    actions.forEach(action => {
        hook.state = action(hook.state)
    })

    const setState = action => {
        hook.queue.push(action)
        // 之前的 render 首次执行赋予的根节点（顶点）
        // setState 执行直接将节点任务打断，并且从新将根节点赋值给 nextUnitOfWork （下一执行单元），重新执行
        // 首先，每个更新任务都会被赋予一个优先级。当更新任务抵达调度器时，高优先级的更新任务 A 会更快地被调度进 Reconciler 层。此时若有新的更新任务 B 抵达调度器，调度器会检查它的优先级，若发现 B 的优先级高于当前任务 A，那么当前处于 Reconciler 层的 A 任务就会被中断，调度器会将 B 任务推入 Reconciler 层。当 B 任务完成渲染后，新一轮的调度开始，之前被中断的 A 任务将会被重新推入 Reconciler 层，继续它的渲染之旅，这便是所谓“可恢复”。
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        }
        nextUnitOfWork = wipRoot
        deletions = []
    }

    wipFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
}

function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    // 此时对象中存在这样的结构
    // {type:'h1',props:{children:[]},[[{},{}]]...}
    // flat
    reconcileChildren(fiber, fiber.props.children.flat())
}

// 当前 elements 是
// {
//     type: 'div' ,
//     props: { children:[] }
// }
function reconcileChildren(wipFiber, elements) {
    let index = 0
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child
    let prevSibling = null
    // 子集合元素
    if (!elements) return;
    while (index < elements.length || oldFiber != null) {
        const element = elements[index];
        // console.log('这里开始报错了，因为类型不是 {}', element, elements, index)
        let newFiber = null
        //  当前通过直接对比 fiber type
        const sameType = oldFiber && element && element.type == oldFiber.type

        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
            }
        }
        if (element && !sameType) {
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT",
            }
        }
        // 对于需要删除节点的情况，我们没有新的纤维，所以我们将effect标签添加到旧纤维中。
        // 但是，当我们将纤维树提交到DOM时，我们从正在进行的工作根执行，该根没有旧的纤维。
        // 此处需要去回溯下 ， 在哪里执行把 fiber 树给删除了？   babel编译没了
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION"
            deletions.push(oldFiber)
        }
        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }
        if (index === 0) {
            wipFiber.child = newFiber
        } else if (element) {
            prevSibling.sibling = newFiber
        }
        prevSibling = newFiber
        index++
    }
}

const Didact = {
    createElement,
    render,
    useState,
}

/** @jsx Didact.createElement */
function Counter() {
    const [state, setState] = Didact.useState(1)
    const [show, setShow] = Didact.useState(false)
    const arr = new Array(1000).fill('填充内容');
    return (<div>
            <h1 onClick={() => setState(c => c + 1)}>
                Count: {state}
            </h1>
            <div className="move">LHX-FLY</div>
            <button onClick={() => setShow(c => !c)}>显示</button>
            {
                show && <div style='height:300px;overflow:auto;position:relative;'>
                    {
                        arr.map((item, i) => <div
                            className="xx"
                        >{i}</div>)
                    }
                </div>
            }

            {/*  <button onClick={() => {
                const start = performance.now()
                // 5秒内不停执行 i++ 操作，实现长任务效果
                while (performance.now() - start <= 500) {
                }
            }}>
                阻塞一下
            </button>*/}
            {/*{
                show ? 6666 : null
            }*/}
        </div>

    )
}

// function App(props) {
//     return <h1>Hi {props.name} <strong> {props.value}<strong></h1>
// }
// const element = <App name="foo" />
// function App(props) {
//     const [state, setState] = Didact.useState(1);
//     return Didact.createElement(
//         "h1",
//         {
//             'onClick': () => setState(c => c + 1),
//         }, `Count:${state}\n`,
//         'Hi',
//         props.name,
//         Didact.createElement('i', {id: 'aaaaa'}, '我是谁'),
//         props.value
//     )
// }
//
// const element = Didact.createElement(App, {
//     name: "foo",
//     value: "value",
// })

const element = <Counter/>
const container = document.getElementById("root")
Didact.render(element, container)
