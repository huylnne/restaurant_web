const { splitRestaurantAndBranch } = require("../../shared/branchDisplay");

const DEFAULT_RESTAURANT_NAME = process.env.RESTAURANT_NAME || "ABC Restaurant";

module.exports = {
  DEFAULT_RESTAURANT_NAME,
  splitRestaurantAndBranch: (fullBranchName) =>
    splitRestaurantAndBranch(fullBranchName, DEFAULT_RESTAURANT_NAME),
};
