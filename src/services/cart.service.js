const httpStatus = require("http-status");
const { Cart, Product } = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");


/**
 * Fetches cart for a user
 * - Fetch user's cart from Mongo
 * - If cart doesn't exist, throw ApiError
 * --- status code  - 404 NOT FOUND
 * --- message - "User does not have a cart"
 *
 * @param {User} user
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const getCartByUser = async (user) => {
  const cartObj = await Cart.findOne({email: user.email}).exec();
  if(!cartObj){
    throw new ApiError(httpStatus.NOT_FOUND,"User does not have a cart");
  }
  // console.log(cartObj);
  return cartObj; 
};

/**
 * Adds a new product to cart
 * - Get user's cart object using "Cart" model's findOne() method
 * --- If it doesn't exist, create one
 * --- If cart creation fails, throw ApiError with "500 Internal Server Error" status code
 *
 * - If product to add already in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product already in cart. Use the cart sidebar to update or remove product from cart"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - Otherwise, add product to user's cart
 *
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const addProductToCart = async (user, productId, quantity) => {
  let cartObj = await Cart.findOne({email: user.email}).exec();
  //if no cart -> create cart for user
  if(!cartObj){
    let cartData = {email : user.email};
    cartObj = await Cart.create(cartData);
    if(!cartObj){
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  //check if product already in cart using mongoose or vanilla js ?
  // let productInCart = await Cart.findOne({"cartItems.product._id": productId}).exec();
  let cartItems = cartObj.cartItems;
  let isProductInCart = checkProductInCart(cartItems,productId);
  
  //throw error if already exists
  if(isProductInCart){
    throw new ApiError(httpStatus.BAD_REQUEST,"Product already in cart. Use the cart sidebar to update or remove product from cart");
  }
  //check if product in product collection
  let prodObj = await Product.findById(productId);

  if(!prodObj){
    throw new ApiError(httpStatus.BAD_REQUEST,"Product doesn't exist in database")
  }
  //add product to cart
  cartObj.cartItems.push({product: prodObj,quantity: quantity});
  updatedCart = await cartObj.save();

  return updatedCart;

};

const checkProductInCart = (cartItems,productId) => {
  let isProductInCart = false;
  for(let i = 0; i < cartItems.length; i++){
    if(cartItems[i].product._id.toString() === productId){
      isProductInCart = true;
      break;
    }
  }
  return isProductInCart;
}

/**
 * Updates the quantity of an already existing product in cart
 * - Get user's cart object using "Cart" model's findOne() method
 * - If cart doesn't exist, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart. Use POST to create cart and add a product"
 *
 * - If product to add not in "products" collection in MongoDB, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product doesn't exist in database"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * - Otherwise, update the product's quantity in user's cart to the new quantity provided and return the cart object
 *
 *
 * @param {User} user
 * @param {string} productId
 * @param {number} quantity
 * @returns {Promise<Cart>}
 * @throws {ApiError}
 */
const updateProductInCart = async (user, productId, quantity) => {
  const cartObj = await Cart.findOne({email: user.email}).exec();
  //if no cart
  if(!cartObj){
    throw new ApiError(httpStatus.BAD_REQUEST,"User does not have a cart. Use POST to create cart and add a product");
  }
  //check if product in product collection
  let prodObj = await Product.findById(productId);

  if(!prodObj){
    throw new ApiError(httpStatus.BAD_REQUEST,"Product doesn't exist in database")
  }

  //check if product in cartObj - vanilla js or mongoose query ?
  // let productInCart = await Cart.findOne({"cartItems.product._id": productId}).exec();
  let cartItems = cartObj.cartItems;
  let isProductInCart = checkProductInCart(cartItems,productId);

  if(!isProductInCart){
    throw new ApiError(httpStatus.BAD_REQUEST,"Product not in cart")
  }

  //update quantity
  for(let i = 0; i < cartItems.length; i++){
    if(cartItems[i].product._id.toString() === productId){
      cartItems[i].quantity = quantity;
      break;
    }
  }

  cartObj.cartItems = cartItems;
  updatedCart = await cartObj.save();
  return updatedCart
};

/**
 * Deletes an already existing product in cart
 * - If cart doesn't exist for user, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "User does not have a cart"
 *
 * - If product to update not in user's cart, throw ApiError with
 * --- status code  - 400 BAD REQUEST
 * --- message - "Product not in cart"
 *
 * Otherwise, remove the product from user's cart
 *
 *
 * @param {User} user
 * @param {string} productId
 * @throws {ApiError}
 */
const deleteProductFromCart = async (user, productId) => {
  const cartObj = await Cart.findOne({email: user.email}).exec();
  //if no cart
  if(!cartObj){
    throw new ApiError(httpStatus.BAD_REQUEST,"User does not have a cart");
  }

  let cartItems = cartObj.cartItems;
  let isProductInCart = checkProductInCart(cartItems,productId);

  if(!isProductInCart){
    throw new ApiError(httpStatus.BAD_REQUEST,"Product not in cart")
  }

  let updatedCartItems = cartItems.filter((item) => item.product._id.toString() !== productId);

  cartObj.cartItems = updatedCartItems;
  updatedCart = await cartObj.save();
  return updatedCart;
  
};

// TODO: CRIO_TASK_MODULE_TEST - Implement checkout function
/**
 * Checkout a users cart.
 * On success, users cart must have no products.
 *
 * @param {User} user
 * @returns {Promise}
 * @throws {ApiError} when cart is invalid
 */
const checkout = async (user) => {
  //retrieve users cart
  const cartObj = await getCartByUser(user);

  //throw error if cart has no products
  if(cartObj.cartItems.length === 0){
    throw new ApiError(httpStatus.BAD_REQUEST,"No products in cart");
  }

  //find the total of all products
  const cartItems = cartObj.cartItems;
  let total;
  total = cartItems.map((item) => item.product.cost * item.quantity).reduce((prevValue,currValue) => prevValue + currValue);
  
  //check if wallet balance is sufficient
  if(user.walletMoney < total){
    throw new ApiError(httpStatus.BAD_REQUEST, "Insufficient Balance");
  }
  //check if address isnt the default value
  const isNonDefaultAddress = await user.hasSetNonDefaultAddress();
  if(!isNonDefaultAddress){
    throw new ApiError(httpStatus.BAD_REQUEST,"No address set");
  }
  
  //on success 
  //update user obj - empty cartItems and reduce wallet money
  cartObj.cartItems = [];
  user.walletMoney = user.walletMoney - total;

  await cartObj.save();
  await user.save();
  return;
};

module.exports = {
  getCartByUser,
  addProductToCart,
  updateProductInCart,
  deleteProductFromCart,
  checkout,
};
