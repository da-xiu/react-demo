/*
 * @Description: 
 * @Author: GuoX
 * @Date: 2020-12-03 10:36:31
 * @LastEditTime: 2020-12-03 17:24:16
 * @LastEditors: GuoX
 */

 import { ELEMENT_TEXT } from '../const'

 // 创建虚拟dom
 function createElement(type, props, ...children) {
     delete props.__source; // 删除用不到的属性，避免干扰学习源代码
     delete props.__self;

     return {
         type,
         props: {
             ...props,
             children: children.map(child => 
                typeof child === 'object' ? child : createTextElement(child)
                ),
         }
     }
 }

// 如果是文本节点
 function createTextElement(text) {
     return {
         type: 'ELEMENT_TEXT',
         props: {
             nodeValue: text,
             children: [],
         }
     }
 }

 // 绘制dom tree 这是老方式的渲染，使用递归渲染期间不可中断，如果dom tree
 // 过于庞大，就会占用主线程，有高优先级的任务（比如动画，输入事件），也会排队等候，直到绘制完成
 // 这时候就会造成页面卡顿
 /*function render(element, container) {
     const dom = element.type === 'ELEMENT_TEXT' ?
     document.createTextNode('') :
     document.createElement(element.type)

     const isProperty = key => key != 'children';
     Object.keys(element.props)
         .filter(isProperty)
         .forEach(name => {
             dom[name] = element.props[name]
     })
    // const dom = document.createElement(element.type);
    element.props.children.forEach(child => render(child, dom))
    container.appendChild(dom);
 }
*/

// 创建fiber
function createDom(fiber) {
    const dom = fiber.type === 'ELEMENT_TEXT' ?
     document.createTextNode('') :
     document.createElement(fiber.type)

     const isProperty = key => key !== 'children';
     Object.keys(fiber.props)
         .filter(isProperty)
         .forEach(name => {
             dom[name] = fiber.props[name]
     })
     return dom;
}

 function render(element, container) {
   wipRoot = {
       dom: container,
       props: {
           children: [element],
       },
       alternate: currentRoot, // 存储上一个fiber的数据
   }
   deletions = [];
   nextUnitOfWork = wipRoot;
 }


let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = null;
/*
So we need to save a reference to that “last fiber tree we committed to the DOM” after we finish the commit. We call it currentRoot.
*/


// 把任务拆分成每个小任务，利用浏览器空闲时间执行任务
function workLoop(deadline) {
    let shouldYield = false; // 是否还有空闲时间
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
        shouldYield = deadline.timeRemaining();
    }

    if (!nextUnitOfWork && wipRoot) {
        /*
        And once we finish all the work (we know it because there isn’t a next unit of work) we commit the whole fiber tree to the DOM.*/
        commitRoot()
    }

    requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)




// 调度
function performUnitOfWork(fiber) {

    const isFunctionComponent = fiber.type instanceof Function;

    if (isFunctionComponent) {
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }

    if (fiber.child) { // 
        return fiber.child
    }

    let nextFiber = fiber;

    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        }

        nextFiber = nextFiber.parent;
    }

}

function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    reconcileChiledren(fiber, fiber.props.children)
}

// 为了能把任务拆分，需要一种数据结构，react Fiber tree
// fiber是一种双向链表，每个节点存储child，parent， sibling
// 目的是为了找到next work

// 协调， diff阶段

function reconcileChiledren(wipFiber, elements) {
    let index = 0;
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
    let prevSibling = null;

    while (index < elements.length || oldFiber !== null) {
        const element = elements[index];
        let newFiber = null;

        const sameType = oldFiber &&
        element && 
        element.type === oldFiber.type;

        if (sameType) {
            // update node

            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: 'UPDATE'
            }

        }

        if (element && !sameType) {
            // add node
            
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: 'PLACEMENT'
            }
        }

        if (oldFiber && !sameType) {
            // delete node
            oldFiber.effectTag = 'DELETION';
            deletions.push(oldFiber)
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }

        if (index === 0) {
            wipFiber.child = newFiber;
        }
         else if (element) {
            prevSibling.sibling = newFiber
         }

         prevSibling = newFiber;
         index ++

    }
}






// 提交阶段

function commitRoot() {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
    wipRoot = null;

}


function commitWork(fiber) {
    if (!fiber) {
        return
    }

    let domParentFiber = fiber.parent;
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent
    }

    const domParent = fiber.parent.dom;
    // domParent.appendChild(fiber.dom);

    if (fiber.effectTag === 'PLACENEBT' && fiber.dom !== null) {
        domParent.appendChild(fiber.dom); // 新增节点
    } else if (fiber.effectTag === 'DELETION') {
        commitDeletion(fiber.dom) // 删除节点
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
       // 更新节点
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
    }

    commitWork(fiber.child)
    commitWork(fiber.sbling)
}

// 当我们移除dom时候，我们需要把删除节点的上下节点连接起来
function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom)
    } else {
        commitDeletion(fiber.child, domParent)
    }
}

const isEvent = key => key.statWith('on');
const isProperty = key => key !== 'children' && !isEvent(key); 

const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next)


// 更新节点
function updateDom(dom, prevProps, nextProps) {

    // Remove old or changed event listener

    Object.keys(prevProps)
    .filter(isEvent)
    .filter(
        key => 
            !(key in nextProps) ||
            isNew(prevProps, nextProps)
    )
    .forEach(name => {
        const eventType = name
        .toLowerCase()
        .substring(2)
        dom.removeEventLisenter(
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
    Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
        dom[name] = nextProps[name]
    })

    // Add event listenner

    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name
                .toLowCase()
                .substring(2)
            dom.addEventListener(eventType, nextProps[name])
        })

}


// 初始化
let wipFiber = null
let hookIndex = null

// 函数式组件

function updateFunctionComponent(fiber) {
    wipFiber = fiber;
    hookIndex = 0;
    wipFiber.hooks = [];
    const children = [fiber.type(fiber.props)]
    reconcileChiledren(fiber, children)
}

function useState(initial) {
    const oldHook = 
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];

    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    }

    /**
     * 下次渲染组件时候，我们会从旧 的hook中获取所有的setState，然后逐个的应用他们在新的更新当中
     * **/

    const actions = oldHook ? oldHook.queue : [];
    actions.forEach(action => {
        hook.state = action(hook.state)
    })
/**
 * And then we do something similar to what we did in the render function, set a new work in progress root as the next unit of work so the work loop can start a new render phase.
 * 我们执行与渲染功能类似的操作，将新的进行中的工作根设置为下一个工作单元，以便工作循环可以开始新的渲染阶段。
 * 
 * */
    const state = action => {
        hook.queue.push(action);
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        }

        nextUnitOfWork = wipRoot;
        deletions = []
    }

    wipFiber.hooks.push(hook);
    hookIndex ++
    return [hook, state]
}


 const Greact = {
    createElement,
    render,
    useState
 }

 export default Greact;