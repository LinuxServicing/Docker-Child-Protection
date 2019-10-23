import "test/test.setup";
import { expect } from "chai";
import { setupMountedComponent } from "test";
import { ToggleEnable } from "components/record-actions/toggle-enable";
import { Transitions } from "components/record-actions/transitions";
import { Notes } from "components/record-actions/notes";
import { Map, List } from "immutable";
import { ToggleOpen } from "components/record-actions/toggle-open";
import * as Permissions from "libs/permissions";
import RecordActions from "./container";

describe("<RecordActions />", () => {
  let component;
  const defaultState = Map({
    user: Map({
      permissions: Map({
        cases: List([Permissions.MANAGE])
      })
    })
  });
  const props = {
    recordType: "cases",
    mode: { isShow: true },
    record: Map({ status: "open" })
  };

  describe("Component ToggleOpen", () => {
    beforeEach(() => {
      ({ component } = setupMountedComponent(
        RecordActions,
        props,
        defaultState
      ));
    });

    it("renders ToggleOpen", () => {
      expect(component.find(ToggleOpen)).to.have.length(1);
    });
  });

  describe("Component ToggleEnable", () => {
    beforeEach(() => {
      ({ component } = setupMountedComponent(
        RecordActions,
        props,
        defaultState
      ));
    });

    it("renders ToggleEnable", () => {
      expect(component.find(ToggleEnable)).to.have.length(1);
    });
  });

  describe("Component Transitions", () => {
    beforeEach(() => {
      ({ component } = setupMountedComponent(
        RecordActions,
        props,
        defaultState
      ));
    });
    it("renders Transitions", () => {
      expect(component.find(Transitions)).to.have.length(1);
    });
  });

  describe("Component Notes", () => {
    beforeEach(() => {
      ({ component } = setupMountedComponent(
        RecordActions,
        props,
        defaultState
      ));
    });

    it("renders Notes", () => {
      expect(component.find(Notes)).to.have.length(1);
    });
  });
});