/**
 * @openapi
 * @route GET /users
 * @summary Get all users
 * @description Retrieves a paginated list of all users
 * @tags users
 * @param {number} [page=1].query - Page number
 * @param {number} [limit=10].query - Items per page
 * @response 200 - List of users
 * @response 400 - Invalid parameters
 */
function getAllUsers(req, res) {
  res.json([]);
}

/**
 * @openapi
 * @route GET /users/{id}
 * @summary Get user by ID
 * @tags users
 * @param {string} id.path.required - User ID
 * @response 200 - User found
 * @response 404 - User not found
 */
function getUserById(req, res) {
  res.json({});
}

/**
 * @openapi
 * @route POST /users
 * @summary Create new user
 * @tags users
 * @bodyContent {application/json} CreateUserSchema
 * @response 201 - User created
 * @response 400 - Invalid input
 * @security BearerAuth[]
 */
function createUser(req, res) {
  res.status(201).json({});
}

/**
 * @openapi
 * @route PUT /users/{id}
 * @summary Update user
 * @param {string} id.path.required - User ID
 * @bodyContent {application/json} UpdateUserSchema
 * @response 200 - User updated
 * @response 404 - User not found
 */
function updateUser(req, res) {
  res.json({});
}

/**
 * @openapi
 * @route DELETE /users/{id}
 * @summary Delete user
 * @param {string} id.path.required - User ID
 * @response 204 - User deleted
 * @response 404 - User not found
 */
function deleteUser(req, res) {
  res.status(204).send();
}

// Non-OpenAPI comment (should be skipped)
/**
 * This is a regular JSDoc comment without @openapi tag
 * @param {string} name
 * @returns {string}
 */
function helperFunction(name) {
  return name;
}

/**
 * @openapi
 * @route GET /products
 * Get all products
 * @tags products, catalog
 * @param {string} category.query - Filter by category
 * @param {boolean} inStock.query - Filter by stock status
 * @response 200 - Products list
 */
function getProducts(req, res) {
  res.json([]);
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  helperFunction,
  getProducts,
};
