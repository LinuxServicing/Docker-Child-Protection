import { fromJS } from "immutable";

import actions from "./actions";

const DEFAULT_STATE = fromJS({});

const reducer = (state = DEFAULT_STATE, { type, payload }) => {
  switch (type) {
    case actions.FETCH_ROLE_STARTED:
      return state
        .set("loading", fromJS(payload))
        .set("errors", false)
        .set("serverErrors", fromJS([]));
    case actions.FETCH_ROLE_SUCCESS:
      return state
        .set("selectedRole", fromJS(payload.data))
        .set("errors", false)
        .set("serverErrors", fromJS([]));
    case actions.FETCH_ROLE_FINISHED:
      return state.set("loading", fromJS(payload));
    case actions.FETCH_ROLE_FAILURE:
    case actions.SAVE_ROLE_FAILURE:
      return state
        .set("errors", true)
        .set("serverErrors", fromJS(payload.errors));
    case actions.CLEAR_SELECTED_ROLE:
      return state
        .set("selectedRole", fromJS({}))
        .set("errors", false)
        .set("serverErrors", fromJS([]));
    default:
      return state;
  }
};

export const reducers = reducer;