/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import {AsyncLocalStorage} from 'async_hooks';

                                                              

export * from 'react-dom-bindings/src/server/ReactFizzConfigDOM';

export const supportsRequestStorage = true;
export const requestStorage                             =
  new AsyncLocalStorage();
