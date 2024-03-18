---
title: React Diffing Algorithm
description: React uses a diffing algorithm to determine the changes in the UI and update the DOM efficiently.
---

## React Diff 是从 root 节点开始的？

React 的 diff 算法并不总是从根（root）节点开始。React 可以在组件树的任何级别上开始进行 diff 操作，这主要取决于哪些组件的状态或属性发生了变化。当一个组件的状态或属性发生变化时，React 将重新渲染该组件及其子组件。这个过程被称为协调（Reconciliation）。

### 协调过程

1. **组件状态或属性变化**：当组件的状态（state）或属性（props）发生变化时，React 将标记该组件为 "dirty"，表示需要重新渲染。
2. **重新渲染**：React 将调用组件的 `render` 方法来获取新的元素树。然后，它将新的元素树与上一次渲染的元素树进行对比。
3. **开始 diff**：diff 操作通常从发生变化的组件开始，而不是从根组件开始。React 将比较新旧元素树，确定哪些部分需要更新。
4. **递归子组件**：如果一个组件的子组件也发生了变化，React 也将对这些子组件进行 diff 操作。这个过程是递归的，直到所有变化的组件都被处理完毕。

### diff 算法的优化

虽然理论上 React 可以从根节点开始进行全树的 diff 操作，但这样做效率非常低。因此，React 实现了一些策略来优化 diff 过程：

-   **类型检查**：当比较两个 React 元素时，如果它们的类型（比如组件类型或 DOM 元素标签）不同，React 会直接替换整个子树，而不是继续比较子节点。
-   **Keys**：当渲染列表元素时，为每个列表元素分配一个唯一的 key 可以帮助 React 确定哪些元素是新的，哪些被移动了，哪些被移除了，从而避免不必要的元素重建和重新排序操作。
-   **跳过不必要的比较**：如果一个组件的 props 和 state 都没有变化，而且它是一个纯组件（PureComponent），React 可以跳过这个组件及其子组件的渲染和 diff 过程。

通过这些优化策略，React 能够有效减少不必要的计算和 DOM 操作，提高应用的性能。
