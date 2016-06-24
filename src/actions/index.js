import { push } from 'react-router-redux';
import { parseRangeFilters, stringifyRangeFilters } from '../range-filters';

export function waitingForProfileFromAddon() {
  return {
    type: 'WAITING_FOR_PROFILE_FROM_ADDON',
  };
}

export function receiveProfileFromAddon(profile) {
  return {
    type: 'RECEIVE_PROFILE_FROM_ADDON',
    profile: profile,
  };
}

export function requestingSymbolTable(requestedLib) {
  return {
    type: 'REQUESTING_SYMBOL_TABLE',
    requestedLib,
  };
}

export function receivedSymbolTableReply(requestedLib) {
  return {
    type: 'RECEIVED_SYMBOL_TABLE_REPLY',
    requestedLib,
  };
}

export function startSymbolicating() {
  return {
    type: 'START_SYMBOLICATING',
  };
}

export function doneSymbolicating() {
  return { type: 'DONE_SYMBOLICATING' };
}

export function coalescedFunctionsUpdate(functionsUpdatePerThread) {
  return {
    type: 'COALESCED_FUNCTIONS_UPDATE',
    functionsUpdatePerThread,
  };
}

class ColascedFunctionsUpdateDispatcher {
  constructor() {
    this._requestedAnimationFrame = false;
    this._updates = {};
  }

  _scheduleUpdate(dispatch) {
    if (!this._requestedAnimationFrame) {
      window.requestAnimationFrame(() => this._dispatchUpdate(dispatch));
      this._requestedAnimationFrame = true;
    }
  }

  _dispatchUpdate(dispatch) {
    const updates = this._updates;
    this._updates = {};
    this._requestedAnimationFrame = false;
    dispatch(coalescedFunctionsUpdate(updates));
  }

  mergeFunctions(dispatch, threadIndex, oldFuncToNewFuncMap) {
    this._scheduleUpdate(dispatch);
    if (!this._updates[threadIndex]) {
      this._updates[threadIndex] = {
        oldFuncToNewFuncMap,
        funcIndices: [],
        funcNames: [],
      };
    } else {
      for (const oldFunc of oldFuncToNewFuncMap.keys()) {
        this._updates[threadIndex].oldFuncToNewFuncMap.set(oldFunc, oldFuncToNewFuncMap.get(oldFunc));
      }
    }
  }

  assignFunctionNames(dispatch, threadIndex, funcIndices, funcNames) {
    this._scheduleUpdate(dispatch);
    if (!this._updates[threadIndex]) {
      this._updates[threadIndex] = {
        funcIndices, funcNames,
        oldFuncToNewFuncMap: new Map(),
      };
    } else {
      this._updates[threadIndex].funcIndices = this._updates[threadIndex].funcIndices.concat(funcIndices);
      this._updates[threadIndex].funcNames = this._updates[threadIndex].funcNames.concat(funcNames);
    }
  }
}

const gCoalescedFunctionsUpdateDispatcher = new ColascedFunctionsUpdateDispatcher();

export function mergeFunctions(threadIndex, oldFuncToNewFuncMap) {
  return dispatch => {
    gCoalescedFunctionsUpdateDispatcher.mergeFunctions(dispatch, threadIndex, oldFuncToNewFuncMap);
  };
}

export function assignFunctionNames(threadIndex, funcIndices, funcNames) {
  return dispatch => {
    gCoalescedFunctionsUpdateDispatcher.assignFunctionNames(dispatch, threadIndex, funcIndices, funcNames);
  };
}

export function changeSelectedFuncStack(threadIndex, selectedFuncStack) {
  return {
    type: 'CHANGE_SELECTED_FUNC_STACK',
    selectedFuncStack, threadIndex,
  };
}

export function changeSelectedThread(selectedThread) {
  return {
    type: 'CHANGE_SELECTED_THREAD',
    selectedThread,
  };
}

export function changeThreadOrder(threadOrder) {
  return {
    type: 'CHANGE_THREAD_ORDER',
    threadOrder,
  };
}

export function changeExpandedFuncStacks(threadIndex, expandedFuncStacks) {
  return {
    type: 'CHANGE_EXPANDED_FUNC_STACKS',
    threadIndex, expandedFuncStacks,
  };
}

function changeBoolQueryParam(query, paramName, newValue) {
  if ((paramName in query) === newValue) {
    return query;
  }
  const newQuery = Object.assign({}, query);
  if (newValue) {
    newQuery[paramName] = null;
  } else {
    delete newQuery[paramName];
  }
  return newQuery;
}

function changeStringQueryParam(query, paramName, newValue) {
  const shouldRemoveFromQuery = (newValue === '' || newValue === null || newValue === undefined);
  if (shouldRemoveFromQuery && !(paramName in query)) {
    return query;
  }
  const newQuery = Object.assign({}, query);
  if (shouldRemoveFromQuery) {
    delete newQuery[paramName];
  } else {
    newQuery[paramName] = newValue;
  }
  return newQuery;
}

function queryRootReducer(state = {}, action) {
  switch (action.type) {
    case 'CHANGE_JS_ONLY':
      return changeBoolQueryParam(state, 'jsOnly', action.jsOnly);
    case 'CHANGE_INVERT_CALLSTACK':
      return changeBoolQueryParam(state, 'invertCallstack', action.invertCallstack);
    case 'ADD_RANGE_FILTER':
      return changeStringQueryParam(state, 'rangeFilters', stringifyRangeFilters([...parseRangeFilters(state.rangeFilters), { start: action.start, end: action.end }]));
    default:
      return state;
  }
}

function pushQueryAction(action, { query }) {
  return push({ query: queryRootReducer(query, action) });
}

export function changeJSOnly(jsOnly, location) {
  return pushQueryAction({
    type: 'CHANGE_JS_ONLY',
    jsOnly,
  }, location);
}

export function changeInvertCallstack(invertCallstack, location) {
  return pushQueryAction({
    type: 'CHANGE_INVERT_CALLSTACK',
    invertCallstack,
  }, location);
}

export function updateProfileSelection(selection) {
  return {
    type: 'UPDATE_PROFILE_SELECTION',
    selection,
  };
}

export function addRangeFilter(start, end, location) {
  return pushQueryAction({
    type: 'ADD_RANGE_FILTER',
    start, end,
  }, location);
}

export function addRangeFilterAndUnsetSelection(start, end, location) {
  return dispatch => {
    dispatch(addRangeFilter(start, end, location));
    dispatch(updateProfileSelection({ hasSelection: false, isModifying: false }));
  };
}