/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                               

                                                                 

import {
  createResponse,
  resolveModel,
  resolveModule,
  resolveErrorDev,
  resolveErrorProd,
  resolveHint,
  close,
  getRoot,
} from 'react-client/src/ReactFlightClient';

export {createResponse, close, getRoot};

export function resolveRow(response          , chunk             )       {
  if (chunk[0] === 'O') {
    // $FlowFixMe[incompatible-call] unable to refine on array indices
    resolveModel(response, chunk[1], chunk[2]);
  } else if (chunk[0] === 'I') {
    // $FlowFixMe[incompatible-call] unable to refine on array indices
    resolveModule(response, chunk[1], chunk[2]);
  } else if (chunk[0] === 'H') {
    // $FlowFixMe[incompatible-call] unable to refine on array indices
    resolveHint(response, chunk[1], chunk[2]);
  } else {
    if (__DEV__) {
      resolveErrorDev(
        response,
        // $FlowFixMe[incompatible-call]: Flow doesn't support disjoint unions on tuples.
        chunk[1],
        // $FlowFixMe[incompatible-call]: Flow doesn't support disjoint unions on tuples.
        // $FlowFixMe[prop-missing]
        // $FlowFixMe[incompatible-use]
        chunk[2].digest,
        // $FlowFixMe[incompatible-call]: Flow doesn't support disjoint unions on tuples.
        // $FlowFixMe[incompatible-use]
        chunk[2].message || '',
        // $FlowFixMe[incompatible-call]: Flow doesn't support disjoint unions on tuples.
        // $FlowFixMe[incompatible-use]
        chunk[2].stack || '',
      );
    } else {
      // $FlowFixMe[incompatible-call]: Flow doesn't support disjoint unions on tuples.
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[incompatible-use]
      resolveErrorProd(response, chunk[1], chunk[2].digest);
    }
  }
}
