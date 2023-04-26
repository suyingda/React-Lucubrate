/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

// This is a DevTools fork of ReactFiberComponentStack.
// This fork enables DevTools to use the same "native" component stack format,
// while still maintaining support for multiple renderer versions
// (which use different values for ReactTypeOfWork).

                                                                   
                                                              

import {
  describeBuiltInComponentFrame,
  describeFunctionComponentFrame,
  describeClassComponentFrame,
} from './DevToolsComponentStackFrame';

export function describeFiber(
  workTagMap            ,
  workInProgress       ,
  currentDispatcherRef                      ,
)         {
  const {
    HostComponent,
    LazyComponent,
    SuspenseComponent,
    SuspenseListComponent,
    FunctionComponent,
    IndeterminateComponent,
    SimpleMemoComponent,
    ForwardRef,
    ClassComponent,
  } = workTagMap;

  const owner                  = __DEV__
    ? workInProgress._debugOwner
      ? workInProgress._debugOwner.type
      : null
    : null;
  switch (workInProgress.tag) {
    case HostComponent:
      return describeBuiltInComponentFrame(workInProgress.type, owner);
    case LazyComponent:
      return describeBuiltInComponentFrame('Lazy', owner);
    case SuspenseComponent:
      return describeBuiltInComponentFrame('Suspense', owner);
    case SuspenseListComponent:
      return describeBuiltInComponentFrame('SuspenseList', owner);
    case FunctionComponent:
    case IndeterminateComponent:
    case SimpleMemoComponent:
      return describeFunctionComponentFrame(
        workInProgress.type,
        owner,
        currentDispatcherRef,
      );
    case ForwardRef:
      return describeFunctionComponentFrame(
        workInProgress.type.render,
        owner,
        currentDispatcherRef,
      );
    case ClassComponent:
      return describeClassComponentFrame(
        workInProgress.type,
        owner,
        currentDispatcherRef,
      );
    default:
      return '';
  }
}

export function getStackByFiberInDevAndProd(
  workTagMap            ,
  workInProgress       ,
  currentDispatcherRef                      ,
)         {
  try {
    let info = '';
    let node        = workInProgress;
    do {
      info += describeFiber(workTagMap, node, currentDispatcherRef);
      // $FlowFixMe[incompatible-type] we bail out when we get a null
      node = node.return;
    } while (node);
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}
