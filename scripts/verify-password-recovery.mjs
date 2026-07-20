import assert from "node:assert/strict";
import {
  PASSWORD_RECOVERY_EVENT,
  hasPasswordRecoveryMarker,
  isPasswordRecoveryEvent,
} from "../src/lib/passwordRecovery.js";

assert.equal(PASSWORD_RECOVERY_EVENT, "PASSWORD_RECOVERY");
assert.equal(isPasswordRecoveryEvent("PASSWORD_RECOVERY"), true);
assert.equal(isPasswordRecoveryEvent("SIGNED_IN"), false);
assert.equal(hasPasswordRecoveryMarker({ search: "?type=recovery", hash: "" }), true);
assert.equal(hasPasswordRecoveryMarker({ search: "", hash: "#access_token=token&type=recovery" }), true);
assert.equal(hasPasswordRecoveryMarker({ search: "?type=signup", hash: "" }), false);

console.log("Password recovery verification passed.");
