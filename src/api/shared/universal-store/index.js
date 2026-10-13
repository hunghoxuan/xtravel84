"use strict";

const { createUniversalStoreAdapter } = require("./adapterFactory");
const { createUniversalStoreFacade, UniversalStoreFacade } = require("./facade");

module.exports = {
  createUniversalStoreAdapter,
  createUniversalStoreFacade,
  UniversalStoreFacade,
};
