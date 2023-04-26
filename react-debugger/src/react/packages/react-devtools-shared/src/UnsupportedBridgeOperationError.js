/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

export default class UnsupportedBridgeOperationError extends Error {
  constructor(message        ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnsupportedBridgeOperationError);
    }

    this.name = 'UnsupportedBridgeOperationError';
  }
}
