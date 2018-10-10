const bot = require('../index')
const Form = require('../model/order.model')
const User = require('../model/user.model')
const CartController = require('../controller/cart')
const rub = require('../globals').rub

module.exports = {
  async processOrder(id) {
    try {
      const user = await Form.findOne({id: id})
      if (!user) {
        new Form({id: id}).save()
      } else if (user.name && user.address && user.phone) {
        const question = `Вы уже делали заказ. Использовать ранее введённые данные?\n\n<b>Как Ваше имя? Ваше имя пользователя в Telegram или номер телефона - привязанный к Вашему аккаунту (чтобы Наш эксперт смог с Вами связаться)</b> ${user.name}\n<b>Какой Вы хотите получить результат?</b> ${user.address}\n<b>Примерный бюджет, доп поле.</b> ${user.phone}`
        return bot.sendMessage(user.id, question, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{text: 'Данные верны', callback_data: 'use_exist_data'}],
              [{text: 'Ввести новые данные', callback_data: 'use_new_data'}]
            ]
          }
        })
      }

      const replyMarkup = {
        reply_markup: {
          force_reply: true
        }
      }

      // First question
      bot.sendMessage(id, `Как Ваше имя? Ваше имя пользователя в Telegram или номер телефона - привязанный к Вашему аккаунту (чтобы Наш эксперт смог с Вами связаться)`, replyMarkup)
        .then(async msg => {
          const user = await Form.findOne({id: id})
          const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
            user.set('name', msg.text).save()
            bot.removeReplyListener(replyId)

            // Second question
            bot.sendMessage(id, `Какой Вы хотите получить результат?`, replyMarkup)
              .then(msg => {
                const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
                  user.set('address', msg.text).save()
                  bot.removeReplyListener(replyId)

                  // Third question
                  bot.sendMessage(id, `Примерный бюджет, доп поле.`, replyMarkup)
                    .then(msg => {
                      const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
                        user.set('phone', msg.text).save()
                        bot.removeReplyListener(replyId)

                        // Send a confirmation to user and a message with order details to manager
                        this.sendConfirmation(user.id)
                      })
                    })
                })
              })
          })
        })
    } catch (error) {
      console.error(error)
    }
  },
  async sendConfirmation (id) {
    try {
      const user = await User.findOne({userId: id})
      const order = await Form.findOne({id: id})
      const orderDetails = user.cart.slice(1).map(item => `<em>${item.title}</em>`).join('\n')
      const totalPrice = CartController.getTotalPrice(user)
      const userDetails = `<b>Имя, либо TG, номер:</b> ${order.name}\n<b>Желает получить:</b> ${order.address}\n<b>Бюджет, сроки, доп поле.:</b> ${order.phone}`
      bot.sendMessage(600909887, `<b>Новый заказ!</b>\n\n${orderDetails}<em>\nСумма заказа ${typeof(totalPrice) === 'number' ? totalPrice : totalPrice.total} ${rub}</em>\n\n${userDetails}`, {parse_mode: 'HTML'})
        .then(() => bot.sendMessage(user.userId, 'Спасибо за заказ! В ближайшее время с Вами свяжется наш менеджер.'))
        .then(() => CartController.clearCart(user))
    } catch (error) {
      console.error(error)
    }
  }
}
