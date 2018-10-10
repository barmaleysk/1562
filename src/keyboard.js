const kb = require ('./keyboard-buttons')

module.exports = {
  home: [
    [kb.home.packaging],
    [kb.home.bots, kb.home.packaging],
    [kb.home.cart],
	   [kb.home.money],
	  [kb.home.bro]
	  
  ],
  cart: [
    [kb.cart.clear],
    [kb.cart.order]
  ]
}
