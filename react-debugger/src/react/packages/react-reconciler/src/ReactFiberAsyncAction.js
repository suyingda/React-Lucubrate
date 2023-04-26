/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                
                                           
import {requestTransitionLane} from './ReactFiberRootScheduler';

                           
             
                                     
                
       
                                         
                                      
          
 

                                                      
                    
 

                                                        
                      
                 
 

                                                       
                     
                
 

                  
                      
                        
                        

let currentAsyncAction                     = null;

export function requestAsyncActionContext(
  actionReturnValue       ,
)                      {
  if (
    actionReturnValue !== null &&
    typeof actionReturnValue === 'object' &&
    typeof actionReturnValue.then === 'function'
  ) {
    // This is an async action.
    //
    // Return a thenable that resolves once the action scope (i.e. the async
    // function passed to startTransition) has finished running. The fulfilled
    // value is `false` to represent that the action is not pending.
    const thenable           = (actionReturnValue     );
    if (currentAsyncAction === null) {
      // There's no outer async action scope. Create a new one.
      const asyncAction              = {
        lane: requestTransitionLane(),
        listeners: [],
        count: 0,
        status: 'pending',
        value: false,
        reason: undefined,
        then(resolve                  ) {
          asyncAction.listeners.push(resolve);
        },
      };
      attachPingListeners(thenable, asyncAction);
      currentAsyncAction = asyncAction;
      return asyncAction;
    } else {
      // Inherit the outer scope.
      const asyncAction              = (currentAsyncAction     );
      attachPingListeners(thenable, asyncAction);
      return asyncAction;
    }
  } else {
    // This is not an async action, but it may be part of an outer async action.
    if (currentAsyncAction === null) {
      // There's no outer async action scope.
      return false;
    } else {
      // Inherit the outer scope.
      return currentAsyncAction;
    }
  }
}

export function peekAsyncActionContext()                     {
  return currentAsyncAction;
}

function attachPingListeners(thenable          , asyncAction             ) {
  asyncAction.count++;
  thenable.then(
    () => {
      if (--asyncAction.count === 0) {
        const fulfilledAsyncAction                       = (asyncAction     );
        fulfilledAsyncAction.status = 'fulfilled';
        completeAsyncActionScope(asyncAction);
      }
    },
    (error       ) => {
      if (--asyncAction.count === 0) {
        const rejectedAsyncAction                      = (asyncAction     );
        rejectedAsyncAction.status = 'rejected';
        rejectedAsyncAction.reason = error;
        completeAsyncActionScope(asyncAction);
      }
    },
  );
  return asyncAction;
}

function completeAsyncActionScope(action             ) {
  if (currentAsyncAction === action) {
    currentAsyncAction = null;
  }

  const listeners = action.listeners;
  action.listeners = [];
  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    listener(false);
  }
}
