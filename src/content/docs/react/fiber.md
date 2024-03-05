---
title: React Fiber
description: React Fiber is a complete rewrite of the React core algorithm, with a focus on performance and concurrency.
---

> https://github.com/acdlite/react-fiber-architecture \
> In a UI, it’s not necessary for every update to apply immediately; in fact, doing so can be wasteful, causing frames to drop and degrading the user experience.\
> Also, different types of updates have different priorities—an animation update must complete faster than an update from a data store.

React Fiber is a complete rewrite of the React core algorithm, with a focus on performance and concurrency.

Because Fiber is asynchronous, React can:

+ Pause, resume, and restart rendering work on components as new updates come in
+ Reuse previously completed work and even abort it if not needed
+ Split work into chunks and prioritize tasks based on importance

> https://blog.logrocket.com/deep-dive-react-fiber/#what-react-fiber

## What is frame rate?

Frame rate is the frequency at which an imaging device produces unique consecutive images called frames. The term applies equally to film and video cameras, computer graphics, and motion capture systems. Frame rate is most often expressed in frames per second (FPS) and is also expressed in progressive scan monitors as hertz (Hz).

Typically, for a video to feel smooth and instantaneous to the human eye, the video must play at a rate of about 30 frames per second (FPS); anything higher gives a better experience.

Most devices these days refresh their screens at 60 FPS, 1/60 = 16.67ms, which means a new frame displays every 16ms. This number is important because if the React renderer takes more than 16ms to render something on the screen, the browser drops that frame.

In reality, however, the browser has housekeeping to do, so all your work must complete inside 10ms. When you fail to meet this budget, the frame rate drops, and the content judders on screen. This is often referred to as jank, and it negatively impacts the user’s experience.

Of course, this is not a big concern for static and textual content. But in the case of displaying animations, this number is critical.

If the React reconciliation algorithm traverses the entire `App` tree each time there is an update, rerenders it, and the traversal takes more than 16ms, it will drop frames.

This is a big reason why many wanted updates categorized by priority and not blindly applying every update passed down to the reconciler. Also, many wanted the ability to pause and resume work in the next frame. This way, React could have better control over working with the 16ms rendering budget.

This led the React team to rewrite the reconciliation algorithm, which is called Fiber. So, let’s look at how Fiber works to solve this problem.

## How does React Fiber work?

+ singly-linked list 
+ parent first
+ depth first traversal

### Singly-linked list

A fiber node represents a stack frame and an instance of a React component. A fiber node comprises the following members:

+ Type

+ Key

+ Child

+ Sibling

+ Return

+ Alternate

+ Output

#### Type

`<div>` and `<span>`, for example, host components (strings), classes, or functions for composite components.

#### Key

The key is the same as the key we pass to the React element.

#### Child

Represents the element returned when we call `render()` on the component:

```
const Name = (props) => {
  return(
    <div className="name">
      {props.name}
    </div>
  )
}
```

The child of `<Name>` is `<div>` because it returns a `<div>` element.

#### Sibling

Represents a case where `render` returns a list of elements:

```
const Name = (props) => {
  return([<Customdiv1 />, <Customdiv2 />])
}
```

In the above case, `<Customdiv1>` and `<Customdiv2>` are the children of `<Name>`, which is the parent. The two children form a singly-linked list.

#### Return

Return is the return back to the stack frame, which is a logical return back to the parent fiber node, and thus, represents the parent.

##### `pendingProps` and `memoizedProps`

Memoization means storing the values of a function execution’s result so you can use it later, thereby avoiding recomputation. `pendingProps` represents the props passed to the component, and `memoizedProps` initializes at the end of the execution stack, storing the props of this node.

When the incoming `pendingProps` are equal to `memoizedProps`, it signals that the fiber’s previous output can be reused, preventing unnecessary work.

##### `pendingWorkPriority`

`pendingWorkPriority` is a number indicating the priority of the work represented by the fiber. The [`ReactPriorityLevel`](https://github.com/facebook/react/blob/master/src/renderers/shared/fiber/ReactPriorityLevel.js)[ module](https://github.com/facebook/react/blob/master/src/renderers/shared/fiber/ReactPriorityLevel.js) lists the different priority levels and what they represent. With the exception of `NoWork`, which is zero, a larger number indicates a lower priority.

For example, you could use the following function to check if a fiber’s priority is at least as high as the given level. The scheduler uses the priority field to search for the next unit of work to perform:

```
function matchesPriority(fiber, priority) {
  return fiber.pendingWorkPriority !== 0 &&
         fiber.pendingWorkPriority <= priority
}
```

#### Alternate

At any time, a component instance has at most two fibers that correspond to it: the current fiber and the in-progress fiber. The alternate of the current fiber is the fiber in progress, and the alternate of the fiber in progress is the current fiber.

The current fiber represents what is rendered already, and the in-progress fiber is conceptually the stack frame that has not returned.

#### Output

The output is the leaf nodes of a React application. They are specific to the rendering environment (for example, in a browser app, they are `div` and `span`). In JSX, they are denoted using lowercase tag names.

Conceptually, the output of a fiber is the return value of a function. Every fiber eventually has an output, but the output is created only at the leaf nodes by host components. The output is then transferred up the tree.

The output is eventually given to the renderer so that it can flush the changes to the rendering environment. For example, let’s look at how the fiber tree looks for an app with the following code:

```
const Parent1 = (props) => {
  return([<Child11 />, <Child12 />])
}

const Parent2 = (props) => {
  return(<Child21 />)
}

class App extends Component {
  constructor(props) {
    super(props)
  }
  render() {
    <div>
      <Parent1 />
      <Parent2 />
    </div>
  }
}

ReactDOM.render(<App />, document.getElementById('root'))
```

We can see that the fiber tree is composed of singly-linked lists of child nodes linked to each other (sibling relationship) and a linked list of parent-to-child relationships. This tree can be traversed using a [depth-first search](https://en.wikipedia.org/wiki/Depth-first_search).

![Fiber Tree Diagram](https://blog.logrocket.com/wp-content/uploads/2019/11/fiber-tree-diagram.png)

### Render phase

To understand how React builds this tree and performs the reconciliation algorithm on it, let’s look at a unit test in the React source code with an attached debugger to follow the process; you can clone the React source code and navigate to [this directory](https://github.com/facebook/react/tree/769b1f270e1251d9dbdce0fcbd9e92e502d059b8/packages/react-dom/src/__tests__).

To begin, add a Jest test and attach a debugger. This is a simple test for rendering a button with text. When you click the button, the app destroys the button and renders a `<div>` with different text, so the text is a state variable here:

```
'use strict';

let React;
let ReactDOM;

describe('ReactUnderstanding', () => {
  beforeEach(() => {
    React = require('react');
    ReactDOM = require('react-dom');
  });

  it('works', () => {
    let instance;

    class App extends React.Component {
      constructor(props) {
        super(props)
        this.state = {
          text: "hello"
        }
      }

      handleClick = () => {
        this.props.logger('before-setState', this.state.text);
        this.setState({ text: "hi" })
        this.props.logger('after-setState', this.state.text);
      }

      render() {
        instance = this;
        this.props.logger('render', this.state.text);
        if(this.state.text === "hello") {
        return (
          <div>
            <div>
              <button onClick={this.handleClick.bind(this)}>
                {this.state.text}
              </button>
            </div>
          </div>
        )} else {
          return (
            <div>
              hello
            </div>
          )
        }
      }
    }
    const container = document.createElement('div');
    const logger = jest.fn();
    ReactDOM.render(<App logger={logger}/>, container);
    console.log("clicking");
    instance.handleClick();
    console.log("clicked");

    expect(container.innerHTML).toBe(
      '<div>hello</div>'
    )

    expect(logger.mock.calls).toEqual(
      [["render", "hello"],
      ["before-setState", "hello"],
      ["render", "hi"],
      ["after-setState", "hi"]]
    );
  })

});
```

In the initial render, React creates a current tree that renders initially.

`createFiberFromTypesAndProps()` is the function that creates each React fiber using the data from the specific React element. When we run the test, put a breakpoint at this function, and look at the call stack:

![createFiberFromTypeAndProps() Call Stack](https://blog.logrocket.com/wp-content/uploads/2019/11/function-call-stack-1.png)

As we can see, the call stack tracks back to a `render()` call, which eventually goes down to `createFiberFromTypeAndProps()`. There are a few other functions that are of interest here: `workLoopSync()`, `performUnitOfWork()`, and `beginWork()`.

#### `workLoopSync()`

`workLoopSync()` is when React starts building up the tree, starting with the `<App>` node and recursively moving on to `<div>`, `<div>`, and `<button>`, which are the children of `<App>`. The `workInProgress` holds a reference to the next fiber node that has work to do.

#### `performUnitOfWork()`

`performUnitOfWork()` takes a fiber node as an input argument, gets the alternate of the node, and calls `beginWork()`. This is the equivalent of starting the execution of the function execution contexts in the execution stack.

#### `beginWork()`

When React builds the tree, `beginWork()` simply leads up to `createFiberFromTypeAndProps()` and creates the fiber nodes. React recursively performs work and eventually `performUnitOfWork()` returns a null, indicating that it has reached the end of the tree.

#### Using `instance.handleClick()`

Now, what happens when we perform `instance.handleClick()`, which clicks the button and triggers a state update? In this case, React traverses the fiber tree, clones each node, and checks whether it needs to perform any work on each node.

When we look at the call stack of this scenario, it looks something like this:

![instance.handleClick() Call Stack](https://blog.logrocket.com/wp-content/uploads/2019/11/function-call-stack-2.png)

Although we did not see `completeUnitOfWork()` and `completeWork()` in the first call stack, we can see them here. Just like `performUnitOfWork()` and `beginWork()`, these two functions perform the completion part of the current execution, which means returning back to the stack.

As we can see, together these four functions execute the unit of work and give control over the work being done currently, which is exactly what was missing in the stack reconciler.

The image below shows that each fiber node is composed of four phases required to complete that unit of work.

![Fiber Node Diagram](https://blog.logrocket.com/wp-content/uploads/2019/11/fiber-node-diagram.png)

It’s important to note here that each node doesn’t move to `completeUnitOfWork()` until its children and siblings return `completeWork()`.

For instance, it starts with `performUnitOfWork()` and `beginWork()` for `<App/>`, then moves on to `performUnitOfWork()` and `beginWork()` for `Parent1`, and so on. It comes back and completes the work on `<App>` once all the children of `<App/>` complete work.

This is when React completes its render phase. The tree that’s newly built based on the `click()` update is called the `workInProgress` tree. This is basically the draft tree waiting to be rendered.

### Commit phase

Once the render phase completes, React moves on to the commit phase, where it basically swaps the root pointers of the current tree and `workInProgress` tree, thereby effectively swapping the current tree with the draft tree it built up based on the `click()` update.

![Commit Phase Diagram](https://blog.logrocket.com/wp-content/uploads/2019/11/commit-phase-diagram.png)

Not just that, React also reuses the old current after swapping the pointer from root to the `workInProgress` tree. The net effect of this optimized process is a smooth transition from the previous state of the app to the next state and the next state, and so on.

And what about the 16ms frame time? React effectively runs an internal timer for each unit of work being performed and constantly monitors this time limit while performing the work.

The moment the time runs out, React pauses the current unit of work, hands the control back to the main thread, and lets the browser render whatever is finished at that point.

Then, in the next frame, React picks up where it left off and continues building the tree. Then, when it has enough time, it commits the `workInProgress` tree and completes the render.
