/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import {AsyncLocalStorage} from 'async_hooks';

                                                                

export * from '../ReactFlightServerConfigStream';
export * from 'react-server-dom-webpack/src/ReactFlightServerConfigWebpackBundler';
export * from 'react-dom-bindings/src/server/ReactFlightServerConfigDOM';

export const supportsRequestStorage = true;
export const requestStorage                             =
  new AsyncLocalStorage();
