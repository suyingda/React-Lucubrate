/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                

                                                                        

                             

export const knownServerReferences          
           
                                                              
  = new WeakMap();

export function createServerReference                     (
  id                   ,
  callServer                    ,
)                       {
  const proxy = function ()             {
    // $FlowFixMe[method-unbinding]
    const args = Array.prototype.slice.call(arguments);
    return callServer(id, args);
  };
  knownServerReferences.set(proxy, {id: id, bound: null});
  return proxy;
}
